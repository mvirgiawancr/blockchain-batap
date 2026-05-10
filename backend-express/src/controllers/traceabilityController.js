/**
 * Traceability Controller
 * Public API for searching and verifying accreditation certificates
 * Reads from both PostgreSQL and Blockchain for full traceability
 */

const logger = require('../utils/logger');
const { pool } = require('../config/database');
const fabricService = require('../services/fabricService');

/**
 * Search accreditation by SK number, institution name, or submission ID
 * PUBLIC endpoint — no auth required
 */
const searchAccreditation = async (req, res, next) => {
    try {
        const { q, type } = req.query; // q = search query, type = 'sk' | 'institution' | 'submission'
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Query minimal 2 karakter' });
        }

        const searchQuery = q.trim();
        const client = await pool.connect();
        
        try {
            let result;
            
            if (type === 'sk') {
                // Search by SK Number
                result = await client.query(`
                    SELECT 
                        ad.submission_id,
                        ad.final_rank,
                        ad.final_score,
                        ad.sk_number,
                        ad.sk_date,
                        ad.valid_until,
                        ad.decided_at,
                        ad.certificate_cid,
                        c.file_cid as certificate_file_cid,
                        c.generated_at as certificate_generated_at,
                        als.proposed_venue,
                        als.status as schedule_status
                    FROM accreditation_decisions ad
                    LEFT JOIN certificates c ON ad.submission_id = c.submission_id
                    LEFT JOIN al_schedules als ON ad.submission_id = als.submission_id
                    WHERE ad.sk_number ILIKE $1
                    ORDER BY ad.decided_at DESC
                `, [`%${searchQuery}%`]);
            } else if (type === 'institution') {
                // Search by institution name via blockchain query
                result = await client.query(`
                    SELECT 
                        ad.submission_id,
                        ad.final_rank,
                        ad.final_score,
                        ad.sk_number,
                        ad.sk_date,
                        ad.valid_until,
                        ad.decided_at,
                        ad.certificate_cid,
                        c.file_cid as certificate_file_cid,
                        c.generated_at as certificate_generated_at,
                        als.proposed_venue,
                        als.status as schedule_status
                    FROM accreditation_decisions ad
                    LEFT JOIN certificates c ON ad.submission_id = c.submission_id
                    LEFT JOIN al_schedules als ON ad.submission_id = als.submission_id
                    WHERE ad.submission_id IN (
                        SELECT sm.submission_id FROM submission_metadata sm
                        JOIN users u ON sm.user_id = u.id
                        WHERE u.institution ILIKE $1 OR u.program_studi ILIKE $1
                    )
                    ORDER BY ad.decided_at DESC
                `, [`%${searchQuery}%`]);
            } else {
                // Search by submission ID
                result = await client.query(`
                    SELECT 
                        ad.submission_id,
                        ad.final_rank,
                        ad.final_score,
                        ad.sk_number,
                        ad.sk_date,
                        ad.valid_until,
                        ad.decided_at,
                        ad.certificate_cid,
                        c.file_cid as certificate_file_cid,
                        c.generated_at as certificate_generated_at,
                        als.proposed_venue,
                        als.status as schedule_status
                    FROM accreditation_decisions ad
                    LEFT JOIN certificates c ON ad.submission_id = c.submission_id
                    LEFT JOIN al_schedules als ON ad.submission_id = als.submission_id
                    WHERE ad.submission_id ILIKE $1
                    ORDER BY ad.decided_at DESC
                `, [`%${searchQuery}%`]);
            }

            // Enrich with blockchain data
            const enrichedResults = [];
            for (const row of result.rows) {
                let blockchainData = null;
                try {
                    blockchainData = await fabricService.querySubmission(row.submission_id);
                    if (typeof blockchainData === 'string') {
                        blockchainData = JSON.parse(blockchainData);
                    }
                } catch (e) {
                    logger.warn(`Could not fetch blockchain data for ${row.submission_id}: ${e.message}`);
                }

                enrichedResults.push({
                    submissionId: row.submission_id,
                    programStudi: blockchainData?.programStudi || 'N/A',
                    institusi: blockchainData?.institusi || 'N/A',
                    jenjang: blockchainData?.jenjang || 'N/A',
                    finalRank: row.final_rank,
                    finalScore: row.final_score,
                    skNumber: row.sk_number,
                    skDate: row.sk_date,
                    validUntil: row.valid_until,
                    decidedAt: row.decided_at,
                    certificateCid: row.certificate_cid || row.certificate_file_cid,
                    certificateGeneratedAt: row.certificate_generated_at,
                    status: row.schedule_status
                });
            }

            res.json({ 
                success: true, 
                count: enrichedResults.length,
                data: enrichedResults 
            });
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Search Accreditation error:', error);
        next(error);
    }
};

/**
 * Get blockchain history for a submission
 * PUBLIC endpoint — shows full audit trail from blockchain
 */
const getBlockchainHistory = async (req, res, next) => {
    try {
        const { submissionId } = req.params;

        // Get blockchain transaction history
        let history = [];
        try {
            const rawHistory = await fabricService.getSubmissionHistory(submissionId);
            history = typeof rawHistory === 'string' ? JSON.parse(rawHistory) : rawHistory;
        } catch (e) {
            logger.warn(`Could not fetch blockchain history for ${submissionId}: ${e.message}`);
        }

        // Get current on-chain state
        let currentState = null;
        try {
            const raw = await fabricService.querySubmission(submissionId);
            currentState = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
            logger.warn(`Could not fetch current state for ${submissionId}: ${e.message}`);
        }

        // Get PostgreSQL decision data
        const client = await pool.connect();
        let pgData = null;
        try {
            const result = await client.query(`
                SELECT 
                    ad.*,
                    c.file_cid as certificate_file_cid,
                    c.generated_at as certificate_generated_at,
                    u.name as decided_by_name
                FROM accreditation_decisions ad
                LEFT JOIN certificates c ON ad.submission_id = c.submission_id
                LEFT JOIN users u ON ad.decided_by = u.id
                WHERE ad.submission_id = $1
            `, [submissionId]);
            pgData = result.rows[0] || null;
        } finally {
            client.release();
        }

        res.json({
            success: true,
            data: {
                submissionId,
                currentState: currentState ? {
                    status: currentState.status,
                    programStudi: currentState.programStudi,
                    institusi: currentState.institusi,
                    jenjang: currentState.jenjang,
                    createdAt: currentState.createdAt,
                    updatedAt: currentState.updatedAt,
                    accreditationDecision: currentState.accreditationDecision || null,
                    verificationResult: currentState.verificationResult || null
                } : null,
                decision: pgData ? {
                    finalRank: pgData.final_rank,
                    finalScore: pgData.final_score,
                    skNumber: pgData.sk_number,
                    skDate: pgData.sk_date,
                    validUntil: pgData.valid_until,
                    decidedBy: pgData.decided_by_name,
                    decidedAt: pgData.decided_at,
                    certificateCid: pgData.certificate_cid || pgData.certificate_file_cid,
                    certificateGeneratedAt: pgData.certificate_generated_at
                } : null,
                blockchainHistory: Array.isArray(history) ? history.map((h, idx) => ({
                    index: idx,
                    txId: h.txId,
                    timestamp: h.timestamp,
                    isDelete: h.isDelete,
                    status: h.value?.status,
                    updatedBy: h.value?.updatedBy,
                    updatedByMsp: h.value?.updatedByMsp
                })) : []
            }
        });
    } catch (error) {
        logger.error('Get Blockchain History error:', error);
        next(error);
    }
};

/**
 * Get accreditation detail for UPPS (includes certificate info)
 * Authenticated endpoint
 */
const getAccreditationDetail = async (req, res, next) => {
    try {
        const { submissionId } = req.params;
        const client = await pool.connect();
        
        try {
            // Get decision + certificate
            const result = await client.query(`
                SELECT 
                    ad.final_rank,
                    ad.final_score,
                    ad.sk_number,
                    ad.sk_date,
                    ad.valid_until,
                    ad.decided_at,
                    ad.certificate_cid,
                    c.file_cid as certificate_file_cid,
                    c.certificate_id,
                    c.generated_at as certificate_generated_at,
                    vr.recommended_rank,
                    vr.final_score as verified_score,
                    vr.verified_at,
                    als.status as schedule_status
                FROM accreditation_decisions ad
                LEFT JOIN certificates c ON ad.submission_id = c.submission_id
                LEFT JOIN verification_results vr ON ad.submission_id = vr.submission_id
                LEFT JOIN al_schedules als ON ad.submission_id = als.submission_id
                WHERE ad.submission_id = $1
            `, [submissionId]);

            if (result.rows.length === 0) {
                return res.json({ success: true, data: null });
            }

            const row = result.rows[0];
            res.json({
                success: true,
                data: {
                    finalRank: row.final_rank,
                    finalScore: row.final_score,
                    skNumber: row.sk_number,
                    skDate: row.sk_date,
                    validUntil: row.valid_until,
                    decidedAt: row.decided_at,
                    certificateCid: row.certificate_cid || row.certificate_file_cid,
                    certificateId: row.certificate_id,
                    certificateGeneratedAt: row.certificate_generated_at,
                    verifiedScore: row.verified_score,
                    recommendedRank: row.recommended_rank,
                    verifiedAt: row.verified_at,
                    status: row.schedule_status
                }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Get Accreditation Detail error:', error);
        next(error);
    }
};

module.exports = {
    searchAccreditation,
    getBlockchainHistory,
    getAccreditationDetail
};
