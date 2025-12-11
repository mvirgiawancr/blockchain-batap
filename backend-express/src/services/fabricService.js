/**
 * Hyperledger Fabric Service - Docker CLI Approach
 * Menggunakan docker exec ke CLI container (simple, no wallet/MSP needed)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const config = require('../config');
const logger = require('../utils/logger');

class FabricService {
  constructor() {
    this.channel = config.fabric.channelName;
    this.chaincode = config.fabric.chaincodeName;
    this.cliContainer = 'cli.upps.akreditasi.local';
    // Orderer host from Fablo (group1)
    this.ordererEndpoint = 'orderer0.group1.orderer.akreditasi.local:7030';
    this.cliContainers = {
      UPPSMSP: 'cli.upps.akreditasi.local',
      SekadminMSP: 'cli.sekadmin.akreditasi.local',
      SekkeuMSP: 'cli.sekkeu.akreditasi.local',
      KEAMSP: 'cli.kea.akreditasi.local',
      AsesorMSP: 'cli.asesor.akreditasi.local',
      MajelisMSP: 'cli.majelis.akreditasi.local'
    };
    this.isConnected = false;

    logger.info('[Fabric] Service initialized (Docker CLI mode)');
    logger.info(`[Fabric] Channel: ${this.channel}, Chaincode: ${this.chaincode}`);
    logger.info(`[Fabric] CLI Container: ${this.cliContainer}`);
  }

  async execPeerCommand(command, mspOrg = null) {
    const container = (mspOrg && this.cliContainers[mspOrg]) || this.cliContainer;
    const fullCmd = `docker exec ${container} ${command}`;
    
    try {
      logger.info(`[Fabric] Executing: ${command.substring(0, 100)}...`);
      const { stdout, stderr } = await execAsync(fullCmd, { maxBuffer: 10 * 1024 * 1024 });
      
      if (stderr && !stderr.includes('Chaincode invoke successful')) {
        logger.warn(`[Fabric] stderr: ${stderr.substring(0, 200)}`);
      }
      
      return stdout.trim();
    } catch (error) {
      logger.error(`[Fabric] Command failed: ${error.message}`);
      throw new Error(`Fabric CLI error: ${error.message}`);
    }
  }

  async connect() {
    try {
      logger.info('[Fabric] Testing connection via Docker CLI...');
      
      const testCmd = `peer chaincode query -C ${this.channel} -n ${this.chaincode} -c '{"function":"QueryAllSubmissions","Args":[]}'`;
      
      await this.execPeerCommand(testCmd);
      
      this.isConnected = true;
      logger.info('[Fabric] ✅ Connected successfully via Docker CLI');
      
    } catch (error) {
      this.isConnected = false;
      logger.error('[Fabric] Connection test failed:', error.message);
    }
  }

  async disconnect() {
    this.isConnected = false;
    logger.info('[Fabric] Disconnected');
  }

  async invokeChaincode(functionName, args, options = {}) {
    try {
      const mspOrg = options.mspOrg;
      const payload = {
        function: functionName,
        Args: args
      };
      
      const jsonPayload = JSON.stringify(payload);
      const escapedPayload = jsonPayload.replace(/'/g, "'\"'\"'");
      
      const command = [
        'peer chaincode invoke',
        `-C ${this.channel}`,
        `-n ${this.chaincode}`,
        `-c '${escapedPayload}'`,
        `-o ${this.ordererEndpoint}`,
        '--peerAddresses peer0.upps.akreditasi.local:7041',
        '--peerAddresses peer0.sekadmin.akreditasi.local:7061',
        '--peerAddresses peer0.sekkeu.akreditasi.local:7081',
        '--peerAddresses peer0.kea.akreditasi.local:7101',
        '--peerAddresses peer0.asesor.akreditasi.local:7121',
        '--peerAddresses peer0.majelis.akreditasi.local:7141',
        '--waitForEvent'
      ].join(' ');
      
      logger.info(`[Fabric] Invoking ${functionName} with ${args.length} args`);
      
      const result = await this.execPeerCommand(command, mspOrg);
      
      return {
        success: true,
        message: 'Transaction submitted successfully',
        result: result
      };
      
    } catch (error) {
      logger.error(`[Fabric] Invoke failed for ${functionName}:`, error.message);
      throw error;
    }
  }

  async queryChaincode(functionName, args = [], options = {}) {
    try {
      const mspOrg = options.mspOrg;
      const argsStr = args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(',');
      
      const command = `peer chaincode query -C ${this.channel} -n ${this.chaincode} -c '{"function":"${functionName}","Args":[${argsStr}]}'`;
      
      logger.info(`[Fabric] Querying ${functionName}`);
      
      const result = await this.execPeerCommand(command, mspOrg);
      
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
      
    } catch (error) {
      logger.error(`[Fabric] Query failed for ${functionName}:`, error.message);
      
      if (functionName.startsWith('Query')) {
        return [];
      }
      throw error;
    }
  }

  async createSubmission(submissionData, options = {}) {
    try {
      const mspOrg = options.mspOrg;
      const submissionId = submissionData.submissionId || submissionData.id;
      const programStudi = submissionData.programStudi || submissionData.programStudy || '';
      const institusi = submissionData.institusi || submissionData.universityName || '';
      const documents = submissionData.documents || [];
      const status = submissionData.status || 'under_review';
      
      // Build full submission object as expected by chaincode
      const submissionObject = {
        programStudi,
        institusi,
        documents,
        status
      };
      
      // Convert to JSON string
      const submissionJson = JSON.stringify(submissionObject);
      
      logger.info(`[Fabric] Creating submission: ${submissionId}`);
      logger.info(`[Fabric] Program: "${programStudi}", Institusi: "${institusi}"`);
      logger.info(`[Fabric] Documents: ${documents.length}, Status: ${status}`);
      
      // Chaincode expects: submissionId, submissionJson (2 params only!)
      const result = await this.invokeChaincode('CreateSubmission', [
        submissionId,
        submissionJson
      ], { mspOrg });
      
      logger.info(`[Fabric] ✅ Submission created: ${submissionId}`);
      return result;
      
    } catch (error) {
      logger.error('[Fabric] Failed to create submission:', error.message);
      throw new Error(`Blockchain submission failed: ${error.message}`);
    }
  }

  async attachAIRecommendation(recommendationData, options = {}) {
    try {
      const mspOrg = options.mspOrg;
      const submissionId = recommendationData.submissionId;
      
      // Send FULL AI data including complete scoring details
      const aiData = {
        submissionId: submissionId,
        status: 'completed',
        processedAt: recommendationData.processedAt || new Date().toISOString(),
        ai_version: 'LAM-TEK-2025-v1.0',
        hasLED: recommendationData.hasLED || false,
        hasLKPS: recommendationData.hasLKPS || false,
        readyForScoring: recommendationData.readyForScoring || false,
        notes: recommendationData.notes || '',
        analyzedAt: recommendationData.analyzedAt || new Date().toISOString()
      };
      
      // Include COMPLETE scoring data if available
      const scoringData = recommendationData.scoring || recommendationData.scoring_summary;
      if (scoringData) {
        aiData.scoring = scoringData; // Send FULL scoring object with all criteria
        aiData.scoring_available = true;
      } else {
        aiData.scoring_available = false;
      }
      
      const recommendationJson = JSON.stringify(aiData);
      
      logger.info(`[Fabric] Attaching FULL AI data to: ${submissionId}`);
      logger.info(`[Fabric] Scoring data: ${scoringData ? 'YES (FULL)' : 'NO'}`);
      
      const result = await this.invokeChaincode('AttachAIRecommendation', [
        submissionId,
        recommendationJson
      ], { mspOrg });
      
      logger.info(`[Fabric] ✅ AI attached: ${submissionId}`);
      return result;
      
    } catch (error) {
      logger.error('[Fabric] Failed to attach AI:', error.message);
      throw new Error(`Blockchain AI attachment failed: ${error.message}`);
    }
  }

  async submitSubmission(submissionData, options = {}) {
    try {
      const mspOrg = options.mspOrg;
      logger.info(`[Fabric] Submitting complete submission: ${submissionData.submissionId}`);
      
      await this.createSubmission(submissionData, { mspOrg });
      
      if (submissionData.ai) {
        // Pass COMPLETE AI data including full scoring details
        const aiData = {
          submissionId: submissionData.submissionId,
          processedAt: new Date().toISOString(),
          hasLED: submissionData.ai.hasLED,
          hasLKPS: submissionData.ai.hasLKPS,
          readyForScoring: submissionData.ai.readyForScoring,
          notes: submissionData.ai.notes,
          analyzedAt: submissionData.ai.analyzedAt,
          scoring: submissionData.ai.scoring,  // FULL scoring with all criteria
          ai_version: 'LAM-TEK-2025-v1.0'
        };
        
        await this.attachAIRecommendation(aiData, { mspOrg });
      }
      
      logger.info(`[Fabric] ✅ Complete submission stored: ${submissionData.submissionId}`);
      return { success: true };
      
    } catch (error) {
      logger.error('[Fabric] Failed to submit:', error.message);
      throw new Error(`Blockchain submission failed: ${error.message}`);
    }
  }

  async setDecision(submissionId, decision, notes, decidedBy, options = {}) {
    try {
      const mspOrg = options.mspOrg;
      logger.info(`[Fabric] Setting decision for ${submissionId}: ${decision}`);
      
      const result = await this.invokeChaincode('SetDecision', [
        submissionId,
        decision,
        notes,
        decidedBy
      ], { mspOrg });
      
      logger.info(`[Fabric] ✅ Decision set: ${submissionId}`);
      return result;
      
    } catch (error) {
      logger.error('[Fabric] Failed to set decision:', error.message);
      throw error;
    }
  }

  async updateDocuments(submissionId, newDocuments) {
    try {
      const documentsJson = JSON.stringify(newDocuments);
      
      logger.info(`[Fabric] Updating documents for ${submissionId}`);
      
      const result = await this.invokeChaincode('UpdateDocuments', [
        submissionId,
        documentsJson
      ]);
      
      logger.info(`[Fabric] ✅ Documents updated: ${submissionId}`);
      return result;
      
    } catch (error) {
      logger.error('[Fabric] Failed to update documents:', error.message);
      throw error;
    }
  }

  async querySubmission(submissionId, options = {}) {
    const mspOrg = options.mspOrg;
    return await this.queryChaincode('QuerySubmission', [submissionId], { mspOrg });
  }

  async queryAllSubmissions(options = {}) {
    const mspOrg = options.mspOrg;
    return await this.queryChaincode('QueryAllSubmissions', [], { mspOrg });
  }

  async querySubmissionsByStatus(status, options = {}) {
    const mspOrg = options.mspOrg;
    return await this.queryChaincode('QuerySubmissionsByStatus', [status], { mspOrg });
  }

  async querySubmissionsByInstitusi(institusi, options = {}) {
    const mspOrg = options.mspOrg;
    return await this.queryChaincode('QuerySubmissionsByInstitusi', [institusi], { mspOrg });
  }

  async getSubmissionHistory(submissionId, options = {}) {
    const mspOrg = options.mspOrg;
    return await this.queryChaincode('GetSubmissionHistory', [submissionId], { mspOrg });
  }

  // Aliases for controller compatibility
  async getAllSubmissions(options = {}) {
    logger.info('[Fabric] Getting all submissions from blockchain');
    const result = await this.queryAllSubmissions(options);
    // queryChaincode already returns parsed JSON
    return Array.isArray(result) ? result : [];
  }

  async getSubmission(submissionId, options = {}) {
    logger.info(`[Fabric] Getting submission ${submissionId} from blockchain`);
    const result = await this.querySubmission(submissionId, options);
    // queryChaincode already returns parsed JSON
    return result;
  }

  async getSubmissionsByProgramStudi(programStudi) {
    logger.info(`[Fabric] Getting submissions for program studi: ${programStudi}`);
    const allSubmissions = await this.getAllSubmissions();
    return allSubmissions.filter(s => 
      s.programStudi.toLowerCase().includes(programStudi.toLowerCase())
    );
  }

  async updateSubmission(submissionId, updates, options = {}) {
    logger.info(`[Fabric] Updating submission ${submissionId}`);

    // Scoring result update
    if (updates.scoringResult) {
      const scoringJson = JSON.stringify(updates.scoringResult);
      return await this.invokeChaincode('SetScoringResult', [submissionId, scoringJson], { mspOrg: options.mspOrg });
    }

    throw new Error('Direct submission update not supported. Use setDecision, updateDocuments, or provide scoringResult.');
  }

  async deleteSubmission(submissionId) {
    logger.info(`[Fabric] Delete submission ${submissionId}`);
    throw new Error('Deletion not supported in blockchain. Submissions are immutable.');
  }
  async offerAssessorPair(submissionId, assessor1Id, assessor1Name, assessor2Id, assessor2Name, offeredBy, options = {}) {
    try {
      const mspOrg = options.mspOrg;
      logger.info(`[Fabric] Offering assessor pair for ${submissionId}`);
      
      const result = await this.invokeChaincode('OfferAssessorPair', [
        submissionId,
        assessor1Id,
        assessor1Name,
        assessor2Id,
        assessor2Name,
        offeredBy
      ], { mspOrg });
      
      logger.info(`[Fabric] ✅ Assessor pair offered: ${submissionId}`);
      return result;
    } catch (error) {
      logger.error('[Fabric] Failed to offer assessor pair:', error.message);
      throw error;
    }
  }

  async respondToOffer(submissionId, assessorId, response, notes, options = {}) {
    try {
      const mspOrg = options.mspOrg;
      logger.info(`[Fabric] Assessor ${assessorId} responding to offer for ${submissionId}: ${response}`);
      
      const result = await this.invokeChaincode('RespondToOffer', [
        submissionId,
        assessorId,
        response,
        notes
      ], { mspOrg });
      
      logger.info(`[Fabric] ✅ Assessor responded: ${submissionId}`);
      return result;
    } catch (error) {
      logger.error('[Fabric] Failed to respond to offer:', error.message);
      throw error;
    }
  }

  async uppsRespondToOffer(submissionId, response, notes, respondedBy, options = {}) {
    try {
      const mspOrg = options.mspOrg;
      logger.info(`[Fabric] UPPS responding to offer for ${submissionId}: ${response}`);
      
      const result = await this.invokeChaincode('UPPSRespondToOffer', [
        submissionId,
        response,
        notes,
        respondedBy
      ], { mspOrg });
      
      logger.info(`[Fabric] ✅ UPPS responded: ${submissionId}`);
      return result;
    } catch (error) {
      logger.error('[Fabric] Failed to respond to offer (UPPS):', error.message);
      throw error;
    }
  }

  async submitAKAssessment(submissionId, assessorId, assessorName, scores, notes, options = {}) {
    try {
      const mspOrg = options.mspOrg;
      const scoresJson = JSON.stringify(scores);
      logger.info(`[Fabric] Submitting AK assessment for ${submissionId} by ${assessorId}`);
      
      const result = await this.invokeChaincode('SubmitAKAssessment', [
        submissionId,
        assessorId,
        assessorName,
        scoresJson,
        notes
      ], { mspOrg });
      
      logger.info(`[Fabric] ✅ AK Assessment submitted: ${submissionId}`);
      return result;
    } catch (error) {
      logger.error('[Fabric] Failed to submit AK assessment:', error.message);
      throw error;
    }
  }

  async checkAKConsistency(submissionId, consistent, checkedBy, notes, options = {}) {
    try {
      const mspOrg = options.mspOrg;
      logger.info(`[Fabric] Checking AK consistency for ${submissionId}: ${consistent}`);
      
      const result = await this.invokeChaincode('CheckAKConsistency', [
        submissionId,
        consistent ? 'true' : 'false', // Convert boolean to string if needed, or check chaincode expectation. Chaincode expects boolean but invoke args are strings usually? Wait, chaincode args are strings.
        checkedBy,
        notes
      ], { mspOrg });
      
      logger.info(`[Fabric] ✅ AK Consistency checked: ${submissionId}`);
      return result;
    } catch (error) {
      logger.error('[Fabric] Failed to check AK consistency:', error.message);
      throw error;
    }
  }
}

module.exports = new FabricService();
