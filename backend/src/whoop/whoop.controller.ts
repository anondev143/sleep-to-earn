import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { WhoopService } from './whoop.service';

type WhoopEventBody = {
  user_id: number;
  id: string | number;
  type: string; // workout.updated | sleep.updated | recovery.updated | *.deleted
  trace_id?: string;
};

@Controller('api/whoop')
export class WhoopController {
  constructor(private readonly service: WhoopService) {}

  @Post('webhook')
  @HttpCode(200)
  async handle(
    @Headers('x-whoop-signature') signature: string,
    @Headers('x-whoop-signature-timestamp') timestamp: string,
    @Body() body: WhoopEventBody,
  ) {
    await this.service.handleWebhook(signature, timestamp, body);
    return 'ok';
  }

  @Post('register')
  @HttpCode(200)
  async register(
    @Body()
    body: {
      whoopUserId?: number;
      walletAddress?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
    },
  ) {
    const { whoopUserId, walletAddress, accessToken, refreshToken, expiresIn } = body ?? {};
    if (!whoopUserId || !walletAddress || !accessToken) {
      throw new BadRequestException('whoopUserId, walletAddress and accessToken are required');
    }
    await this.service.registerAccount({
      whoopUserId,
      walletAddress,
      accessToken,
      refreshToken,
      expiresInSeconds: expiresIn,
    });
    return { ok: true };
  }

  @Get('user/:walletAddress')
  async getUser(@Param('walletAddress') walletAddress: string) {
    return this.service.getUser(walletAddress);
  }
}


