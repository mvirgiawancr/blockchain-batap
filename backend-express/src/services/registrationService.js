const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const documentValidationService = require('./documentValidationService');
const pinataService = require('./pinataService');
const emailService = require('./emailService');
const resubmitTokenService = require('./resubmitTokenService');
const config = require('../config');

const SALT_ROUNDS = 10;

async function validateUsernameAvailable(username) {
  const { rows } = await pool.query(
    `SELECT 1 FROM users WHERE username = $1
     UNION ALL
     SELECT 1 FROM registration_requests
     WHERE username = $1 AND status IN ('pending','approved')
     LIMIT 1`,
    [username],
  );
  return { available: rows.length === 0 };
}

async function _uploadDocToPinata(fileBuffer, fileName, requestId, templateCode) {
  const result = await pinataService.uploadFile(fileBuffer, fileName, {
    requestId,
    templateCode,
    uploadedAt: new Date().toISOString(),
  });
  if (!result || !result.cid) {
    throw new Error(`Pinata upload failed for ${templateCode}`);
  }
  return {
    cid: result.cid,
    url: result.pinata_url || `https://${config.pinata.gateway}/ipfs/${result.cid}`,
  };
}

async function submitRegistration(params) {
  const {
    uppsName, highestLeaderName, accountPjName, email, phone,
    institutionId, username, password,
    prodiList,
    documents: { suratPermohonan, suratPernyataan },
    ipAddress, userAgent,
  } = params;

  const docResults = await documentValidationService.validateAll(
    [
      { fileBuffer: suratPermohonan.buffer, fileName: suratPermohonan.originalname, templateCode: 'surat_permohonan_akun' },
      { fileBuffer: suratPernyataan.buffer, fileName: suratPernyataan.originalname, templateCode: 'surat_pernyataan_upps' },
    ],
    { context: 'upps_registration' },
  );
  if (!docResults.allValid) {
    const err = new Error('Document validation failed');
    err.code = 'DOCS_INVALID';
    err.details = docResults.results;
    throw err;
  }

  const { available } = await validateUsernameAvailable(username);
  if (!available) {
    const err = new Error('Username already taken');
    err.code = 'USERNAME_TAKEN';
    throw err;
  }

  const client = await pool.connect();
  let requestRow;
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await client.query(
      `INSERT INTO registration_requests
        (upps_name, highest_leader_name, account_pj_name, email, phone,
         institution_id, username, password_hash, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [uppsName, highestLeaderName, accountPjName, email, phone || null,
       institutionId, username, passwordHash, ipAddress || null, userAgent || null],
    );
    const requestId = rows[0].id;
    requestRow = rows[0];

    for (const p of prodiList) {
      await client.query(
        `INSERT INTO registration_request_prodi
          (request_id, jenjang_code, program_studi_id, ketua_prodi, letak_prodi)
         VALUES ($1,$2,$3,$4,$5)`,
        [requestId, p.jenjangCode, p.programStudiId, p.ketuaProdi, p.letakProdi || null],
      );
    }

    const [permohonanPinata, pernyataanPinata] = await Promise.all([
      _uploadDocToPinata(suratPermohonan.buffer, suratPermohonan.originalname, requestId, 'surat_permohonan_akun'),
      _uploadDocToPinata(suratPernyataan.buffer, suratPernyataan.originalname, requestId, 'surat_pernyataan_upps'),
    ]);

    const docRows = [
      { templateCode: 'surat_permohonan_akun', file: suratPermohonan, pinata: permohonanPinata, validation: docResults.results[0] },
      { templateCode: 'surat_pernyataan_upps', file: suratPernyataan, pinata: pernyataanPinata, validation: docResults.results[1] },
    ];

    for (const d of docRows) {
      await client.query(
        `INSERT INTO registration_request_documents
          (request_id, template_code, file_name, file_hash, file_size_bytes,
           pinata_cid, pinata_url, similarity_score, threshold, is_valid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [requestId, d.templateCode, d.file.originalname,
         require('crypto').createHash('sha256').update(d.file.buffer).digest('hex'),
         d.file.size, d.pinata.cid, d.pinata.url,
         d.validation.similarity, d.validation.threshold, d.validation.isValid],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  emailService.sendRegistrationReceived({
    to: email, uppsName, requestId: requestRow.id,
  }).catch((e) => console.error('[Registration] email failed:', e.message));

  return { requestId: requestRow.id };
}

async function listRequests({ status, limit = 50, offset = 0 } = {}) {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE r.status = $${params.length}`;
  }
  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT r.id, r.upps_name, r.highest_leader_name, r.account_pj_name,
            r.email, r.phone, r.username, r.status, r.rejection_reason,
            r.created_at, r.reviewed_at,
            i.name AS institution_name
     FROM registration_requests r
     JOIN institutions i ON i.id = r.institution_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return rows;
}

async function getRequestDetail(requestId) {
  const { rows } = await pool.query(
    `SELECT r.*, i.name AS institution_name
     FROM registration_requests r
     JOIN institutions i ON i.id = r.institution_id
     WHERE r.id = $1`,
    [requestId],
  );
  if (rows.length === 0) return null;
  const req = rows[0];

  const [prodiRows, docRows] = await Promise.all([
    pool.query(
      `SELECT p.*, j.label AS jenjang_label, ps.name AS program_studi_name
       FROM registration_request_prodi p
       JOIN jenjang j ON j.code = p.jenjang_code
       JOIN program_studi ps ON ps.id = p.program_studi_id
       WHERE p.request_id = $1`,
      [requestId],
    ),
    pool.query(
      `SELECT * FROM registration_request_documents WHERE request_id = $1`,
      [requestId],
    ),
  ]);

  return { ...req, prodi: prodiRows.rows, documents: docRows.rows };
}

async function approveRequest(requestId, sekretariatUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT * FROM registration_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [requestId],
    );
    if (rows.length === 0) {
      const err = new Error('Request not found or not pending');
      err.code = 'NOT_PENDING';
      throw err;
    }
    const req = rows[0];

    const userResult = await client.query(
      `INSERT INTO users
        (username, password_hash, role, name, msp_org, email, phone,
         institution_id, is_active)
       VALUES ($1,$2,'upps',$3,'UPPSMSP',$4,$5,$6,TRUE)
       RETURNING id`,
      [req.username, req.password_hash, req.upps_name, req.email, req.phone, req.institution_id],
    );
    const newUserId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO upps
        (user_id, upps_name, highest_leader_name, account_pj_name,
         email, phone, institution_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [newUserId, req.upps_name, req.highest_leader_name, req.account_pj_name,
       req.email, req.phone, req.institution_id],
    );

    await client.query(
      `INSERT INTO user_program_studi
        (user_id, jenjang_code, program_studi_id, ketua_prodi, letak_prodi, is_primary)
       SELECT $1, jenjang_code, program_studi_id, ketua_prodi, letak_prodi,
              (row_number() OVER () = 1)
       FROM registration_request_prodi
       WHERE request_id = $2`,
      [newUserId, requestId],
    );

    await client.query(
      `UPDATE registration_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(),
           approved_user_id = $2
       WHERE id = $3`,
      [sekretariatUserId, newUserId, requestId],
    );

    await client.query('COMMIT');

    emailService.sendApprovalNotification({
      to: req.email, uppsName: req.upps_name, username: req.username,
    }).catch((e) => console.error('[Registration] approval email failed:', e.message));

    return { userId: newUserId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function rejectRequest(requestId, sekretariatUserId, reason, resubmitBaseUrl) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM registration_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [requestId],
    );
    if (rows.length === 0) {
      const err = new Error('Request not found or not pending');
      err.code = 'NOT_PENDING';
      throw err;
    }
    const req = rows[0];

    await client.query(
      `UPDATE registration_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
           rejection_reason = $2
       WHERE id = $3`,
      [sekretariatUserId, reason, requestId],
    );
    await client.query('COMMIT');

    const token = resubmitTokenService.issue({ requestId, email: req.email });
    const resubmitUrl = `${resubmitBaseUrl}/register-upps?resubmit=${token}`;
    emailService.sendRejectionWithResubmitToken({
      to: req.email, uppsName: req.upps_name, reason, resubmitUrl,
    }).catch((e) => console.error('[Registration] rejection email failed:', e.message));

    return { resubmitUrl };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function resubmitRegistration(requestId, token, params) {
  const payload = resubmitTokenService.verify(token);
  if (payload.requestId !== requestId) {
    const err = new Error('Token does not match request');
    err.code = 'TOKEN_MISMATCH';
    throw err;
  }

  const { rows } = await pool.query(
    `SELECT * FROM registration_requests WHERE id = $1 AND status = 'rejected'`,
    [requestId],
  );
  if (rows.length === 0) {
    const err = new Error('Request not found or not rejected');
    err.code = 'NOT_REJECTED';
    throw err;
  }
  const existing = rows[0];

  const docResults = await documentValidationService.validateAll(
    [
      { fileBuffer: params.documents.suratPermohonan.buffer, fileName: params.documents.suratPermohonan.originalname, templateCode: 'surat_permohonan_akun' },
      { fileBuffer: params.documents.suratPernyataan.buffer, fileName: params.documents.suratPernyataan.originalname, templateCode: 'surat_pernyataan_upps' },
    ],
    { context: 'upps_resubmission' },
  );
  if (!docResults.allValid) {
    const err = new Error('Document validation failed');
    err.code = 'DOCS_INVALID';
    err.details = docResults.results;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = params.password
      ? await bcrypt.hash(params.password, SALT_ROUNDS)
      : existing.password_hash;

    await client.query(
      `UPDATE registration_requests SET
         upps_name = $1, highest_leader_name = $2, account_pj_name = $3,
         email = $4, phone = $5, institution_id = $6, password_hash = $7,
         status = 'pending', rejection_reason = NULL,
         reviewed_by = NULL, reviewed_at = NULL,
         updated_at = NOW()
       WHERE id = $8`,
      [params.uppsName, params.highestLeaderName, params.accountPjName,
       params.email, params.phone || null, params.institutionId,
       passwordHash, requestId],
    );

    await client.query(`DELETE FROM registration_request_prodi WHERE request_id = $1`, [requestId]);
    for (const p of params.prodiList) {
      await client.query(
        `INSERT INTO registration_request_prodi
          (request_id, jenjang_code, program_studi_id, ketua_prodi, letak_prodi)
         VALUES ($1,$2,$3,$4,$5)`,
        [requestId, p.jenjangCode, p.programStudiId, p.ketuaProdi, p.letakProdi || null],
      );
    }

    await client.query(`DELETE FROM registration_request_documents WHERE request_id = $1`, [requestId]);
    const [permohonanPinata, pernyataanPinata] = await Promise.all([
      _uploadDocToPinata(params.documents.suratPermohonan.buffer, params.documents.suratPermohonan.originalname, requestId, 'surat_permohonan_akun'),
      _uploadDocToPinata(params.documents.suratPernyataan.buffer, params.documents.suratPernyataan.originalname, requestId, 'surat_pernyataan_upps'),
    ]);
    const docRows = [
      { templateCode: 'surat_permohonan_akun', file: params.documents.suratPermohonan, pinata: permohonanPinata, validation: docResults.results[0] },
      { templateCode: 'surat_pernyataan_upps', file: params.documents.suratPernyataan, pinata: pernyataanPinata, validation: docResults.results[1] },
    ];
    for (const d of docRows) {
      await client.query(
        `INSERT INTO registration_request_documents
          (request_id, template_code, file_name, file_hash, file_size_bytes,
           pinata_cid, pinata_url, similarity_score, threshold, is_valid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [requestId, d.templateCode, d.file.originalname,
         require('crypto').createHash('sha256').update(d.file.buffer).digest('hex'),
         d.file.size, d.pinata.cid, d.pinata.url,
         d.validation.similarity, d.validation.threshold, d.validation.isValid],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  emailService.sendRegistrationReceived({
    to: params.email, uppsName: params.uppsName, requestId,
  }).catch((e) => console.error('[Registration] resubmit email failed:', e.message));

  return { requestId };
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
