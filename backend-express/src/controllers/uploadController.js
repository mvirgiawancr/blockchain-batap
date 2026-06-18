/**
 * Upload Controller
 * Handles LED and LKPS document uploads with IPFS storage and AI analysis
 */

const geminiService = require('../services/geminiService');
const pinataService = require('../services/pinataService');
const fabricService = require('../services/fabricService');
const lamtekScoringService = require('../services/lamtekScoringService');
const websocketService = require('../services/websocketService');
const encryptionKeyService = require('../services/encryptionKeyService');
const { Submission, Document, AIRecommendation } = require('../models');
const { generateSubmissionId, calculateHash, formatFileSize } = require('../utils/helpers');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Upload and process LED/LKPS documents
 */
const uploadDocuments = async (req, res, next) => {
  try {
    const { programStudi, institusi, programType, submittedBy, notes } = req.body;
    const actor = req.user || {};
    const files = req.files;

    logger.info(`Starting document upload for ${programStudi} (${programType})`);

    // Validate files
    if (!files.led_file && !files.lkps_file) {
      return res.status(400).json({
        error: 'Missing files',
        message: 'At least one document (LED or LKPS) is required'
      });
    }

    const submissionId = generateSubmissionId();
    const documents = [];
    let ledContent = '';
    let lkpsContent = '';

    // Get user_id for WebSocket (default to 'upps')
    const userId = actor.username || actor.id || submittedBy || 'upps';
    const submittedByName = actor.username || submittedBy || 'unknown';

    // Send initial progress
    websocketService.sendUploadProgress(userId, {
      stage: 'started',
      progress: 0,
      message: 'Upload started',
      details: { submissionId, programStudi }
    });

    // Process LED file
    if (files.led_file) {
      const ledFile = files.led_file[0];
      logger.info(`Processing LED file: ${ledFile.originalname} (${formatFileSize(ledFile.size)})`);

      // Extract text from PDF
      try {
        ledContent = await geminiService.extractTextFromPDF(ledFile.buffer);
        logger.info(`LED text extracted: ${ledContent.length} characters`);
      } catch (error) {
        logger.error('LED extraction failed:', error);
        return res.status(400).json({
          error: 'LED extraction failed',
          message: error.message
        });
      }

      // Verify document type
      const verification = await geminiService.verifyDocumentType(ledContent, 'LED');
      if (!verification.isValid) {
        return res.status(400).json({
          error: 'Invalid LED document',
          message: 'The uploaded PDF does not appear to be a valid LED document',
          details: verification
        });
      }

      // Upload to IPFS (ENCRYPTED)
      const ledHash = calculateHash(ledFile.buffer);
      let ledCid = null;
      let ledEncrypted = false;
      
      try {
        // Upload with encryption
        const ipfsResult = await pinataService.uploadFileEncrypted(
          ledFile.buffer,
          `led-${submissionId}-${ledFile.originalname}`,
          {
            submissionId,
            programStudi,
            institusi,
            documentType: 'LED',
            fileHash: ledHash
          }
        );
        
        ledCid = ipfsResult.cid;
        ledEncrypted = true;
        
        // Store encryption key securely
        await encryptionKeyService.storeKey(
          submissionId,
          'LED',
          ipfsResult.encryptionKey,
          ipfsResult.iv,
          ledCid
        );
        
        logger.info(`LED uploaded to IPFS (ENCRYPTED): ${ledCid}`);
      } catch (error) {
        logger.warn('IPFS encrypted upload failed (continuing without IPFS):', error.message);
      }

      const ledDoc = new Document('LED', ledCid, ledHash, ledFile.originalname, verification.isValid, verification.confidence);
      ledDoc.size = ledFile.size;
      ledDoc.encrypted = ledEncrypted;
      documents.push(ledDoc);
    }

    // Process LKPS file
    if (files.lkps_file) {
      const lkpsFile = files.lkps_file[0];
      logger.info(`Processing LKPS file: ${lkpsFile.originalname} (${formatFileSize(lkpsFile.size)})`);

      // Extract text from Excel
      try {
        lkpsContent = await geminiService.extractTextFromExcel(lkpsFile.buffer, lkpsFile.originalname);
        logger.info(`LKPS text extracted: ${lkpsContent.length} characters`);
      } catch (error) {
        logger.error('LKPS extraction failed:', error);
        return res.status(400).json({
          error: 'LKPS extraction failed',
          message: error.message
        });
      }

      // Verify document type
      const verification = await geminiService.verifyDocumentType(lkpsContent, 'LKPS');
      if (!verification.isValid) {
        return res.status(400).json({
          error: 'Invalid LKPS document',
          message: 'The uploaded file does not appear to be a valid LKPS document',
          details: verification
        });
      }

      // Upload to IPFS (ENCRYPTED)
      const lkpsHash = calculateHash(lkpsFile.buffer);
      let lkpsCid = null;
      let lkpsEncrypted = false;
      
      try {
        // Upload with encryption
        const ipfsResult = await pinataService.uploadFileEncrypted(
          lkpsFile.buffer,
          `lkps-${submissionId}-${lkpsFile.originalname}`,
          {
            submissionId,
            programStudi,
            institusi,
            documentType: 'LKPS',
            fileHash: lkpsHash
          }
        );
        
        lkpsCid = ipfsResult.cid;
        lkpsEncrypted = true;
        
        // Store encryption key securely
        await encryptionKeyService.storeKey(
          submissionId,
          'LKPS',
          ipfsResult.encryptionKey,
          ipfsResult.iv,
          lkpsCid
        );
        
        logger.info(`LKPS uploaded to IPFS (ENCRYPTED): ${lkpsCid}`);
      } catch (error) {
        logger.warn('IPFS encrypted upload failed (continuing without IPFS):', error.message);
      }

      const lkpsDoc = new Document('LKPS', lkpsCid, lkpsHash, lkpsFile.originalname, verification.isValid, verification.confidence);
      lkpsDoc.size = lkpsFile.size;
      lkpsDoc.encrypted = lkpsEncrypted;
      documents.push(lkpsDoc);
    }

    // Perform AI analysis if both documents are present
    let aiRecommendation = null;
    let scoringResult = null;

    // Send progress update
    websocketService.sendUploadProgress(userId, {
      stage: 'analysis_starting',
      progress: 50,
      message: 'Starting AI analysis with Gemini...',
      details: { submissionId }
    });

    if (ledContent && lkpsContent) {
      logger.info('Starting AI analysis with Gemini...');

      try {
        // RAG penuh aktif bila FULL_RAG != false (default ON). FULL_RAG=false → jalur
        // lightweight: tanpa indexing/embedding, ekstraksi langsung dari isi dokumen.
        const ragEnabled = config.rag && config.rag.enabled;
        let ragService = null;
        if (ragEnabled) {
          const RagService = require('../services/ragService');
          ragService = new RagService();
          websocketService.sendAnalysisProgress(userId, { stage: 'indexing', progress: 55, message: 'Mengindeks dokumen untuk RAG...' });
          await ragService.indexDocument({ submissionId, docType: 'LED', content: ledContent });
          await ragService.indexDocument({ submissionId, docType: 'LKPS', content: lkpsContent });
        } else {
          logger.info('RAG dinonaktifkan (FULL_RAG=false) — memakai jalur lightweight.');
        }

        // Send progress: AI analysis
        websocketService.sendAnalysisProgress(userId, {
          stage: 'extracting',
          progress: 60,
          message: 'Analyzing documents with AI (this may take 2-3 minutes)...'
        });

        const analysisResult = await geminiService.analyzeDocumentsForScoring(
          programStudi,
          institusi,
          ledContent,
          lkpsContent,
          programType,
          { submissionId, ragService }
        );

        logger.info('AI analysis completed successfully');
        logger.info(`Extracted LED fields: ${Object.keys(analysisResult.led_data).length}`);
        logger.info(`Extracted LKPS fields: ${Object.keys(analysisResult.lkps_data).length}`);

        // Send progress: Analysis complete
        websocketService.sendAnalysisProgress(userId, {
          stage: 'analysis_complete',
          progress: 80,
          message: `AI analysis complete! Extracted ${Object.keys(analysisResult.led_data).length} LED fields, ${Object.keys(analysisResult.lkps_data).length} LKPS fields`
        });

        // Create AI recommendation
        aiRecommendation = new AIRecommendation({
          hasLED: !!ledContent,
          hasLKPS: !!lkpsContent,
          ledCriteriaCoverage: analysisResult.led_data,
          lkpsNumericData: analysisResult.lkps_data,
          lkpsDataCompleteness: analysisResult.lkps_data, // For compatibility
          readyForScoring: analysisResult.scoring_readiness.ready_for_lamtek_scoring,
          notes: analysisResult.scoring_readiness.error || 'AI analysis completed',
          analyzedAt: new Date().toISOString()
        });

        // Perform LAM-TEK scoring if data is complete
        if (analysisResult.scoring_readiness.ready_for_lamtek_scoring) {
          logger.info('Calculating DETAILED LAM-TEK 2025 scores (7 Criteria)...');

          // Send progress: Scoring
          websocketService.sendUploadProgress(userId, {
            stage: 'scoring',
            progress: 85,
            message: 'Calculating LAM-TEK 2025 scores...',
            details: { submissionId }
          });

          // RAG scoring butir kualitatif (non-fatal). Retrieval per-kriteria dibungkus
          // sendiri agar kegagalan embedding (breaker 429) tidak membatalkan semuanya;
          // lalu SATU panggilan generasi untuk semua kriteria (hemat kuota: 5→1).
          // Skor butir kualitatif DIBACA DARI LED di KEDUA mode:
          //  • Full RAG  : bukti LED via ragService.search + rubrik via getPedomanContext.
          //  • Lightweight: bukti LED via pencarian kata kunci (findRelevantSnippet), tanpa rubrik pgvector.
          // Tetap SATU panggilan generasi untuk semua kriteria (hemat kuota). Non-fatal → fallback skor acak.
          let qualitativeScores = {};
          try {
            const ragOn = !!(ragService && await ragService.isAvailable());
            const evidenceList = [];
            for (const k of [1, 2, 3, 5, 7]) {
              const crit = geminiService.criteriaConfig[k];
              if (!crit || !crit.ledKeys || crit.ledKeys.length === 0) continue;
              let ledEvidence = '';
              let pedomanRubric = '';
              if (ragOn) {
                try {
                  const ledRows = await ragService.search({ query: `${crit.name} ${crit.ledKeys.join(' ')}`, submissionId, docType: 'LED', kriteria: k, topK: 6 });
                  ledEvidence = ledRows.map(r => r.content).join('\n\n');
                  const pedomanRows = await ragService.getPedomanContext({ kriteria: k, query: crit.name, topK: 3 });
                  pedomanRubric = pedomanRows.map(r => r.content).join('\n\n');
                } catch (rErr) {
                  // Retrieval gagal (mis. embedding 429) → kriteria ini dinilai tanpa bukti (akan di-floor).
                  logger.warn(`RAG retrieval K${k} gagal (lanjut tanpa bukti): ${rErr.message}`);
                }
              } else {
                // Mode lightweight: ambil potongan LED relevan via kata kunci (tanpa pgvector).
                ledEvidence = geminiService.findRelevantSnippet(ledContent, [crit.name, `KRITERIA ${k}`, `Kriteria ${k}`], 12000);
              }
              evidenceList.push({ criterionNum: k, butirList: crit.butir, ledEvidence, pedomanRubric });
            }
            if (evidenceList.length) {
              qualitativeScores = await geminiService.scoreAllQualitativeButir(evidenceList);
            }
          } catch (err) {
            logger.warn('Skoring kualitatif gagal (pakai default acak):', err.message);
          }

          scoringResult = lamtekScoringService.calculateDetailedLAMTEKScores(
            analysisResult.led_data,
            analysisResult.lkps_data,
            programType,
            qualitativeScores
          );

          logger.info(`Scoring complete: Final Score = ${scoringResult.finalScore.toFixed(2)} / ${scoringResult.maxPossibleScore}`);
          logger.info(`Akreditasi: ${scoringResult.akreditasi}`);

          // Send scoring result via WebSocket
          websocketService.sendScoringUpdate(userId, {
            submissionId,
            finalScore: scoringResult.finalScore,
            maxPossibleScore: scoringResult.maxPossibleScore,
            percentage: scoringResult.percentage,
            akreditasi: scoringResult.akreditasi,
            criteriaScores: scoringResult.criteriaScores
          });
        }
      } catch (error) {
        logger.error('AI analysis failed:', error);
        
        // Send error notification to user via WebSocket
        websocketService.sendError(userId, {
          stage: 'analysis',
          message: 'AI analysis failed. Document uploaded without scoring.',
          details: error.message
        });
        
        aiRecommendation = new AIRecommendation({
          hasLED: !!ledContent,
          hasLKPS: !!lkpsContent,
          readyForScoring: false,
          notes: `AI analysis error: ${error.message}. Mohon coba upload ulang atau hubungi administrator.`,
          analyzedAt: new Date().toISOString()
        });
      }
    }

    // Create submission object (constructor: submissionId, programStudi, institusi, programType)
    const submission = new Submission(submissionId, programStudi, institusi, programType);
    submission.submittedBy = submittedByName;
    submission.submittedByRole = actor.role || null;
    submission.submittedByOrg = actor.msp_org || null;
    
    // Add documents
    documents.forEach(doc => submission.addDocument(doc));
    
    // Set AI recommendation if available
    if (aiRecommendation) {
      submission.setAIRecommendation(aiRecommendation);
    }
    
    // Add scoring result to AI recommendation
    if (scoringResult && submission.ai) {
      submission.ai.scoring = scoringResult;
      submission.ai.scoreCompleteness = scoringResult.percentage || 0;
      submission.scoringResult = scoringResult;
    }
    
    // Update status: After scoring complete, set to 'under_review' for Sekretariat verification
    submission.status = scoringResult ? 'under_review' : (aiRecommendation ? 'processing' : 'uploaded');

    // Send success notification via WebSocket BEFORE blockchain
    websocketService.sendSuccess(userId, {
      submissionId,
      message: 'Analysis complete! Storing on blockchain...',
      submission: {
        id: submission.submissionId,
        status: submission.status,
        scoringResult: scoringResult ? {
          finalScore: scoringResult.finalScore,
          akreditasi: scoringResult.akreditasi
        } : null
      }
    });

    // Store on blockchain (asynchronously to avoid timeout)
    setImmediate(async () => {
      try {
        logger.info('Storing submission on blockchain...');
        logger.info(`Submission data: submissionId=${submission.submissionId}, programStudi=${submission.programStudi}, institusi=${submission.institusi}`);
        
        websocketService.sendUploadProgress(userId, {
          stage: 'blockchain',
          progress: 95,
          message: 'Storing on blockchain...',
          details: { submissionId }
        });

        await fabricService.submitSubmission(submission, {
          mspOrg: actor.msp_org || submission.submittedByOrg
        });
        logger.info('Submission stored on blockchain successfully');
        
        websocketService.sendUploadProgress(userId, {
          stage: 'blockchain_complete',
          progress: 100,
          message: 'Submission stored on blockchain',
          details: { submissionId }
        });
      } catch (error) {
        logger.error('Blockchain storage failed:', error);
        
        websocketService.sendError(userId, {
          stage: 'blockchain',
          message: 'Blockchain storage failed',
          details: error.message
        });
      }
    });    // Return response with full submission data structure
    res.status(201).json({
      success: true,
      message: 'Documents uploaded and analyzed successfully',
      submission: {
        submissionId: submission.submissionId,
        id: submission.submissionId, // For compatibility
        programStudi: submission.programStudi,
        institusi: submission.institusi,
        programType: submission.programType,
        status: submission.status,
        version: submission.version,
        submittedBy: submission.submittedBy,
        submittedByRole: submission.submittedByRole,
        submittedByOrg: submission.submittedByOrg,
        documents: submission.documents.map(doc => ({
          type: doc.type,
          filename: doc.filename,
          cid: doc.cid,
          size: doc.size,
          verified: doc.verified,
          confidence: doc.confidence
        })),
        ai: submission.ai, // Include full AI data with scoring
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt
      }
    });

  } catch (error) {
    logger.error('Upload controller error:', error);
    next(error);
  }
};

/**
 * Get submission status
 */
const getSubmissionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info(`Fetching submission status: ${id}`);

    const submission = await fabricService.getSubmission(id);

    res.json({
      success: true,
      submission
    });

  } catch (error) {
    logger.error('Get submission error:', error);
    next(error);
  }
};

module.exports = {
  uploadDocuments,
  getSubmissionStatus
};
