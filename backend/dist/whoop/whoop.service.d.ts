import { PrismaService } from '../prisma/prisma.service';
type WhoopEventBody = {
    user_id: number;
    id: string | number;
    type: string;
    trace_id?: string;
};
export declare class WhoopService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private computeSignature;
    handleWebhook(signature: string | undefined, timestamp: string | undefined, body: WhoopEventBody): Promise<void>;
    registerAccount(params: {
        whoopUserId: number;
        walletAddress: string;
        accessToken: string;
        refreshToken?: string;
        expiresInSeconds?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        whoopUserId: number;
        walletAddress: string;
        accessToken: string;
        refreshToken: string | null;
        accessTokenExpiresAt: Date | null;
    }>;
    getUser(walletAddress: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        whoopUserId: number;
        walletAddress: string;
        accessToken: string;
        refreshToken: string | null;
        accessTokenExpiresAt: Date | null;
    }>;
}
export {};
