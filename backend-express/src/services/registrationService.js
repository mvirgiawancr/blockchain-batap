/**
 * Registration Service
 *
 * UPPS self-registration workflow:
 * 1. submitRegistration — validate docs, insert request, send email
 * 2. listRequests — sekretariat lists pending requests
 * 3. getRequestDetail — get full request with prodi & docs
 * 4. approveRequest — create user, copy prodi, mark approved, send email
 * 5. rejectRequest — mark rejected with reason, generate resubmit token, send email
 * 6. resubmitRegistration — load rejected request via token, allow edits
 * 7. validateUsernameAvailable — check username uniqueness
 */

const { pool } = require('../config/database');
const documentValidationService = require('./documentValidationService');
const pinataService = require('./pinataService');
const emailService = require('./emailService');
const resubmitTokenService = require('./resubmitTokenService');
const bcrypt = require('bcrypt');

/**
 * Check if username is available (not in users or registration_requests)
 * @param {string} username
 * @returns {Promise<{available: boolean}>}
 */
async function validateUsernameAvailable(username) {
  if (!username || username.length < 3) {
    return { available: false };
  }

  const { rows } = await pool.query(
    `SELECT 1 FROM users WHERE username = $1
     UNION
     SELECT 1 FROM registration_requests WHERE username = $1
     LIMIT 1`,
    [username]
  );

  return { available: rows.length === 0 };
}

/**
 * Submit new UPPS registration request
 * @param {Object} data
 * @param {string} data.uppsName
 * @param {string} data.highestLeaderName
 * @param {string} data.accountPjName
 * @param {string} data.email
 * @param {string} data.phone
 * @param {number} data.institutionId
 * @param {string} data.username
 * @param {string} data.password
 * @param {Array<{jenjangCode: string, programStudiId: number, ketuaProdi: string, letakProdi: string}>} data.prodiList
 * @param {Array<{fileBuffer: Buffer, fileName: string, templateCode: string}>} data.documents
 * @param {string} [data.ipAddress]
 * @param {string} [data.userAgent]
 * @returns {Promise<{requestId: string, status: string}>}
 */
async function submitRegistration(data) {
  const {
    uppsName,
    highestLeaderName,
    accountPjName,
    email,
    phone,
    institutionId,
    username,
    password,
    prodiList = [],
    documents = [],
    ipAddress,
    userAgent,
  } = data;

  // Validate username availability
  const usernameCheck = await validateUsernameAvailable(username);
  if (!usernameCheck.available) {
    throw new Error('Username sudah digunakan');
  }

  // Validate all documents
  const docValidation = await documentValidationService.validateAll(
    documents.map((doc) => ({
      fileBuffer: doc.fileBuffer,
      fileName: doc.fileName,
      templateCode: doc.templateCode,
    })),
    { context: 'upps_registration' }
  );

  if (!docValidation.allValid) {
    const invalidDocs = docValidation.results
      .filter((r) => !r.isValid)
      .map((r) => r.fileName)
      .join(', ');
    throw new Error(`Dokumen tidak valid: ${invalidDocs}`);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert registration request
  const { rows: [request] } = await pool.query(
    `INSERT INTO registration_requests
     (upps_name, highest_leader_name, account_pj_name, email, phone, institution_id,
      username, password_hash, status, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
     RETURNING id`,
    [uppsName, highestLeaderName, accountPjName, email, phone, institutionId,
     username, passwordHash, ipAddress, userAgent]
  );

  const requestId = request.id;

  // Insert prodi entries
  for (const prodi of prodiList) {
    await pool.query(
      `INSERT INTO registration_request_prodi
       (request_id, jenjang_code, program_studi_id, ketua_prodi, letak_prodi)
       VALUES ($1, $2, $3, $4, $5)`,
      [requestId, prodi.jenjangCode, prodi.programStudiId, prodi.ketuaProdi, prodi.letakProdi]
    );
  }

  // Upload documents to Pinata and insert records
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const validation = docValidation.results[i];

    const uploadResult = await pinataService.uploadFile(
      doc.fileBuffer,
      doc.fileName,
      { requestId, templateCode: doc.templateCode }
    );

    await pool.query(
      `INSERT INTO registration_request_documents
       (request_id, template_code, file_name, file_hash, file_size_bytes,
        pinata_cid, pinata_url, similarity_score, threshold, is_valid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        requestId,
        doc.templateCode,
        doc.fileName,
        validation.fileHash || null,
        doc.fileBuffer.length,
        uploadResult.cid,
        uploadResult.url,
        validation.similarity,
        validation.threshold,
        validation.isValid,
      ]
    );
  }

  // Send confirmation email
  if (emailService.isConfigured()) {
    await emailService.sendRegistrationReceived({
      to: email,
      uppsName,
      requestId,
    });
  }

  return { requestId, status: 'pending' };
}

/**
 * List registration requests for sekretariat
 * @param {Object} opts
 * @param {string} [opts.status='pending']
 * @param {number} [opts.page=1]
 * @param {number} [opts.pageSize=20]
 * @returns {Promise<{requests: Array, total: number, page: number, pageSize: number}>}
 */
async function listRequests(opts = {}) {
  const { status = 'pending', page = 1, pageSize = 20 } = opts;
  const offset = (page - 1) * pageSize;

  const { rows } = await pool.query(
    `SELECT r.id, r.upps_name, r.email, r.username, r.status, r.created_at,
            i.name as institution_name
     FROM registration_requests r
     LEFT JOIN institutions i ON r.institution_id = i.id
     WHERE r.status = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [status, pageSize, offset]
  );

  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*) FROM registration_requests WHERE status = $1`,
    [status]
  );

  return {
    requests: rows,
    total: parseInt(count),
    page,
    pageSize,
  };
}

/**
 * Get detailed request with prodi & documents
 * @param {string} requestId
 * @returns {Promise<Object>}
 */
async function getRequestDetail(requestId) {
  const { rows: [request] } = await pool.query(
    `SELECT r.*, i.name as institution_name
     FROM registration_requests r
     LEFT JOIN institutions i ON r.institution_id = i.id
     WHERE r.id = $1`,
    [requestId]
  );

  if (!request) {
    throw new Error('Registration request not found');
  }

  const { rows: prodiList } = await pool.query(
    `SELECT rrp.jenjang_code, rrp.program_studi_id, ps.nama as program_studi_name,
            rrp.ketua_prodi, rrp.letak_prodi
     FROM registration_request_prodi rrp
     LEFT JOIN program_studi ps ON rrp.program_studi_id = ps.id
     WHERE rrp.request_id = $1`,
    [requestId]
  );

  const { rows: documents } = await pool.query(
    `SELECT template_code, file_name, pinata_cid, pinata_url,
            similarity_score, threshold, is_valid
     FROM registration_request_documents
     WHERE request_id = $1`,
    [requestId]
  );

  return {
    ...request,
    institution_name: request.institution_name,
    prodiList,
    documents,
  };
}

/**
 * Approve registration request — create user, copy prodi
 * @param {string} requestId
 * @param {string} reviewedBy — user UUID of sekretariat
 * @returns {Promise<{userId: string, username: string}>}
 */
async function approveRequest(requestId, reviewedBy) {
  // Get request
  const { rows: [request] } = await pool.query(
    `SELECT * FROM registration_requests WHERE id = $1 AND status = 'pending'`,
    [requestId]
  );

  if (!request) {
    throw new Error('Registration request not found or not pending');
  }

  // Create user
  const { rows: [user] } = await pool.query(
    `INSERT INTO users (username, password_hash, full_name, email, role)
     VALUES ($1, $2, $3, $4, 'upps')
     RETURNING id`,
    [request.username, request.password_hash, request.upps_name, request.email]
  );

  const userId = user.id;

  // Copy prodi to user_program_studi
  const { rows: prodiList } = await pool.query(
    `SELECT jenjang_code, program_studi_id, ketua_prodi, letak_prodi
     FROM registration_request_prodi
     WHERE request_id = $1`,
    [requestId]
  );

  for (const prodi of prodiList) {
    await pool.query(
      `INSERT INTO user_program_studi
       (user_id, jenjang_code, program_studi_id, ketua_prodi, letak_prodi)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, prodi.jenjang_code, prodi.program_studi_id, prodi.ketua_prodi, prodi.letak_prodi]
    );
  }

  // Mark request approved
  await pool.query(
    `UPDATE registration_requests
     SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(),
         approved_user_id = $3
     WHERE id = $1`,
    [requestId, reviewedBy, userId]
  );

  // Send approval email
  if (emailService.isConfigured()) {
    await emailService.sendApprovalNotification({
      to: request.email,
      uppsName: request.upps_name,
      username: request.username,
    });
  }

  return { userId, username: request.username };
}

/**
 * Reject registration request with reason
 * @param {string} requestId
 * @param {string} reviewedBy — user UUID of sekretariat
 * @param {string} reason
 * @returns {Promise<{resubmitUrl: string}>}
 */
async function rejectRequest(requestId, reviewedBy, reason) {
  const { rows: [request] } = await pool.query(
    `SELECT * FROM registration_requests WHERE id = $1 AND status = 'pending'`,
    [requestId]
  );

  if (!request) {
    throw new Error('Registration request not found or not pending');
  }

  // Mark rejected
  await pool.query(
    `UPDATE registration_requests
     SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(),
         rejection_reason = $3
     WHERE id = $1`,
    [requestId, reviewedBy, reason]
  );

  // Generate resubmit token
  const token = resubmitTokenService.issue({ requestId });
  const resubmitUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/registration/resubmit?token=${token}`;

  // Send rejection email with resubmit link
  if (emailService.isConfigured()) {
    await emailService.sendRejectionWithResubmitToken({
      to: request.email,
      uppsName: request.upps_name,
      reason,
      resubmitUrl,
    });
  }

  return { resubmitUrl };
}

/**
 * Load rejected request via resubmit token
 * @param {string} token
 * @returns {Promise<Object>}
 */
async function resubmitRegistration(token) {
  const payload = resubmitTokenService.verify(token);
  const requestId = payload.requestId;

  const { rows: [request] } = await pool.query(
    `SELECT * FROM registration_requests WHERE id = $1 AND status = 'rejected'`,
    [requestId]
  );

  if (!request) {
    throw new Error('Invalid resubmit token or request not rejected');
  }

  // Load prodi & documents for editing
  const { rows: prodiList } = await pool.query(
    `SELECT jenjang_code, program_studi_id, ketua_prodi, letak_prodi
     FROM registration_request_prodi
     WHERE request_id = $1`,
    [requestId]
  );

  const { rows: documents } = await pool.query(
    `SELECT template_code, file_name, pinata_cid, pinata_url, is_valid
     FROM registration_request_documents
     WHERE request_id = $1`,
    [requestId]
  );

  return {
    requestId,
    uppsName: request.upps_name,
    highestLeaderName: request.highest_leader_name,
    accountPjName: request.account_pj_name,
    email: request.email,
    phone: request.phone,
    institutionId: request.institution_id,
    username: request.username,
    rejectionReason: request.rejection_reason,
    prodiList,
    documents,
  };
}

module.exports = {
  validateUsernameAvailable,
  submitRegistration,
  listRequests,
  getRequestDetail,
  approveRequest,
  rejectRequest,
  resubmitRegistration,
};
