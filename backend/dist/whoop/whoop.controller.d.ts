import { WhoopService } from './whoop.service';
type WhoopEventBody = {
    user_id: number;
    id: string | number;
    type: string;
    trace_id?: string;
};
export declare class WhoopController {
    private readonly service;
    constructor(service: WhoopService);
    handle(signature: string, timestamp: string, body: WhoopEventBody): Promise<string>;
    register(body: {
        whoopUserId?: number;
        walletAddress?: string;
        accessToken?: string;
        refreshToken?: string;
        expiresIn?: number;
    }): Promise<{
        ok: boolean;
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
