import { Module } from '@nestjs/common';
import { WhoopController } from './whoop.controller';
import { WhoopService } from './whoop.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  controllers: [WhoopController],
  providers: [WhoopService],
})
export class WhoopModule {}


