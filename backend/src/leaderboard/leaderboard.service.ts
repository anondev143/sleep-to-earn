import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Get leaderboard data (mock implementation for now)
   * In production, you'd cache this data and update periodically
   */
  async getLeaderboard(limit: number = 10): Promise<{
    users: Array<{
      walletAddress: string;
      tokenBalance: number;
      currentStreak: number;
      longestStreak: number;
      totalSessions: number;
      rank: number;
    }>;
    isBlockchainEnabled: boolean;
  }> {
    try {
      if (!this.blockchainService.isConfigured()) {
        return {
          users: [],
          isBlockchainEnabled: false,
        };
      }

      // Get all registered users
      const users = await this.prisma.whoopAccount.findMany({
        select: {
          walletAddress: true,
        },
        take: limit * 2, // Get more than needed in case some fail
      });

      // Get blockchain stats for each user
      const userStats = await Promise.allSettled(
        users.map(async (user) => {
          const stats = await this.blockchainService.getUserContractStats(user.walletAddress);
          const tokenBalance = await this.blockchainService.getUserTokenBalance(user.walletAddress);
          
          return {
            walletAddress: user.walletAddress,
            tokenBalance,
            currentStreak: stats?.currentStreak || 0,
            longestStreak: stats?.longestStreak || 0,
            totalSessions: stats?.totalSessions || 0,
            totalTokensEarned: stats?.totalTokens || 0,
          };
        })
      );

      // Filter successful results and sort by token balance
      const validStats = userStats
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(user => user.totalSessions > 0) // Only include users with at least one session
        .sort((a, b) => b.tokenBalance - a.tokenBalance)
        .slice(0, limit)
        .map((user, index) => ({
          ...user,
          rank: index + 1,
        }));

      return {
        users: validStats,
        isBlockchainEnabled: true,
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return {
        users: [],
        isBlockchainEnabled: false,
      };
    }
  }

  /**
   * Get user's rank in the leaderboard
   */
  async getUserRank(walletAddress: string): Promise<{
    rank: number | null;
    totalUsers: number;
    userStats: any;
  }> {
    try {
      if (!this.blockchainService.isConfigured()) {
        return {
          rank: null,
          totalUsers: 0,
          userStats: null,
        };
      }

      // Get user's stats
      const userStats = await this.blockchainService.getUserContractStats(walletAddress);
      const userTokenBalance = await this.blockchainService.getUserTokenBalance(walletAddress);

      if (!userStats || userStats.totalSessions === 0) {
        return {
          rank: null,
          totalUsers: 0,
          userStats: null,
        };
      }

      // Count users with higher token balances
      const allUsers = await this.prisma.whoopAccount.findMany({
        select: { walletAddress: true },
      });

      const userBalances = await Promise.allSettled(
        allUsers.map(async (user) => {
          const balance = await this.blockchainService.getUserTokenBalance(user.walletAddress);
          const stats = await this.blockchainService.getUserContractStats(user.walletAddress);
          return {
            walletAddress: user.walletAddress,
            balance,
            hasActivity: (stats?.totalSessions || 0) > 0,
          };
        })
      );

      const validBalances = userBalances
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(user => user.hasActivity);

      const higherBalanceCount = validBalances.filter(
        user => user.balance > userTokenBalance
      ).length;

      return {
        rank: higherBalanceCount + 1,
        totalUsers: validBalances.length,
        userStats: {
          ...userStats,
          tokenBalance: userTokenBalance,
        },
      };
    } catch (error) {
      console.error('Error getting user rank:', error);
      return {
        rank: null,
        totalUsers: 0,
        userStats: null,
      };
    }
  }

  /**
   * Get weekly challenge leaderboard (improvement-based)
   */
  async getWeeklyImprovementLeaderboard(limit: number = 10): Promise<{
    users: Array<{
      walletAddress: string;
      weeklyImprovement: number;
      currentStreak: number;
      rank: number;
    }>;
    isBlockchainEnabled: boolean;
  }> {
    // This would require tracking historical data
    // For now, return a placeholder
    return {
      users: [],
      isBlockchainEnabled: this.blockchainService.isConfigured(),
    };
  }
}
