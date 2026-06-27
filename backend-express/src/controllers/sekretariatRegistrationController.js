const registrationService = require('../services/registrationService');
const config = require('../config');

exports.list = async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status)
    ? req.query.status : undefined;
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const offset = parseInt(req.query.offset || '0', 10);
  const rows = await registrationService.listRequests({ status, limit, offset });
  res.json({ requests: rows });
};

exports.detail = async (req, res) => {
  const detail = await registrationService.getRequestDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: 'Request not found' });
  res.json(detail);
};

exports.approve = async (req, res) => {
  try {
    const { userId } = await registrationService.approveRequest(req.params.id, req.user.id);
    res.json({ status: 'approved', userId });
  } catch (err) {
    if (err.code === 'NOT_PENDING') {
      return res.status(409).json({ error: 'Request tidak dalam status pending' });
    }
    console.error('[Sekretariat] approve error:', err);
    res.status(500).json({ error: 'Approval gagal', detail: err.message });
  }
};

exports.reject = async (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'Alasan reject wajib (min 5 karakter)' });
  }
  const baseUrl = config.server?.publicBaseUrl || `http://localhost:${config.server.port}`;
  try {
    const { resubmitUrl } = await registrationService.rejectRequest(
      req.params.id, req.user.id, reason.trim(), baseUrl,
    );
    res.json({ status: 'rejected', resubmitUrl });
  } catch (err) {
    if (err.code === 'NOT_PENDING') {
      return res.status(409).json({ error: 'Request tidak dalam status pending' });
    }
    console.error('[Sekretariat] reject error:', err);
    res.status(500).json({ error: 'Reject gagal', detail: err.message });
  }
};
