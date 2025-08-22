import { Controller, Get, Param, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('api/leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.leaderboardService.getLeaderboard(Math.min(limitNum, 50)); // Cap at 50
  }

  @Get('user/:walletAddress')
  async getUserRank(@Param('walletAddress') walletAddress: string) {
    return this.leaderboardService.getUserRank(walletAddress);
  }

  @Get('weekly')
  async getWeeklyLeaderboard(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.leaderboardService.getWeeklyImprovementLeaderboard(Math.min(limitNum, 50));
  }
}
