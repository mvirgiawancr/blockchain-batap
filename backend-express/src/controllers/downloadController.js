/**
 * Document Download Controller
 * Handles encrypted document downloads from IPFS
 */

const pinataService = require('../services/pinataService');
const encryptionKeyService = require('../services/encryptionKeyService');
const fabricService = require('../services/fabricService');
const logger = require('../utils/logger');

/**
 * Download and decrypt document from IPFS
 */
const downloadDocument = async (req, res, next) => {
  try {
    const { submissionId, documentType } = req.params;

    logger.info(`Download request: ${submissionId} / ${documentType}`);

    // Validate document type
    if (!['LED', 'LKPS'].includes(documentType.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid document type',
        message: 'Document type must be LED or LKPS'
      });
    }

    // Get submission from blockchain
    const submission = await fabricService.getSubmission(submissionId);
    
    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found',
        message: `No submission found with ID: ${submissionId}`
      });
    }

    // Find document in submission
    const document = submission.documents?.find(
      doc => doc.type === documentType.toUpperCase()
    );

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: `No ${documentType} document found in this submission`
      });
    }

    // Check if CID exists (IPFS upload succeeded)
    if (!document.cid) {
      return res.status(400).json({
        error: 'IPFS upload failed',
        message: `Document ${documentType} was not uploaded to IPFS. CID is missing.`,
        hint: 'The document was validated but IPFS storage failed. Please re-upload the document.'
      });
    }

    const { cid, filename, encrypted } = document;

    logger.info(`Downloading ${documentType} from IPFS: ${cid} (encrypted: ${encrypted})`);

    let fileBuffer;

    if (encrypted) {
      // Get encryption key
      const keyData = await encryptionKeyService.getKey(
        submissionId,
        documentType.toUpperCase()
      );

      // Download and decrypt file
      fileBuffer = await pinataService.getFileDecrypted(
        cid,
        keyData.encryptionKey,
        keyData.iv
      );

      logger.info(`File decrypted successfully: ${filename}`);
    } else {
      // Download plain file
      fileBuffer = await pinataService.getFile(cid);
      
      logger.info(`File downloaded (plain): ${filename}`);
    }

    // Determine content type
    const contentType = documentType.toUpperCase() === 'LED' 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    // Send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    
    res.send(fileBuffer);

  } catch (error) {
    logger.error('Download failed:', error);
    next(error);
  }
};

/**
 * Get document info (without downloading)
 */
const getDocumentInfo = async (req, res, next) => {
  try {
    const { submissionId, documentType } = req.params;

    // Get submission from blockchain
    const submission = await fabricService.getSubmission(submissionId);
    
    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found'
      });
    }

    // Find document
    const document = submission.documents?.find(
      doc => doc.type === documentType.toUpperCase()
    );

    if (!document) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    // Check if encryption key exists
    const hasKey = await encryptionKeyService.hasKey(
      submissionId,
      documentType.toUpperCase()
    );

    res.json({
      submissionId,
      documentType: document.type,
      filename: document.filename,
      cid: document.cid,
      hash: document.hash,
      size: document.size,
      encrypted: document.encrypted || false,
      hasDecryptionKey: hasKey,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${document.cid}`,
      verified: document.verified,
      confidence: document.confidence
    });

  } catch (error) {
    logger.error('Get document info failed:', error);
    next(error);
  }
};

module.exports = {
  downloadDocument,
  getDocumentInfo
};
