"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhoopService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const blockchain_service_1 = require("../blockchain/blockchain.service");
let WhoopService = class WhoopService {
    constructor(prisma, blockchainService) {
        this.prisma = prisma;
        this.blockchainService = blockchainService;
    }
    computeSignature(timestamp, rawBody, secret) {
        const hmac = crypto_1.default.createHmac('sha256', Buffer.from(secret, 'utf8'));
        hmac.update(timestamp + rawBody);
        return hmac.digest('base64');
    }
    async handleWebhook(signature, timestamp, body) {
        const secret = process.env.WHOOP_CLIENT_SECRET;
        if (!secret)
            throw new common_1.BadRequestException('Server misconfigured');
        if (!signature || !timestamp)
            throw new common_1.UnauthorizedException('Missing signature');
        const rawBody = JSON.stringify(body);
        await this.prisma.whoopEvent.create({
            data: {
                userId: body.user_id,
                resourceId: String(body.id),
                eventType: body.type,
                traceId: body.trace_id ?? null,
                raw: rawBody,
            },
        });
        const [domain, action] = body.type.split('.');
        if (action === 'updated') {
            await this.prisma.whoopResource.upsert({
                where: { userId_resource_domain: { userId: body.user_id, resourceId: String(body.id), domain } },
                update: { updatedAt: new Date() },
                create: { userId: body.user_id, resourceId: String(body.id), domain },
            });
            if (domain === 'sleep') {
                await this.fetchAndStoreSleep(body.user_id, String(body.id));
            }
        }
        else if (action === 'deleted') {
            await this.prisma.whoopResource.deleteMany({ where: { userId: body.user_id, resourceId: String(body.id), domain } });
        }
    }
    async fetchAndStoreSleep(userId, sleepId) {
        try {
            const account = await this.prisma.whoopAccount.findUnique({ where: { whoopUserId: userId } });
            if (!account)
                return;
            const tokenHolder = await this.ensureValidAccessToken(account);
            const url = `https://api.prod.whoop.com/developer/v2/activity/sleep/${sleepId}`;
            let res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${tokenHolder.accessToken}`,
                    Accept: 'application/json',
                },
            });
            if (res.status === 401) {
                const refreshed = await this.tryRefreshAndPersist(account.whoopUserId);
                if (refreshed) {
                    res = await fetch(url, {
                        headers: {
                            Authorization: `Bearer ${refreshed.accessToken}`,
                            Accept: 'application/json',
                        },
                    });
                }
            }
            if (!res.ok)
                return;
            const data = await res.json();
            const start = data?.start ? new Date(data.start) : null;
            const end = data?.end ? new Date(data.end) : null;
            await this.prisma.whoopSleep.upsert({
                where: { sleepId: sleepId },
                update: {
                    userId: userId,
                    start: start ?? undefined,
                    end: end ?? undefined,
                    raw: data,
                },
                create: {
                    userId: userId,
                    sleepId: sleepId,
                    start: start ?? undefined,
                    end: end ?? undefined,
                    raw: data,
                },
            });
            await this.submitSleepDataToBlockchain(userId, data);
        }
        catch (error) {
            console.log(error);
        }
    }
    isTokenExpiringSoon(expiresAt, bufferSeconds = 60) {
        if (!expiresAt)
            return false;
        return Date.now() + bufferSeconds * 1000 >= new Date(expiresAt).getTime();
    }
    async ensureValidAccessToken(account) {
        if (this.isTokenExpiringSoon(account.accessTokenExpiresAt)) {
            const refreshed = await this.tryRefreshAndPersist(account.whoopUserId);
            if (refreshed)
                return { accessToken: refreshed.accessToken };
        }
        return { accessToken: account.accessToken };
    }
    async tryRefreshAndPersist(whoopUserId) {
        const acc = await this.prisma.whoopAccount.findUnique({ where: { whoopUserId } });
        if (!acc || !acc.refreshToken)
            return null;
        const clientId = process.env.WHOOP_CLIENT_ID;
        const clientSecret = process.env.WHOOP_CLIENT_SECRET;
        const whoopHost = process.env.WHOOP_API_HOSTNAME ?? 'https://api.prod.whoop.com';
        if (!clientId || !clientSecret)
            return null;
        const tokenUrl = new URL('/oauth/oauth2/token', whoopHost).toString();
        const scope = "offline read:profile read:sleep read:recovery";
        const form = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: acc.refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            scope: scope,
        });
        const res = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form,
        });
        if (!res.ok)
            return null;
        const json = (await res.json());
        const newExpiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null;
        const updated = await this.prisma.whoopAccount.update({
            where: { whoopUserId },
            data: {
                accessToken: json.access_token,
                refreshToken: json.refresh_token ?? acc.refreshToken,
                accessTokenExpiresAt: newExpiresAt,
            },
        });
        console.log("token refreshed");
        return updated;
    }
    async registerAccount(params) {
        const { whoopUserId, walletAddress, accessToken, refreshToken, expiresInSeconds } = params;
        const expiresAt = expiresInSeconds
            ? new Date(Date.now() + expiresInSeconds * 1000)
            : null;
        return this.prisma.whoopAccount.upsert({
            where: { whoopUserId },
            create: {
                whoopUserId,
                walletAddress: walletAddress,
                accessToken,
                refreshToken: refreshToken ?? null,
                accessTokenExpiresAt: expiresAt,
            },
            update: {
                walletAddress: walletAddress,
                accessToken,
                refreshToken: refreshToken ?? null,
                accessTokenExpiresAt: expiresAt,
            },
        });
    }
    async getUser(walletAddress) {
        const user = await this.prisma.whoopAccount.findUnique({ where: { walletAddress: walletAddress } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async getUserSleep(walletAddress) {
        const user = await this.getUser(walletAddress);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const sleep = await this.prisma.whoopSleep.findFirst({ where: { userId: user.whoopUserId }, orderBy: { start: 'desc' } });
        return sleep?.raw;
    }
    async submitSleepDataToBlockchain(userId, sleepData) {
        try {
            if (!this.blockchainService.isConfigured()) {
                console.log('Blockchain service not configured - skipping contract submission');
                return;
            }
            const account = await this.prisma.whoopAccount.findUnique({ where: { whoopUserId: userId } });
            if (!account?.walletAddress) {
                console.log(`No wallet address found for user ${userId}`);
                return;
            }
            const sleepMetrics = this.extractSleepMetrics(sleepData);
            if (!sleepMetrics) {
                console.log('Could not extract sleep metrics from data');
                return;
            }
            const txHash = await this.blockchainService.submitSleepDataToContract(account.walletAddress, sleepMetrics);
            if (txHash) {
                console.log(`Sleep data submitted to contract for user ${account.walletAddress}. TX: ${txHash}`);
            }
        }
        catch (error) {
            console.error('Error submitting sleep data to blockchain:', error);
        }
    }
    extractSleepMetrics(whoopData) {
        try {
            const score = whoopData.score || {};
            const stages = score.stage_summary || score.stages || {};
            const totalInBedMs = stages.total_in_bed_time_milli || 0;
            const totalAwakeMs = stages.total_awake_time_milli || 0;
            const sleepDurationMs = totalInBedMs - totalAwakeMs;
            const sleepDurationMinutes = Math.max(0, Math.round(sleepDurationMs / (1000 * 60)));
            const efficiencyPercentage = Math.round(score.sleep_efficiency_percentage ||
                score.efficiency_percentage ||
                0);
            const sleepCycles = stages.sleep_cycle_count || 0;
            const deepSleepMs = stages.total_slow_wave_sleep_time_milli || 0;
            const deepSleepMinutes = Math.round(deepSleepMs / (1000 * 60));
            const remSleepMs = stages.total_rem_sleep_time_milli || 0;
            const remSleepMinutes = Math.round(remSleepMs / (1000 * 60));
            const startTime = whoopData.start;
            if (!startTime) {
                console.log('No start time in sleep data');
                return null;
            }
            const date = new Date(startTime).toISOString().split('T')[0];
            return {
                date,
                sleepDurationMinutes,
                efficiencyPercentage,
                sleepCycles,
                deepSleepMinutes,
                remSleepMinutes,
            };
        }
        catch (error) {
            console.error('Error extracting sleep metrics:', error);
            return null;
        }
    }
    async getUserBlockchainStats(walletAddress) {
        try {
            if (!this.blockchainService.isConfigured()) {
                return {
                    tokenBalance: 0,
                    totalTokensEarned: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    totalSessions: 0,
                    isBlockchainEnabled: false,
                };
            }
            const [tokenBalance, contractStats] = await Promise.all([
                this.blockchainService.getUserTokenBalance(walletAddress),
                this.blockchainService.getUserContractStats(walletAddress),
            ]);
            return {
                tokenBalance,
                totalTokensEarned: contractStats?.totalTokens || 0,
                currentStreak: contractStats?.currentStreak || 0,
                longestStreak: contractStats?.longestStreak || 0,
                totalSessions: contractStats?.totalSessions || 0,
                isBlockchainEnabled: true,
            };
        }
        catch (error) {
            console.error('Error getting blockchain stats:', error);
            return {
                tokenBalance: 0,
                totalTokensEarned: 0,
                currentStreak: 0,
                longestStreak: 0,
                totalSessions: 0,
                isBlockchainEnabled: false,
            };
        }
    }
};
exports.WhoopService = WhoopService;
exports.WhoopService = WhoopService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        blockchain_service_1.BlockchainService])
], WhoopService);
//# sourceMappingURL=whoop.service.js.map