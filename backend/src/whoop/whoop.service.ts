import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
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
    } else if (action === 'deleted') {
      await this.prisma.whoopResource.deleteMany({ where: { userId: body.user_id, resourceId: String(body.id), domain } });
    }
  }
}


