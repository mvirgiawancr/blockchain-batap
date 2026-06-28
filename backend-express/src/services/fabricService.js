/**
 * Fabric Service — thin facade over fabricGatewayService.
 *
 * Preserves the method signatures expected by controllers (createSubmission,
 * setDecision, etc.) but signs every transaction with the user's identity
 * loaded from the DB.
 *
 * The previous implementation used `docker exec cli.<org> peer chaincode ...`
 * which signed as the org admin. That path is removed.
 */

const fabricGatewayService = require('./fabricGatewayService');
const logger = require('../utils/logger');

class FabricService {
  constructor() {
    this.isConnected = false;
    logger.info('[Fabric] Service initialized (per-user signing via Gateway)');
  }

  async connect() {
    // No persistent connection — each tx opens its own gateway.
    this.isConnected = true;
    logger.info('[Fabric] Ready (lazy gateway per request)');
  }

  async disconnect() {
    this.isConnected = false;
  }

  _requireUserId(options) {
    const userId = options && options.userId;
    if (!userId) {
      throw new Error('userId option is required for per-user Fabric invocation');
    }
    return userId;
  }

  async invokeChaincode(functionName, args, options = {}) {
    const userId = this._requireUserId(options);
    logger.info(`[Fabric] invoke ${functionName} as user ${userId}`);
    return await fabricGatewayService.submitTransaction(userId, functionName, args);
  }

  async queryChaincode(functionName, args = [], options = {}) {
    const userId = this._requireUserId(options);
    return await fabricGatewayService.evaluateTransaction(userId, functionName, args);
  }

  async createSubmission(submissionData, options = {}) {
    const submissionId = submissionData.submissionId || submissionData.id;
    const submissionObject = {
      programStudi: submissionData.programStudi || submissionData.programStudy || '',
      institusi: submissionData.institusi || submissionData.universityName || '',
      documents: submissionData.documents || [],
      status: submissionData.status || 'under_review',
    };
    return await this.invokeChaincode('CreateSubmission', [
      submissionId,
      JSON.stringify(submissionObject),
    ], options);
  }

  async attachAIRecommendation(recommendationData, options = {}) {
    const submissionId = recommendationData.submissionId;
    const aiData = {
      submissionId,
      status: 'completed',
      processedAt: recommendationData.processedAt || new Date().toISOString(),
      ai_version: 'LAM-TEK-2025-v1.0',
      hasLED: recommendationData.hasLED || false,
      hasLKPS: recommendationData.hasLKPS || false,
      readyForScoring: recommendationData.readyForScoring || false,
      notes: recommendationData.notes || '',
      analyzedAt: recommendationData.analyzedAt || new Date().toISOString(),
      scoring: recommendationData.scoring || recommendationData.scoring_summary,
      scoring_available: !!(recommendationData.scoring || recommendationData.scoring_summary),
    };
    return await this.invokeChaincode('AttachAIRecommendation', [
      submissionId, JSON.stringify(aiData),
    ], options);
  }

  async submitSubmission(submissionData, options = {}) {
    await this.createSubmission(submissionData, options);
    if (submissionData.ai) {
      await this.attachAIRecommendation({ ...submissionData.ai, submissionId: submissionData.submissionId }, options);
    }
    return { success: true };
  }

  async setDecision(submissionId, decision, notes, decidedBy, options = {}) {
    return await this.invokeChaincode('SetDecision', [submissionId, decision, notes, decidedBy], options);
  }

  async updateDocuments(submissionId, newDocuments, options = {}) {
    return await this.invokeChaincode('UpdateDocuments', [submissionId, JSON.stringify(newDocuments)], options);
  }

  async querySubmission(submissionId, options = {}) {
    return await this.queryChaincode('QuerySubmission', [submissionId], options);
  }

  async queryAllSubmissions(options = {}) {
    return await this.queryChaincode('QueryAllSubmissions', [], options);
  }

  async querySubmissionsByStatus(status, options = {}) {
    return await this.queryChaincode('QuerySubmissionsByStatus', [status], options);
  }

  async querySubmissionsByInstitusi(institusi, options = {}) {
    return await this.queryChaincode('QuerySubmissionsByInstitusi', [institusi], options);
  }

  async getSubmissionHistory(submissionId, options = {}) {
    return await this.queryChaincode('GetSubmissionHistory', [submissionId], options);
  }

  async getAllSubmissions(options = {}) {
    const result = await this.queryAllSubmissions(options);
    return Array.isArray(result) ? result : [];
  }

  async getSubmission(submissionId, options = {}) {
    return await this.querySubmission(submissionId, options);
  }

  async getSubmissionsByProgramStudi(programStudi, options = {}) {
    const all = await this.getAllSubmissions(options);
    return all.filter(s => s.programStudi && s.programStudi.toLowerCase().includes(programStudi.toLowerCase()));
  }

  async updateSubmission(submissionId, updates, options = {}) {
    if (updates.scoringResult) {
      return await this.invokeChaincode('SetScoringResult', [submissionId, JSON.stringify(updates.scoringResult)], options);
    }
    throw new Error('Direct submission update not supported. Use setDecision, updateDocuments, or provide scoringResult.');
  }

  async deleteSubmission() {
    throw new Error('Deletion not supported in blockchain. Submissions are immutable.');
  }

  async offerAssessorPair(submissionId, assessor1Id, assessor1Name, assessor2Id, assessor2Name, offeredBy, options = {}) {
    return await this.invokeChaincode('OfferAssessorPair', [submissionId, assessor1Id, assessor1Name, assessor2Id, assessor2Name, offeredBy], options);
  }

  async respondToOffer(submissionId, assessorId, response, notes, options = {}) {
    return await this.invokeChaincode('RespondToOffer', [submissionId, assessorId, response, notes], options);
  }

  async uppsRespondToOffer(submissionId, response, notes, respondedBy, options = {}) {
    return await this.invokeChaincode('UPPSRespondToOffer', [submissionId, response, notes, respondedBy], options);
  }

  async submitAKAssessment(submissionId, assessorId, assessorName, scores, notes, options = {}) {
    return await this.invokeChaincode('SubmitAKAssessment', [submissionId, assessorId, assessorName, JSON.stringify(scores), notes], options);
  }

  async checkAKConsistency(submissionId, consistent, checkedBy, notes, options = {}) {
    return await this.invokeChaincode('CheckAKConsistency', [submissionId, consistent ? 'true' : 'false', checkedBy, notes], options);
  }

  async keaReviewRejection(submissionId, decision, notes, reviewedBy, options = {}) {
    return await this.invokeChaincode('KEAReviewRejection', [submissionId, decision, notes || '', reviewedBy], options);
  }

  async submitALExecution(submissionId, executionData, options = {}) {
    return await this.invokeChaincode('SubmitALExecution', [submissionId, JSON.stringify(executionData)], options);
  }

  async submitUPPSResponse(submissionId, responseData, options = {}) {
    return await this.invokeChaincode('SubmitUPPSResponse', [submissionId, JSON.stringify(responseData)], options);
  }

  async verifyALResult(submissionId, verificationData, options = {}) {
    return await this.invokeChaincode('VerifyALResult', [submissionId, JSON.stringify(verificationData)], options);
  }

  async finalizeAccreditation(submissionId, decisionData, options = {}) {
    return await this.invokeChaincode('FinalizeAccreditation', [submissionId, JSON.stringify(decisionData)], options);
  }
}

module.exports = new FabricService();
