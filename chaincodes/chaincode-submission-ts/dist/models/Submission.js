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
exports.Submission = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
let AttachedDocument = class AttachedDocument {
};
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], AttachedDocument.prototype, "docId", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], AttachedDocument.prototype, "docHash", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Date)
], AttachedDocument.prototype, "uploadedTimestamp", void 0);
AttachedDocument = __decorate([
    (0, fabric_contract_api_1.Object)()
], AttachedDocument);
let Submission = class Submission {
};
exports.Submission = Submission;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], Submission.prototype, "submissionID", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], Submission.prototype, "programID", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], Submission.prototype, "universityID", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], Submission.prototype, "status", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Date)
], Submission.prototype, "creationDate", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Date)
], Submission.prototype, "lastUpdate", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Array)
], Submission.prototype, "documents", void 0);
exports.Submission = Submission = __decorate([
    (0, fabric_contract_api_1.Object)()
], Submission);
//# sourceMappingURL=Submission.js.map