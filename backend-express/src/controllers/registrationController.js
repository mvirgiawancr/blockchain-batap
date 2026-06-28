const registrationService = require('../services/registrationService');

exports.checkUsername = async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username query required' });
  const result = await registrationService.validateUsernameAvailable(username);
  res.json(result);
};

exports.submit = async (req, res) => {
  try {
    let prodiList;
    try {
      prodiList = JSON.parse(req.body.prodiList || '[]');
    } catch {
      return res.status(400).json({ error: 'prodiList must be valid JSON' });
    }
    if (!Array.isArray(prodiList) || prodiList.length === 0) {
      return res.status(400).json({ error: 'prodiList must contain at least 1 prodi' });
    }
    if (!req.files?.surat_permohonan?.[0] || !req.files?.surat_pernyataan?.[0]) {
      return res.status(400).json({ error: 'Both surat_permohonan and surat_pernyataan files required' });
    }

    const { requestId } = await registrationService.submitRegistration({
      uppsName: req.body.uppsName,
      highestLeaderName: req.body.highestLeaderName,
      accountPjName: req.body.accountPjName,
      email: req.body.email,
      phone: req.body.phone,
      institutionId: parseInt(req.body.institutionId, 10),
      username: req.body.username,
      password: req.body.password,
      prodiList,
      documents: {
        suratPermohonan: req.files.surat_permohonan[0],
        suratPernyataan: req.files.surat_pernyataan[0],
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      requestId,
      status: 'pending',
      message: 'Pendaftaran berhasil. Menunggu approval Sekretariat.',
    });
  } catch (err) {
    if (err.code === 'DOCS_INVALID') {
      return res.status(422).json({
        error: 'Dokumen tidak valid',
        details: err.details,
      });
    }
    if (err.code === 'USERNAME_TAKEN') {
      return res.status(409).json({ error: 'Username sudah dipakai' });
    }
    console.error('[Registration] submit error:', err);
    res.status(500).json({ error: 'Pendaftaran gagal', detail: err.message });
  }
};

exports.resubmit = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { token, password } = req.body;
    let prodiList;
    try {
      prodiList = JSON.parse(req.body.prodiList || '[]');
    } catch {
      return res.status(400).json({ error: 'prodiList must be valid JSON' });
    }
    if (!req.files?.surat_permohonan?.[0] || !req.files?.surat_pernyataan?.[0]) {
      return res.status(400).json({ error: 'Both files required' });
    }

    await registrationService.resubmitRegistration(requestId, token, {
      uppsName: req.body.uppsName,
      highestLeaderName: req.body.highestLeaderName,
      accountPjName: req.body.accountPjName,
      email: req.body.email,
      phone: req.body.phone,
      institutionId: parseInt(req.body.institutionId, 10),
      password: password || null,
      prodiList,
      documents: {
        suratPermohonan: req.files.surat_permohonan[0],
        suratPernyataan: req.files.surat_pernyataan[0],
      },
    });

    res.json({ status: 'pending', message: 'Resubmit berhasil. Menunggu approval Sekretariat.' });
  } catch (err) {
    if (err.code === 'TOKEN_MISMATCH' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
    }
    if (err.code === 'NOT_REJECTED') {
      return res.status(409).json({ error: 'Request tidak ditemukan atau tidak sedang rejected' });
    }
    if (err.code === 'DOCS_INVALID') {
      return res.status(422).json({ error: 'Dokumen tidak valid', details: err.details });
    }
    console.error('[Registration] resubmit error:', err);
    res.status(500).json({ error: 'Resubmit gagal', detail: err.message });
  }
};

exports.getRequestByToken = async (req, res) => {
  try {
    const { token } = req.query;
    const payload = require('../services/resubmitTokenService').verify(token);
    const detail = await registrationService.getRequestDetail(payload.requestId);
    if (!detail) return res.status(404).json({ error: 'Request not found' });
    res.json(detail);
  } catch (err) {
    res.status(401).json({ error: 'Token tidak valid' });
  }
};
