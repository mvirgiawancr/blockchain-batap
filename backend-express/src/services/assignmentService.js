const { query } = require('../config/database');

class AssignmentService {
  async assignAssessor(submissionId, assessorUserId, assignedBy, notes = null) {
    // Prevent overwrite when already accepted
    const existing = await this.getAssignment(submissionId);
    if (existing && existing.status === 'accepted' && existing.assessor_user_id !== assessorUserId) {
      throw new Error('Assignment already accepted. Assessor must reject before reassignment.');
    }

    const result = await query(
      `INSERT INTO submission_assignments (submission_id, assessor_user_id, assigned_by, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (submission_id) DO UPDATE SET
         assessor_user_id = EXCLUDED.assessor_user_id,
         assigned_by = EXCLUDED.assigned_by,
         notes = EXCLUDED.notes,
         status = 'pending',
         decision_notes = NULL,
         decided_at = NULL,
         decided_by = NULL,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [submissionId, assessorUserId, assignedBy, notes]
    );
    return result.rows[0];
  }

  async updateStatus(submissionId, status, decidedBy, decisionNotes = null) {
    const result = await query(
      `UPDATE submission_assignments
       SET status = $1,
           decided_by = $2,
           decision_notes = $3,
           decided_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE submission_id = $4
       RETURNING *`,
      [status, decidedBy, decisionNotes, submissionId]
    );
    return result.rows[0] || null;
  }

  async clearAssignment(submissionId) {
    const result = await query(
      'DELETE FROM submission_assignments WHERE submission_id = $1 RETURNING *',
      [submissionId]
    );
    return result.rows[0] || null;
  }

  async getAssignment(submissionId) {
    const result = await query(
      `SELECT sa.*, 
              au.username AS assessor_username,
              ab.username AS assigned_by_username
       FROM submission_assignments sa
       LEFT JOIN users au ON au.id = sa.assessor_user_id
       LEFT JOIN users ab ON ab.id = sa.assigned_by
       WHERE sa.submission_id = $1`,
      [submissionId]
    );
    return result.rows[0] || null;
  }

  async getAssignmentsBySubmissionIds(submissionIds = []) {
    if (!submissionIds.length) return {};
    const result = await query(
      `SELECT sa.*, 
              au.username AS assessor_username,
              au.name AS assessor_name,
              ab.username AS assigned_by_username
       FROM submission_assignments sa
       LEFT JOIN users au ON au.id = sa.assessor_user_id
       LEFT JOIN users ab ON ab.id = sa.assigned_by
       WHERE sa.submission_id = ANY($1::text[])`,
      [submissionIds]
    );
    const map = {};
    result.rows.forEach(row => {
      map[row.submission_id] = row;
    });
    return map;
  }
}

module.exports = new AssignmentService();
