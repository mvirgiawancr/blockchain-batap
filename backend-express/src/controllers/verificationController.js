/**
 * Verification Controller
 * Handles Phase 5: final Verification and Accreditation Decision
 * Re-implemented to use PostgreSQL only (Bypassing Fabric for now to ensure demo stability)
 */

const logger = require('../utils/logger');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

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
                    s.program_studi,
                    s.institution as institusi,
                    ae.total_score as al_score,
                    ae.submitted_at as al_submitted_at
                FROM al_schedules als
                JOIN users s ON als.proposed_by = s.id
                LEFT JOIN submission_metadata sm ON als.submission_id = sm.submission_id
                LEFT JOIN al_executions ae ON als.submission_id = ae.submission_id
                WHERE als.status = 'completed'
                ORDER BY ae.submitted_at ASC
            `);
            res.json({ success: true, data: result.rows });
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
                    s.program_studi,
                    s.institution as institusi,
                    vr.final_score as verified_score,
                    vr.recommended_rank,
                    vr.verified_at
                FROM al_schedules als
                JOIN users s ON als.proposed_by = s.id
                LEFT JOIN submission_metadata sm ON als.submission_id = sm.submission_id
                JOIN verification_results vr ON als.submission_id = vr.submission_id
                WHERE als.status = 'verified'
                ORDER BY vr.verified_at ASC
            `);
            res.json({ success: true, data: result.rows });
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
            skNumber,
            skDate,
            validUntil
        } = req.body;
        const actor = req.user;

        logger.info(`Finalizing Accreditation for ${submissionId} by ${actor.username}`);

        await client.query('BEGIN');

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

module.exports = {
    getPendingVerifications,
    getPendingDecisions,
    verifyALResult,
    finalizeAccreditation
};
