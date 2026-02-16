/**
 * AL Execution Controller
 * Handles Phase 4: Field Assessment (Asesmen Lapangan) and Responses
 * Uses PostgreSQL only (chaincode call disabled until upgrade)
 */

const logger = require('../utils/logger');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Submit Berita Acara (AL Execution)
 * Called by Assessor
 */
const submitALExecution = async (req, res, next) => {
    try {
        const { submissionId } = req.params;
        const { 
            beritaAcaraCid, 
            beritaAcaraHash, 
            attendanceValues, 
            findings, 
            scores, 
            totalScore 
        } = req.body;
        const actor = req.user;

        logger.info(`Submitting AL Execution for ${submissionId} by ${actor.username}`);

        if (!beritaAcaraCid) {
            return res.status(400).json({ error: 'Berita Acara document is required' });
        }

        const executionId = `EXEC-${uuidv4().substring(0, 8)}`;

        const client = await pool.connect();
        try {
            const result = await client.query(`
                INSERT INTO al_executions 
                (execution_id, submission_id, berita_acara_cid, berita_acara_hash, 
                 attendance_values, findings, scores, total_score, submitted_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (submission_id) DO UPDATE SET
                    berita_acara_cid = EXCLUDED.berita_acara_cid,
                    berita_acara_hash = EXCLUDED.berita_acara_hash,
                    attendance_values = EXCLUDED.attendance_values,
                    findings = EXCLUDED.findings,
                    scores = EXCLUDED.scores,
                    total_score = EXCLUDED.total_score,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [
                executionId,
                submissionId,
                beritaAcaraCid,
                beritaAcaraHash || null,
                JSON.stringify(attendanceValues || {}),
                JSON.stringify(findings || []),
                JSON.stringify(scores || {}),
                totalScore || 0,
                actor.id
            ]);

            // Update AL schedule status to 'completed' if exists
            await client.query(`
                UPDATE al_schedules SET status = 'completed', updated_at = CURRENT_TIMESTAMP
                WHERE submission_id = $1 AND status = 'approved'
            `, [submissionId]);

            logger.info(`AL Execution submitted for ${submissionId}`);
            res.json({
                success: true,
                message: 'Berita Acara AL berhasil disubmit!',
                data: result.rows[0]
            });
        } finally {
            client.release();
        }

    } catch (error) {
        logger.error('Submit AL Execution error:', error);
        res.status(500).json({ error: 'Failed to submit AL execution', message: error.message });
    }
};

/**
 * Submit UPPS Response to Findings
 * Called by UPPS
 */
const submitUPPSResponse = async (req, res, next) => {
    try {
        const { submissionId } = req.params;
        const { 
            responseHash, 
            responseCid, 
            notes 
        } = req.body;
        const actor = req.user;

        logger.info(`Submitting UPPS Response for ${submissionId} by ${actor.username}`);

        const responseId = `RESP-${uuidv4().substring(0, 8)}`;

        const client = await pool.connect();
        try {
            // Get execution_id for this submission
            const execResult = await client.query(
                'SELECT execution_id FROM al_executions WHERE submission_id = $1 LIMIT 1',
                [submissionId]
            );

            const executionId = execResult.rows[0]?.execution_id || null;

            const result = await client.query(`
                INSERT INTO al_responses
                (response_id, submission_id, execution_id, response_hash, response_cid, notes, responded_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (submission_id) DO UPDATE SET
                    response_hash = EXCLUDED.response_hash,
                    response_cid = EXCLUDED.response_cid,
                    notes = EXCLUDED.notes,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [
                responseId,
                submissionId,
                executionId,
                responseHash || null,
                responseCid || null,
                notes || '',
                actor.id
            ]);

            logger.info(`UPPS Response submitted for ${submissionId}`);
            res.json({
                success: true,
                message: 'Tanggapan UPPS berhasil disubmit!',
                data: result.rows[0]
            });
        } finally {
            client.release();
        }

    } catch (error) {
        logger.error('Submit UPPS Response error:', error);
        res.status(500).json({ error: 'Failed to submit UPPS response', message: error.message });
    }
};

/**
 * Get AL Execution Details for a submission
 */
const getALDetails = async (req, res, next) => {
    try {
        const { submissionId } = req.params;
        
        const client = await pool.connect();
        try {
            // Get execution data
            const execResult = await client.query(
                'SELECT * FROM al_executions WHERE submission_id = $1 LIMIT 1',
                [submissionId]
            );

            // Get response data
            const respResult = await client.query(
                'SELECT * FROM al_responses WHERE submission_id = $1 LIMIT 1',
                [submissionId]
            );

            // Get schedule data
            const schedResult = await client.query(
                'SELECT * FROM al_schedules WHERE submission_id = $1 LIMIT 1',
                [submissionId]
            );

            const execution = execResult.rows[0] || null;
            const response = respResult.rows[0] || null;
            const schedule = schedResult.rows[0] || null;

            // Try to get submission details from blockchain
            let submission = null;
            try {
                const fabricService = require('../services/fabricService');
                submission = await fabricService.getSubmission(submissionId);
            } catch (e) {
                logger.warn(`Could not fetch submission from blockchain: ${e.message}`);
            }

            res.json({
                success: true,
                data: {
                    submissionId,
                    programStudi: submission?.programStudi || 'N/A',
                    institusi: submission?.institusi || 'N/A',
                    status: submission?.status || schedule?.status || 'unknown',
                    alSchedule: schedule,
                    alExecution: execution ? {
                        ...execution,
                        findings: execution.findings || [],
                        scores: execution.scores || {},
                        attendanceValues: execution.attendance_values || {}
                    } : null,
                    alResponse: response
                }
            });
        } finally {
            client.release();
        }

    } catch (error) {
        logger.error('Get AL Details error:', error);
        res.status(500).json({ error: 'Failed to get AL details', message: error.message });
    }
};

module.exports = {
    submitALExecution,
    submitUPPSResponse,
    getALDetails
};
