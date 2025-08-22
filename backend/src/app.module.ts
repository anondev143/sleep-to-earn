import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { WhoopModule } from './whoop/whoop.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WhoopModule,
    BlockchainModule,
    LeaderboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}


