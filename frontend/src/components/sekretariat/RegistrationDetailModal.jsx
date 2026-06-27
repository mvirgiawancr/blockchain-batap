import { useState } from 'react';
import { X, Check, Ban, ExternalLink, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { approveRegistration, rejectRegistration } from '../../services/registration';

const STATUS_CONFIG = {
  pending: { bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: Clock, label: 'Menunggu' },
  approved: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2, label: 'Disetujui' },
  rejected: { bg: 'bg-rose-50 text-rose-800 border-rose-200', icon: XCircle, label: 'Ditolak' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`${cfg.bg} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border shadow-sm`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

export default function RegistrationDetailModal({ request, onClose, onAction }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!request) return null;

  const handleApprove = async () => {
    setBusy(true); setError('');
    try {
      await approveRegistration(request.id);
      onAction({ action: 'approved' });
    } catch (err) {
      setError(err.response?.data?.error || 'Approval gagal');
    } finally { setBusy(false); }
  };

  const handleReject = async () => {
    if (reason.trim().length < 5) {
      setError('Alasan minimal 5 karakter');
      return;
    }
    setBusy(true); setError('');
    try {
      await rejectRegistration(request.id, reason);
      onAction({ action: 'rejected' });
    } catch (err) {
      setError(err.response?.data?.error || 'Reject gagal');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-base font-black text-slate-900">Detail Pendaftaran UPPS</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Review data calon UPPS</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={request.status} />
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Profile */}
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Profil UPPS</h3>
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Nama UPPS" value={request.upps_name} />
              <Detail label="Username" value={request.username} />
              <Detail label="Pimpinan Tertinggi" value={request.highest_leader_name} />
              <Detail label="Penanggung Jawab Akun" value={request.account_pj_name} />
              <Detail label="Email" value={request.email} />
              <Detail label="Telepon" value={request.phone || '-'} />
              <Detail label="Institusi" value={request.institution_name} />
              <Detail label="Diajukan" value={new Date(request.created_at).toLocaleString('id-ID')} />
            </div>
          </div>

          {/* Prodi */}
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
              Program Studi ({request.prodi?.length || 0})
            </h3>
            <div className="space-y-1.5">
              {request.prodi?.map((p, idx) => (
                <div key={idx} className="text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">{p.jenjang_label}</span>
                    <span className="font-bold text-slate-800">{p.program_studi_name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Ketua: {p.ketua_prodi}{p.letak_prodi ? ` • ${p.letak_prodi}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Dokumen (AI-validated)</h3>
            <div className="space-y-1.5">
              {request.documents?.map((d, idx) => (
                <a key={idx} href={d.pinata_url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-indigo-50/50 hover:bg-indigo-100 rounded-lg text-xs border border-indigo-200/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">{d.file_name}</div>
                    <div className="text-[10px] text-slate-500">{(d.file_size_bytes / 1024).toFixed(0)} KB</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded font-black text-[10px] border
                      ${d.is_valid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      {(Number(d.similarity_score) * 100).toFixed(1)}%
                    </span>
                    <ExternalLink className="w-3 h-3 text-indigo-600" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Previous rejection reason (if resubmitted) */}
          {request.rejection_reason && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Alasan Reject Sebelumnya</div>
              <p className="text-xs text-rose-800 mt-1">{request.rejection_reason}</p>
            </div>
          )}

          {/* Reject reason input */}
          {rejectMode && (
            <div className="space-y-2 p-3 bg-rose-50/50 border border-rose-200 rounded-xl">
              <label className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Alasan Reject *</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder="Jelaskan apa yang perlu diperbaiki..."
                className="block w-full p-3 bg-white border border-rose-200 rounded-xl text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
              <p className="text-[10px] text-slate-500">Min 5 karakter. UPPS akan menerima email dengan link resubmit.</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {request.status === 'pending' && (
          <div className="p-5 border-t border-slate-200 flex justify-end gap-2 bg-slate-50/50">
            {!rejectMode ? (
              <>
                <button onClick={() => setRejectMode(true)} disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-2 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-50">
                  <Ban className="w-3.5 h-3.5" /> Reject
                </button>
                <button onClick={handleApprove} disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-md shadow-emerald-100">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Approve
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setRejectMode(false); setError(''); setReason(''); }} disabled={busy}
                  className="px-4 py-2 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors">
                  Batal
                </button>
                <button onClick={handleReject} disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-md shadow-rose-100">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  Konfirmasi Reject
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</div>
      <div className="text-xs text-slate-800 font-semibold mt-0.5">{value || '-'}</div>
    </div>
  );
}
