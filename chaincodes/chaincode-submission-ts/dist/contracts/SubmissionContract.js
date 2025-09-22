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
exports.SubmissionContract = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
let SubmissionContract = class SubmissionContract extends fabric_contract_api_1.Contract {
    async createSubmission(ctx, submissionID, programID, universityID) {
    }
    async getSubmission(ctx, submissionID) {
        const submissionJSON = await ctx.stub.getState(submissionID);
        if (!submissionJSON || submissionJSON.length === 0) {
            throw new Error(`The submission ${submissionID} does not exist`);
        }
        return submissionJSON.toString();
    }
    async addDocument(ctx, submissionID, docId, docHash) {
    }
    async updateStatus(ctx, submissionID, newStatus) {
    }
    async put(ctx, key, value) {
        await ctx.stub.putState(key, Buffer.from(value));
        return { success: "OK" };
    }
};
exports.SubmissionContract = SubmissionContract;
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], SubmissionContract.prototype, "createSubmission", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], SubmissionContract.prototype, "getSubmission", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], SubmissionContract.prototype, "addDocument", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], SubmissionContract.prototype, "updateStatus", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], SubmissionContract.prototype, "put", null);
exports.SubmissionContract = SubmissionContract = __decorate([
    (0, fabric_contract_api_1.Info)({ title: 'SubmissionContract', description: 'Smart Contract for managing accreditation submissions' })
], SubmissionContract);
//# sourceMappingURL=SubmissionContract.js.map