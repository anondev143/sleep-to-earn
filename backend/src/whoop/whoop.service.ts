import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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

      const url = `https://api.prod.whoop.com/developer/v2/activity/sleep/${sleepId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          Accept: 'application/json',
        },
      });
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
      console.error('Error fetching and storing sleep data', error);
    }
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
}


