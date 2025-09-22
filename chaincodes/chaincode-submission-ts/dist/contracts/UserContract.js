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
exports.UserContract = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
const User_1 = require("../models/User");
let UserContract = class UserContract extends fabric_contract_api_1.Contract {
    constructor() {
        super('UserContract'); // Nama unik untuk kontrak ini
    }
    /**
     * Mendaftarkan pengguna baru ke dalam sistem.
     * (Logika belum diimplementasikan)
     */
    async registerUser(ctx, userID, username, hashedPassword, role) {
        const validRoles = ['UniversityAdmin', 'Assessor', 'SuperAdmin'];
        if (!validRoles.includes(role)) {
            throw new Error(`Peran "${role}" tidak valid. Peran yang diizinkan adalah: ${validRoles.join(', ')}`);
        }
        const exists = await this.assetExists(ctx, userID);
        if (exists) {
            throw new Error(`Pengguna dengan ID ${userID} sudah ada.`);
        }
        const user = new User_1.User();
        user.userID = userID;
        user.username = username;
        user.hashedPassword = hashedPassword;
        user.role = role;
        await ctx.stub.putState(userID, Buffer.from(JSON.stringify(user)));
    }
    /**
     * Mengambil profil pengguna berdasarkan ID.
     * (Logika belum diimplementasikan)
     */
    async getUser(ctx, userID) {
        const userJSON = await ctx.stub.getState(userID);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`Pengguna dengan ID ${userID} tidak ditemukan.`);
        }
        return userJSON.toString();
    }
    /**
     * Fungsi dasar untuk mengecek apakah sebuah aset ada di ledger.
     * Ini adalah fungsi utilitas internal.
     */
    async assetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }
};
exports.UserContract = UserContract;
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UserContract.prototype, "registerUser", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], UserContract.prototype, "getUser", null);
exports.UserContract = UserContract = __decorate([
    (0, fabric_contract_api_1.Info)({ title: 'UserContract', description: 'Smart Contract untuk mengelola pengguna' }),
    __metadata("design:paramtypes", [])
], UserContract);
//# sourceMappingURL=UserContract.js.map