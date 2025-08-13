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
let WhoopService = class WhoopService {
    constructor(prisma) {
        this.prisma = prisma;
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
        const calculated = this.computeSignature(timestamp, rawBody, secret);
        if (calculated !== signature)
            throw new common_1.UnauthorizedException('Invalid signature');
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
        }
        else if (action === 'deleted') {
            await this.prisma.whoopResource.deleteMany({ where: { userId: body.user_id, resourceId: String(body.id), domain } });
        }
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
};
exports.WhoopService = WhoopService;
exports.WhoopService = WhoopService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WhoopService);
//# sourceMappingURL=whoop.service.js.map