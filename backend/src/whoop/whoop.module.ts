import { Module } from '@nestjs/common';
import { WhoopController } from './whoop.controller';
import { WhoopService } from './whoop.service';

@Module({
  controllers: [WhoopController],
  providers: [WhoopService],
})
export class WhoopModule {}


