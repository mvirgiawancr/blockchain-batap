const { Resend } = require('resend');
const config = require('../config');

let resend = null;
if (config.resend.apiKey) {
  resend = new Resend(config.resend.apiKey);
} else {
  console.warn('[Email] RESEND_API_KEY not set — email sending disabled');
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isConfigured() {
  return !!resend;
}

async function safeSend(payload) {
  if (!resend) {
    return { success: false, error: 'Resend not configured' };
  }
  try {
    const data = await resend.emails.send({
      from: config.resend.from,
      reply_to: config.resend.replyTo || undefined,
      ...payload,
    });
    return { success: true, id: data.id };
  } catch (err) {
    console.error('[Email] send failed:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendRegistrationReceived({ to, uppsName, requestId }) {
  const safeupps = escapeHtml(uppsName);
  const safeReqId = escapeHtml(requestId);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#4f46e5">Pendaftaran Akun UPPS Diterima</h2>
      <p>Halo <strong>${safeupps}</strong>,</p>
      <p>Pendaftaran akun UPPS Anda di AkreChain telah diterima dan sedang menunggu review oleh Sekretariat LAM Teknik.</p>
      <p>Nomor referensi: <code>${safeReqId}</code></p>
      <p>Anda akan menerima email pemberitahuan selanjutnya setelah proses review selesai.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#6b7280">Email ini dikirim otomatis oleh sistem AkreChain. Mohon tidak membalas.</p>
    </div>`;
  return safeSend({ to, subject: 'Pendaftaran AkreChain Diterima — Menunggu Approval', html });
}

async function sendApprovalNotification({ to, uppsName, username }) {
  const safeupps = escapeHtml(uppsName);
  const safeUser = escapeHtml(username);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#059669">Akun UPPS Anda Telah Aktif</h2>
      <p>Halo <strong>${safeupps}</strong>,</p>
      <p>Selamat! Pendaftaran akun UPPS Anda telah disetujui oleh Sekretariat LAM Teknik.</p>
      <p>Anda dapat login ke AkreChain menggunakan:</p>
      <ul>
        <li>Username: <strong>${safeUser}</strong></li>
        <li>Password: (yang Anda buat saat mendaftar)</li>
      </ul>
      <p><a href="https://akrechain.local/login" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Login Sekarang</a></p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#6b7280">Email ini dikirim otomatis oleh sistem AkreChain.</p>
    </div>`;
  return safeSend({ to, subject: 'Akun UPPS AkreChain Anda Telah Aktif', html });
}

async function sendRejectionWithResubmitToken({ to, uppsName, reason, resubmitUrl }) {
  const safeupps = escapeHtml(uppsName);
  const safeReason = escapeHtml(reason);
  // resubmitUrl is server-generated (token is JWT), but encode to be safe in href attribute
  const safeUrl = encodeURI(resubmitUrl);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#dc2626">Pendaftaran Ditolak — Silakan Resubmit</h2>
      <p>Halo <strong>${safeupps}</strong>,</p>
      <p>Mohon maaf, pendaftaran akun UPPS Anda ditolak dengan alasan:</p>
      <blockquote style="border-left:3px solid #dc2626;padding-left:12px;color:#374151">${safeReason}</blockquote>
      <p>Anda dapat memperbaiki data dan mengirim ulang melalui link berikut:</p>
      <p><a href="${safeUrl}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Resubmit Pendaftaran</a></p>
      <p style="font-size:12px;color:#6b7280">Link berlaku selama 7 hari.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#6b7280">Email ini dikirim otomatis oleh sistem AkreChain.</p>
    </div>`;
  return safeSend({ to, subject: 'Pendaftaran AkreChain Ditolak — Silakan Resubmit', html });
}

module.exports = {
  isConfigured,
  sendRegistrationReceived,
  sendApprovalNotification,
  sendRejectionWithResubmitToken,
};
