import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { WhoopAccount } from '@prisma/client';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type WhoopEventBody = {
  user_id: number;
  id: string | number;
  type: string;
  trace_id?: string;
};

@Injectable()
export class WhoopService {
  constructor(private readonly prisma: PrismaService) {}

  private computeSignature(timestamp: string, rawBody: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', Buffer.from(secret, 'utf8'));
    hmac.update(timestamp + rawBody);
    return hmac.digest('base64');
  }

  async handleWebhook(signature: string | undefined, timestamp: string | undefined, body: WhoopEventBody) {
    const secret = process.env.WHOOP_CLIENT_SECRET;
    if (!secret) throw new BadRequestException('Server misconfigured');
    if (!signature || !timestamp) throw new UnauthorizedException('Missing signature');

    // Because Nest already parsed the body, re-stringify to compute HMAC consistently
    const rawBody = JSON.stringify(body);
    const calculated = this.computeSignature(timestamp, rawBody, secret);
    if (calculated !== signature) throw new UnauthorizedException('Invalid signature');

    await this.prisma.whoopEvent.create({
      data: {
        userId: body.user_id,
        resourceId: String(body.id),
        eventType: body.type,
        traceId: body.trace_id ?? null,
        raw: rawBody,
      },
    });

    const [domain, action] = body.type.split('.');
    if (action === 'updated') {
      await this.prisma.whoopResource.upsert({
        where: { userId_resource_domain: { userId: body.user_id, resourceId: String(body.id), domain } },
        update: { updatedAt: new Date() },
        create: { userId: body.user_id, resourceId: String(body.id), domain },
      });

      if (domain === 'sleep') {
        await this.fetchAndStoreSleep(body.user_id, String(body.id));
      }
    } else if (action === 'deleted') {
      await this.prisma.whoopResource.deleteMany({ where: { userId: body.user_id, resourceId: String(body.id), domain } });
    }
  }

  private async fetchAndStoreSleep(userId: number, sleepId: string) {
    try {
      const account = await this.prisma.whoopAccount.findUnique({ where: { whoopUserId: userId } });
      if (!account) return; // user not registered with us

      // Ensure we have a valid access token (refresh if expired/near expiry)
      const tokenHolder = await this.ensureValidAccessToken(account);

      const url = `https://api.prod.whoop.com/developer/v2/activity/sleep/${sleepId}`;
      let res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenHolder.accessToken}`,
          Accept: 'application/json',
        },
      });

      // If token was invalid (e.g., expired unexpectedly), try one refresh-and-retry
      if (res.status === 401) {
        const refreshed = await this.tryRefreshAndPersist(account.whoopUserId);
        if (refreshed) {
          res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${refreshed.accessToken}`,
              Accept: 'application/json',
            },
          });
        }
      }

      if (!res.ok) return;
      const data = await res.json();

      const start = data?.start ? new Date(data.start) : null;
      const end = data?.end ? new Date(data.end) : null;

      await this.prisma.whoopSleep.upsert({
        where: { sleepId: sleepId },
        update: {
          userId: userId,
          start: start ?? undefined,
          end: end ?? undefined,
          raw: data,
        },
        create: {
          userId: userId,
          sleepId: sleepId,
          start: start ?? undefined,
          end: end ?? undefined,
          raw: data,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  private isTokenExpiringSoon(expiresAt: Date | null | undefined, bufferSeconds = 60): boolean {
    if (!expiresAt) return false;
    return Date.now() + bufferSeconds * 1000 >= new Date(expiresAt).getTime();
  }

  private async ensureValidAccessToken(account: WhoopAccount): Promise<{ accessToken: string }>
  {
    if (this.isTokenExpiringSoon(account.accessTokenExpiresAt)) {
      const refreshed = await this.tryRefreshAndPersist(account.whoopUserId);
      if (refreshed) return { accessToken: refreshed.accessToken };
    }
    return { accessToken: account.accessToken };
  }

  private async tryRefreshAndPersist(whoopUserId: number): Promise<WhoopAccount | null> {
    const acc = await this.prisma.whoopAccount.findUnique({ where: { whoopUserId } });
    if (!acc || !acc.refreshToken) return null;

    const clientId = process.env.WHOOP_CLIENT_ID;
    const clientSecret = process.env.WHOOP_CLIENT_SECRET;
    const whoopHost = process.env.WHOOP_API_HOSTNAME ?? 'https://api.prod.whoop.com';
    if (!clientId || !clientSecret) return null;

    const tokenUrl = new URL('/oauth/oauth2/token', whoopHost).toString();
    const scope = "offline read:profile read:sleep read:recovery";
    const form = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: acc.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: scope,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };

    const newExpiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null;

    const updated = await this.prisma.whoopAccount.update({
      where: { whoopUserId },
      data: {
        accessToken: json.access_token,
        refreshToken: json.refresh_token ?? acc.refreshToken,
        accessTokenExpiresAt: newExpiresAt,
      },
    });

    console.log("token refreshed");

    return updated;
  }

  async registerAccount(params: {
    whoopUserId: number;
    walletAddress: string;
    accessToken: string;
    refreshToken?: string;
    expiresInSeconds?: number;
  }) {
    const { whoopUserId, walletAddress, accessToken, refreshToken, expiresInSeconds } = params;
    const expiresAt = expiresInSeconds
      ? new Date(Date.now() + expiresInSeconds * 1000)
      : null;

    return this.prisma.whoopAccount.upsert({
      where: { whoopUserId },
      create: {
        whoopUserId,
        walletAddress: walletAddress,
        accessToken,
        refreshToken: refreshToken ?? null,
        accessTokenExpiresAt: expiresAt,
      },
      update: {
        walletAddress: walletAddress,
        accessToken,
        refreshToken: refreshToken ?? null,
        accessTokenExpiresAt: expiresAt,
      },
    });
  }

  async getUser(walletAddress: string) {
      const user = await this.prisma.whoopAccount.findUnique({ where: { walletAddress: walletAddress } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
  }

  async getUserSleep(walletAddress: string, date: string) {
    const user = await this.getUser(walletAddress);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const sleep = await this.prisma.whoopSleep.findFirst({ where: { userId: user.whoopUserId, start: { gte: new Date(date) } } });
    return sleep?.raw;
  }
}


