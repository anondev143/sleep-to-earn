import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
type WhoopEventBody = {
    user_id: number;
    id: string | number;
    type: string;
    trace_id?: string;
};
export declare class WhoopService {
    private readonly prisma;
    private readonly blockchainService;
    constructor(prisma: PrismaService, blockchainService: BlockchainService);
    private computeSignature;
    handleWebhook(signature: string | undefined, timestamp: string | undefined, body: WhoopEventBody): Promise<void>;
    private fetchAndStoreSleep;
    private isTokenExpiringSoon;
    private ensureValidAccessToken;
    private tryRefreshAndPersist;
    registerAccount(params: {
        whoopUserId: number;
        walletAddress: string;
        accessToken: string;
        refreshToken?: string;
        expiresInSeconds?: number;
    }): Promise<{
        id: string;
        whoopUserId: number;
        walletAddress: string;
        createdAt: Date;
        updatedAt: Date;
        accessToken: string;
        refreshToken: string | null;
        accessTokenExpiresAt: Date | null;
    }>;
    getUser(walletAddress: string): Promise<{
        id: string;
        whoopUserId: number;
        walletAddress: string;
        createdAt: Date;
        updatedAt: Date;
        accessToken: string;
        refreshToken: string | null;
        accessTokenExpiresAt: Date | null;
    }>;
    getUserSleep(walletAddress: string): Promise<import("@prisma/client/runtime/library").JsonValue | undefined>;
    private submitSleepDataToBlockchain;
    private extractSleepMetrics;
    getUserBlockchainStats(walletAddress: string): Promise<{
        tokenBalance: number;
        totalTokensEarned: number;
        currentStreak: number;
        longestStreak: number;
        totalSessions: number;
        isBlockchainEnabled: boolean;
    }>;
}
export {};
