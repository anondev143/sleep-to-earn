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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhoopController = void 0;
const common_1 = require("@nestjs/common");
const whoop_service_1 = require("./whoop.service");
let WhoopController = class WhoopController {
    constructor(service) {
        this.service = service;
    }
    async handle(signature, timestamp, body) {
        await this.service.handleWebhook(signature, timestamp, body);
        return 'ok';
    }
    async register(body) {
        const { whoopUserId, walletAddress, accessToken, refreshToken, expiresIn } = body ?? {};
        if (!whoopUserId || !walletAddress || !accessToken) {
            throw new common_1.BadRequestException('whoopUserId, walletAddress and accessToken are required');
        }
        await this.service.registerAccount({
            whoopUserId,
            walletAddress,
            accessToken,
            refreshToken,
            expiresInSeconds: expiresIn,
        });
        return { ok: true };
    }
    async getUser(walletAddress) {
        return this.service.getUser(walletAddress);
    }
    async getUserSleep(walletAddress) {
        return this.service.getUserSleep(walletAddress);
    }
    async getUserStats(walletAddress) {
        return this.service.getUserBlockchainStats(walletAddress);
    }
};
exports.WhoopController = WhoopController;
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Headers)('x-whoop-signature')),
    __param(1, (0, common_1.Headers)('x-whoop-signature-timestamp')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WhoopController.prototype, "handle", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhoopController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('user/:walletAddress'),
    __param(0, (0, common_1.Param)('walletAddress')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhoopController.prototype, "getUser", null);
__decorate([
    (0, common_1.Get)('sleep/:walletAddress'),
    __param(0, (0, common_1.Param)('walletAddress')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhoopController.prototype, "getUserSleep", null);
__decorate([
    (0, common_1.Get)('stats/:walletAddress'),
    __param(0, (0, common_1.Param)('walletAddress')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhoopController.prototype, "getUserStats", null);
exports.WhoopController = WhoopController = __decorate([
    (0, common_1.Controller)('api/whoop'),
    __metadata("design:paramtypes", [whoop_service_1.WhoopService])
], WhoopController);
//# sourceMappingURL=whoop.controller.js.map