import { Injectable, Logger } from '@nestjs/common';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { sleepToEarnAbi, sleepTokenAbi } from 'src/abis';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly publicClient;
  private readonly walletClient;
  private readonly account;

  // Contract addresses (update these after deployment)
  private readonly SLEEP_TO_EARN_ADDRESS = process.env.SLEEP_TO_EARN_CONTRACT_ADDRESS as `0x${string}`;
  private readonly SLEEP_TOKEN_ADDRESS = process.env.SLEEP_TOKEN_CONTRACT_ADDRESS as `0x${string}`;


  constructor() {
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      this.logger.warn('PRIVATE_KEY not set - blockchain features disabled');
      return;
    }

    if (!this.SLEEP_TO_EARN_ADDRESS || !this.SLEEP_TOKEN_ADDRESS) {
      this.logger.warn('Contract addresses not set - blockchain features disabled');
      return;
    }

    try {
      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      
      this.publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });

      this.walletClient = createWalletClient({
        account: this.account,
        chain: baseSepolia,
        transport: http(),
      });

      this.logger.log(`Blockchain service initialized with account: ${this.account.address}`);
    } catch (error) {
      this.logger.error('Failed to initialize blockchain service', error);
    }
  }

  /**
   * Submit sleep data to the smart contract
   */
  async submitSleepDataToContract(
    userWalletAddress: string,
    sleepData: {
      date: string; // YYYY-MM-DD format
      sleepDurationMinutes: number;
      efficiencyPercentage: number;
      sleepCycles: number;
      deepSleepMinutes: number;
      remSleepMinutes: number;
    }
  ): Promise<string | null> {
    if (!this.walletClient || !this.SLEEP_TO_EARN_ADDRESS) {
      this.logger.warn('Blockchain not configured - skipping contract submission');
      return null;
    }

    try {
      // Convert date format from YYYY-MM-DD to YYYYMMDD
      const dateNumber = parseInt(sleepData.date.replace(/-/g, ''));
      
      this.logger.log(`Submitting sleep data to contract for user ${userWalletAddress}, date ${dateNumber}`);

      const hash = await this.walletClient.writeContract({
        address: this.SLEEP_TO_EARN_ADDRESS,
        abi: sleepToEarnAbi,
        functionName: 'submitSleepData',
        args: [
          userWalletAddress as `0x${string}`,
          BigInt(dateNumber),
          BigInt(sleepData.sleepDurationMinutes),
          BigInt(Math.round(sleepData.efficiencyPercentage)),
          BigInt(sleepData.sleepCycles),
          BigInt(sleepData.deepSleepMinutes),
          BigInt(sleepData.remSleepMinutes),
        ],
      });

      this.logger.log(`Sleep data submitted to contract. Transaction hash: ${hash}`);
      return hash;
    } catch (error: any) {
      this.logger.error(`Failed to submit sleep data to contract: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Get user's token balance
   */
  async getUserTokenBalance(userWalletAddress: string): Promise<number> {
    if (!this.publicClient || !this.SLEEP_TOKEN_ADDRESS) {
      return 0;
    }

    try {
      const balance = await this.publicClient.readContract({
        address: this.SLEEP_TOKEN_ADDRESS,
        abi: sleepTokenAbi,
        functionName: 'balanceOf',
        args: [userWalletAddress as `0x${string}`],
      });

      // Convert from wei to tokens (18 decimals)
      return Number(balance) / Math.pow(10, 18);
    } catch (error) {
      this.logger.error(`Failed to get token balance for ${userWalletAddress}:`, error);
      return 0;
    }
  }

  /**
   * Get user's stats from the contract
   */
  async getUserContractStats(userWalletAddress: string): Promise<{
    totalTokens: number;
    currentStreak: number;
    longestStreak: number;
    totalSessions: number;
  } | null> {
    if (!this.publicClient || !this.SLEEP_TO_EARN_ADDRESS) {
      return null;
    }

    try {
      const stats: any = await this.publicClient.readContract({
        address: this.SLEEP_TO_EARN_ADDRESS,
        abi: sleepToEarnAbi,
        functionName: 'getUserStats',
        args: [userWalletAddress as `0x${string}`],
      });

      return {
        totalTokens: Number(stats[0]) / Math.pow(10, 18), // Convert from wei
        currentStreak: Number(stats[1]),
        longestStreak: Number(stats[2]),
        totalSessions: Number(stats[3]),
      };
    } catch (error) {
      this.logger.error(`Failed to get user stats for ${userWalletAddress}:`, error);
      return null;
    }
  }

  /**
   * Get sleep data from contract for a specific date
   */
  async getSleepDataFromContract(userWalletAddress: string, date: string): Promise<any | null> {
    if (!this.publicClient || !this.SLEEP_TO_EARN_ADDRESS) {
      return null;
    }

    try {
      const dateNumber = parseInt(date.replace(/-/g, ''));
      
      const sleepData: any = await this.publicClient.readContract({
        address: this.SLEEP_TO_EARN_ADDRESS,
        abi: sleepToEarnAbi,
        functionName: 'getUserSleepData',
        args: [userWalletAddress as `0x${string}`, BigInt(dateNumber)],
      });

      if (!sleepData[6]) { // isValid field
        return null;
      }

      return {
        timestamp: Number(sleepData[0]),
        sleepDurationMinutes: Number(sleepData[1]),
        efficiencyPercentage: Number(sleepData[2]),
        sleepCycles: Number(sleepData[3]),
        deepSleepMinutes: Number(sleepData[4]),
        remSleepMinutes: Number(sleepData[5]),
        isValid: sleepData[6],
      };
    } catch (error) {
      this.logger.error(`Failed to get sleep data from contract for ${userWalletAddress}, date ${date}:`, error);
      return null;
    }
  }

  /**
   * Check if blockchain service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.walletClient && this.SLEEP_TO_EARN_ADDRESS && this.SLEEP_TOKEN_ADDRESS);
  }
}
