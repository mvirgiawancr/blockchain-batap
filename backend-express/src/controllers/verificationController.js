/**
 * Verification Controller
 * Handles Phase 5: final Verification and Accreditation Decision
 * Writes to both PostgreSQL and Blockchain (Fabric)
 */

const logger = require('../utils/logger');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const fabricService = require('../services/fabricService');

/**
 * Get submissions pending verification (Status: completed)
 * Called by KEA / Sekretariat
 */
const getPendingVerifications = async (req, res, next) => {
    try {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    als.*,
                    ae.total_score as al_score,
                    ae.submitted_at as al_submitted_at
                FROM al_schedules als
                LEFT JOIN al_executions ae ON als.submission_id = ae.submission_id
                WHERE als.status = 'completed'
                ORDER BY ae.submitted_at ASC
            `);
            
            const data = await Promise.all(result.rows.map(async (row) => {
                let programStudi = 'N/A';
                let institusi = 'N/A';
                try {
                    let blockchainData = await fabricService.querySubmission(row.submission_id, { mspOrg: req.user?.msp_org || 'KEA' });
                    if (typeof blockchainData === 'string') blockchainData = JSON.parse(blockchainData);
                    programStudi = blockchainData.programStudi || 'N/A';
                    institusi = blockchainData.institusi || 'N/A';
                } catch (e) {
                    logger.warn(`Could not fetch blockchain data for ${row.submission_id}: ${e.message}`);
                }
                
                return {
                    ...row,
                    program_studi: programStudi,
                    institusi: institusi
                };
            }));

            res.json({ success: true, data });
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Get Pending Verifications error:', error);
        next(error);
    }
};

const getPendingDecisions = async (req, res, next) => {
    try {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    als.*,
                    vr.final_score as verified_score,
                    vr.recommended_rank,
                    vr.verified_at
                FROM al_schedules als
                JOIN verification_results vr ON als.submission_id = vr.submission_id
                WHERE als.status = 'verified'
                ORDER BY vr.verified_at ASC
            `);

            const data = await Promise.all(result.rows.map(async (row) => {
                let programStudi = 'N/A';
                let institusi = 'N/A';
                try {
                    let blockchainData = await fabricService.querySubmission(row.submission_id, { mspOrg: req.user?.msp_org || 'MajelisMSP' });
                    if (typeof blockchainData === 'string') blockchainData = JSON.parse(blockchainData);
                    programStudi = blockchainData.programStudi || 'N/A';
                    institusi = blockchainData.institusi || 'N/A';
                } catch (e) {
                    logger.warn(`Could not fetch blockchain data for ${row.submission_id}: ${e.message}`);
                }
                
                return {
                    ...row,
                    program_studi: programStudi,
                    institusi: institusi
                };
            }));

            res.json({ success: true, data });
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Get Pending Decisions error:', error);
        next(error);
    }
};

const verifyALResult = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { submissionId } = req.params;
        const { 
            notes, 
            scoreAdjustments, 
            finalScore,
            recommendedRank 
        } = req.body;
        const actor = req.user;

        logger.info(`Verifying AL Result for ${submissionId} by ${actor.username}`);

        await client.query('BEGIN');

        const verificationId = uuidv4();
        await client.query(`
            INSERT INTO verification_results
            (verification_id, submission_id, verified_by, verified_at, notes, score_adjustments, final_score, recommended_rank)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7)
            ON CONFLICT (submission_id) DO UPDATE SET
                verified_by = EXCLUDED.verified_by,
                verified_at = CURRENT_TIMESTAMP,
                notes = EXCLUDED.notes,
                score_adjustments = EXCLUDED.score_adjustments,
                final_score = EXCLUDED.final_score,
                recommended_rank = EXCLUDED.recommended_rank
        `, [
            verificationId,
            submissionId,
            actor.id,
            notes,
            JSON.stringify(scoreAdjustments || []),
            finalScore,
            recommendedRank
        ]);

        await client.query(`
            UPDATE al_schedules 
            SET status = 'verified', updated_at = CURRENT_TIMESTAMP
            WHERE submission_id = $1
        `, [submissionId]);

        await client.query('COMMIT');

        // === Write to Blockchain (graceful: if fails, PostgreSQL data is already committed) ===
        try {
            const mspOrg = actor.msp_org || 'SekretariatMSP';
            await fabricService.verifyALResult(submissionId, {
                verifiedBy: actor.username,
                notes: notes || '',
                scoreAdjustments: scoreAdjustments || [],
                finalScore,
                recommendedRank
            }, { mspOrg });
            logger.info(`[Blockchain] ✅ VerifyALResult recorded on-chain for ${submissionId}`);
        } catch (fabricError) {
            logger.warn(`[Blockchain] ⚠️ Failed to write VerifyALResult to blockchain (PostgreSQL OK): ${fabricError.message}`);
        }

        res.json({
            success: true,
            message: 'AL Result verified successfully',
            data: { verificationId, submissionId, verifiedAt: new Date(), finalScore, recommendedRank }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Verify AL Result error:', error);
        next(error);
    } finally {
        client.release();
    }
};

const finalizeAccreditation = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { submissionId } = req.params;
        const { 
            finalRank,
            finalScore,
            skNumber: manualSkNumber,
            skDate: manualSkDate,
            validUntil: manualValidUntil
        } = req.body;
        const actor = req.user;

        logger.info(`Finalizing Accreditation for ${submissionId} by ${actor.username}`);

        await client.query('BEGIN');

        // === Auto-generate SK Number if not provided ===
        let skNumber = manualSkNumber;
        if (!skNumber) {
            // Jika submission ini sudah pernah difinalisasi, pakai ulang SK-nya
            // (mencegah nomor bergeser & bentrok saat finalize diulang).
            const existingDecision = await client.query(
                `SELECT sk_number FROM accreditation_decisions WHERE submission_id = $1`,
                [submissionId]
            );
            if (existingDecision.rows[0]?.sk_number) {
                skNumber = existingDecision.rows[0].sk_number;
                logger.info(`[SK] Reusing existing SK Number: ${skNumber}`);
            } else {
                const year = new Date().getFullYear();
                // Mulai dari nomor urut tertinggi tahun ini + 1 (bukan COUNT, agar tahan
                // terhadap celah/penghapusan), lalu cari nomor pertama yang belum terpakai.
                const maxResult = await client.query(
                    `SELECT COALESCE(MAX(CAST(split_part(sk_number, '/', 4) AS INTEGER)), 0) AS maxseq
                     FROM accreditation_decisions
                     WHERE sk_number ~ $1`,
                    [`^SK/LAM-TEK/${year}/[0-9]+$`]
                );
                let seqNum = parseInt(maxResult.rows[0].maxseq, 10) + 1;
                // Jamin unik walau ada nomor manual/celah: naikkan sampai bebas.
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const candidate = `SK/LAM-TEK/${year}/${String(seqNum).padStart(3, '0')}`;
                    const dup = await client.query(
                        `SELECT 1 FROM accreditation_decisions WHERE sk_number = $1`,
                        [candidate]
                    );
                    if (dup.rowCount === 0) {
                        skNumber = candidate;
                        break;
                    }
                    seqNum++;
                }
                logger.info(`[SK] Auto-generated SK Number: ${skNumber}`);
            }
        }

        // Auto-set SK date to today if not provided
        const skDate = manualSkDate || new Date().toISOString().split('T')[0];

        // Auto-set valid until to 5 years from SK date if not provided
        const skDateObj = new Date(skDate);
        const defaultValidUntil = new Date(skDateObj);
        defaultValidUntil.setFullYear(defaultValidUntil.getFullYear() + 5);
        const validUntil = manualValidUntil || defaultValidUntil.toISOString().split('T')[0];

        const decisionId = uuidv4();
        await client.query(`
            INSERT INTO accreditation_decisions
            (decision_id, submission_id, final_rank, final_score, sk_number, sk_date, valid_until, decided_by, decided_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT (submission_id) DO UPDATE SET
                final_rank = EXCLUDED.final_rank,
                final_score = EXCLUDED.final_score,
                sk_number = EXCLUDED.sk_number,
                sk_date = EXCLUDED.sk_date,
                valid_until = EXCLUDED.valid_until,
                decided_by = EXCLUDED.decided_by,
                decided_at = CURRENT_TIMESTAMP
        `, [
            decisionId,
            submissionId,
            finalRank,
            finalScore,
            skNumber,
            skDate,
            validUntil,
            actor.id
        ]);

        await client.query(`
            UPDATE al_schedules 
            SET status = 'accredited', updated_at = CURRENT_TIMESTAMP
            WHERE submission_id = $1
        `, [submissionId]);

        await client.query('COMMIT');

        // === Write to Blockchain (graceful) ===
        try {
            const mspOrg = actor.msp_org || 'MajelisMSP';
            await fabricService.finalizeAccreditation(submissionId, {
                finalRank,
                finalScore,
                skNumber,
                skDate,
                validUntil,
                decidedBy: actor.username
            }, { mspOrg });
            logger.info(`[Blockchain] ✅ FinalizeAccreditation recorded on-chain for ${submissionId}`);
        } catch (fabricError) {
            logger.warn(`[Blockchain] ⚠️ Failed to write FinalizeAccreditation to blockchain (PostgreSQL OK): ${fabricError.message}`);
        }

        res.json({
            success: true,
            message: 'Accreditation decision finalized successfully',
            data: { decisionId, submissionId, finalRank, skNumber }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Finalize Accreditation error:', error);
        next(error);
    } finally {
        client.release();
    }
};

/**
 * Get already decided submissions (for Majelis dashboard)
 */
const getDecidedSubmissions = async (req, res, next) => {
    try {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    ad.submission_id,
                    ad.final_rank,
                    ad.final_score,
                    ad.sk_number,
                    ad.sk_date,
                    ad.valid_until,
                    ad.decided_at,
                    ad.certificate_cid,
                    c.file_cid as certificate_file_cid
                FROM accreditation_decisions ad
                LEFT JOIN certificates c ON ad.submission_id = c.submission_id
                ORDER BY ad.decided_at DESC
            `);

            const data = await Promise.all(result.rows.map(async (row) => {
                let programStudi = 'N/A';
                let institusi = 'N/A';
                try {
                    let blockchainData = await fabricService.querySubmission(row.submission_id, { mspOrg: req.user?.msp_org || 'MajelisMSP' });
                    if (typeof blockchainData === 'string') blockchainData = JSON.parse(blockchainData);
                    programStudi = blockchainData.programStudi || 'N/A';
                    institusi = blockchainData.institusi || 'N/A';
                } catch (e) {
                    logger.warn(`Could not fetch blockchain data for ${row.submission_id}: ${e.message}`);
                }
                
                return {
                    submission_id: row.submission_id,
                    final_rank: row.final_rank,
                    final_score: row.final_score,
                    sk_number: row.sk_number,
                    sk_date: row.sk_date,
                    valid_until: row.valid_until,
                    decided_at: row.decided_at,
                    certificate_cid: row.certificate_cid || row.certificate_file_cid,
                    program_studi: programStudi,
                    institusi: institusi
                };
            }));

            res.json({ success: true, data });
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Get Decided Submissions error:', error);
        next(error);
    }
};

module.exports = {
    getPendingVerifications,
    getPendingDecisions,
    getDecidedSubmissions,
    verifyALResult,
    finalizeAccreditation
};
