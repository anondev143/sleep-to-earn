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
}
export {};
