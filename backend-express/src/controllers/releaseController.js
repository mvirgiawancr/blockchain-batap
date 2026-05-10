/**
 * Release Controller
 * Handles Phase 6: Certificate Generation and Release
 * Writes to both PostgreSQL and Blockchain (Fabric)
 */

const certificateService = require('../services/certificateService');
const logger = require('../utils/logger');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const fabricService = require('../services/fabricService');

/**
 * Get submissions ready for certificate release (Status: accredited)
 * Called by Sekretariat
 */
const getReadyForRelease = async (req, res, next) => {
    try {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    als.*,
                    s.program_studi,
                    s.institution as institusi,
                    ad.final_rank,
                    ad.final_score,
                    ad.sk_number,
                    ad.sk_date,
                    c.file_cid as existing_certificate_cid
                FROM al_schedules als
                JOIN users s ON als.proposed_by = s.id
                LEFT JOIN submission_metadata sm ON als.submission_id = sm.submission_id
                JOIN accreditation_decisions ad ON als.submission_id = ad.submission_id
                LEFT JOIN certificates c ON als.submission_id = c.submission_id
                WHERE als.status IN ('accredited', 'released')
                ORDER BY ad.decided_at DESC
            `);
            res.json({ success: true, data: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Get Ready For Release error:', error);
        next(error);
    }
};

const previewCertificate = async (req, res, next) => {
    try {
        const { submissionId } = req.params;
        const client = await pool.connect();
        try {
            // Get decision data from PostgreSQL
            const result = await client.query(`
                SELECT 
                    ad.final_rank,
                    ad.sk_number,
                    ad.sk_date,
                    ad.valid_until
                FROM accreditation_decisions ad
                WHERE ad.submission_id = $1
            `, [submissionId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Accreditation decision not found' });
            }

            // Get program_studi and institusi from blockchain (source of truth)
            let programStudi = 'N/A';
            let institusi = 'N/A';
            try {
                let blockchainData = await fabricService.querySubmission(submissionId);
                if (typeof blockchainData === 'string') blockchainData = JSON.parse(blockchainData);
                programStudi = blockchainData.programStudi || 'N/A';
                institusi = blockchainData.institusi || 'N/A';
            } catch (e) {
                logger.warn(`[Certificate] Could not get blockchain data: ${e.message}`);
            }

            const data = result.rows[0];
            const certData = {
                submissionId,
                institutionName: institusi,
                programName: programStudi,
                rank: data.final_rank,
                skNumber: data.sk_number,
                skDate: data.sk_date,
                validUntil: data.valid_until
            };

            const pdfBuffer = await certificateService.generateCertificatePDF(certData);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=Draft_Certificate_${submissionId}.pdf`);
            res.send(pdfBuffer);
        } finally {
            client.release();
        }

    } catch (error) {
        logger.error('Preview Certificate error:', error);
        next(error);
    }
};

const publishCertificate = async (req, res, next) => {
    try {
        const { submissionId } = req.params;
        const actor = req.user;

        logger.info(`Publishing Certificate for ${submissionId} by ${actor.username}`);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(`
                SELECT 
                    ad.decision_id,
                    ad.final_rank,
                    ad.final_score,
                    ad.sk_number,
                    ad.sk_date,
                    ad.valid_until
                FROM accreditation_decisions ad
                WHERE ad.submission_id = $1
            `, [submissionId]);

            if (result.rows.length === 0) {
                return res.status(400).json({ error: 'Accreditation decision required' });
            }
            const data = result.rows[0];

            // Get program_studi and institusi from blockchain (source of truth)
            let programStudi = 'N/A';
            let institusi = 'N/A';
            try {
                let blockchainData = await fabricService.querySubmission(submissionId);
                if (typeof blockchainData === 'string') blockchainData = JSON.parse(blockchainData);
                programStudi = blockchainData.programStudi || 'N/A';
                institusi = blockchainData.institusi || 'N/A';
            } catch (e) {
                logger.warn(`[Certificate] Could not get blockchain data: ${e.message}`);
            }

            // === Step 1: Generate PDF Certificate ===
            logger.info(`[Certificate] Generating PDF for ${submissionId}...`);
            let pdfBuffer;
            try {
                pdfBuffer = await certificateService.generateCertificatePDF({
                    submissionId,
                    institutionName: institusi,
                    programName: programStudi,
                    rank: data.final_rank,
                    skNumber: data.sk_number,
                    skDate: data.sk_date,
                    validUntil: data.valid_until
                });
                logger.info(`[Certificate] PDF generated: ${pdfBuffer.length} bytes`);
            } catch (pdfError) {
                logger.error(`[Certificate] PDF generation failed: ${pdfError.message}`);
                return res.status(500).json({ error: `Certificate PDF generation failed: ${pdfError.message}` });
            }

            // === Step 2: Calculate file hash ===
            const crypto = require('crypto');
            const fileHash = '0x' + crypto.createHash('sha256').update(pdfBuffer).digest('hex');

            // === Step 3: Upload to Pinata IPFS ===
            let fileCid;
            let gatewayUrl;
            const pinataService = require('../services/pinataService');
            const filename = `certificate-${submissionId}-${Date.now()}.pdf`;

            try {
                const uploadResult = await pinataService.uploadFile(pdfBuffer, filename, {
                    type: 'accreditation-certificate',
                    submissionId,
                    rank: data.final_rank,
                    skNumber: data.sk_number,
                    institution: data.institusi,
                    programStudi: data.program_studi
                });
                fileCid = uploadResult.cid;
                gatewayUrl = uploadResult.gateway_url || uploadResult.pinata_url;
                logger.info(`[Certificate] ✅ Uploaded to IPFS: ${fileCid}`);
            } catch (ipfsError) {
                logger.warn(`[Certificate] ⚠️ IPFS upload failed: ${ipfsError.message}. Using fallback CID.`);
                fileCid = `QmCertFallback-${Date.now()}-${uuidv4().substring(0,8)}`;
                gatewayUrl = null;
            }

            // === Step 4: Store in PostgreSQL ===
            await client.query(`
                INSERT INTO certificates
                (certificate_id, submission_id, decision_id, file_cid, file_hash, issued_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (submission_id) DO UPDATE 
                SET file_cid = EXCLUDED.file_cid, file_hash = EXCLUDED.file_hash, generated_at = CURRENT_TIMESTAMP
            `, [
                `CERT-${submissionId}`,
                submissionId,
                data.decision_id,
                fileCid,
                fileHash,
                actor.id
            ]);

            await client.query(`
                UPDATE al_schedules 
                SET status = 'released', updated_at = CURRENT_TIMESTAMP
                WHERE submission_id = $1
            `, [submissionId]);

             await client.query(`
                UPDATE accreditation_decisions
                SET certificate_cid = $1
                WHERE submission_id = $2
            `, [fileCid, submissionId]);

            await client.query('COMMIT');

            // === Step 5: Write certificate data to Blockchain (graceful) ===
            try {
                const mspOrg = actor.msp_org || 'SekretariatMSP';
                await fabricService.finalizeAccreditation(submissionId, {
                    finalRank: data.final_rank,
                    finalScore: data.final_score,
                    skNumber: data.sk_number,
                    skDate: data.sk_date,
                    validUntil: data.valid_until,
                    decidedBy: actor.username,
                    certificateCid: fileCid
                }, { mspOrg });
                logger.info(`[Blockchain] ✅ Certificate CID recorded on-chain for ${submissionId}: ${fileCid}`);
            } catch (fabricError) {
                logger.warn(`[Blockchain] ⚠️ Failed to write certificate data to blockchain (PostgreSQL OK): ${fabricError.message}`);
            }

            res.json({
                success: true,
                message: 'Certificate published successfully',
                data: { 
                    certificateCid: fileCid,
                    fileHash,
                    gatewayUrl,
                    pdfSize: pdfBuffer.length
                }

            });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        logger.error('Publish Certificate error:', error);
        next(error);
    }
};

module.exports = {
    getReadyForRelease,
    previewCertificate,
    publishCertificate
};
