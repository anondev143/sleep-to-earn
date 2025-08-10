import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { WhoopService } from './whoop.service';

type WhoopEventBody = {
  user_id: number;
  id: string | number;
  type: string; // workout.updated | sleep.updated | recovery.updated | *.deleted
  trace_id?: string;
};

@Controller('api/webhooks/whoop')
export class WhoopController {
  constructor(private readonly service: WhoopService) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Headers('x-whoop-signature') signature: string,
    @Headers('x-whoop-signature-timestamp') timestamp: string,
    @Body() body: WhoopEventBody,
  ) {
    await this.service.handleWebhook(signature, timestamp, body);
    return 'ok';
  }
}


