import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import {
  ArrowLeft, FileText, Building2, Calendar, Users, CheckCircle,
  Clock, XCircle, AlertCircle, MapPin, Hash, Award, BookOpen,
  ExternalLink, RefreshCw, User, Layers
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const STATUS_CONFIG = {
  pending:         { label: 'Menunggu Respons',  color: 'amber',   icon: Clock },
  offered:         { label: 'Menunggu Respons',  color: 'amber',   icon: Clock },
  accepted:        { label: 'Diterima',          color: 'indigo',  icon: CheckCircle },
  assigned:        { label: 'Ditugaskan',        color: 'indigo',  icon: CheckCircle },
  rejected:        { label: 'Ditolak',           color: 'rose',    icon: XCircle },
  ak_submitted:    { label: 'AK Terkirim',       color: 'blue',    icon: FileText },
  al_ready:        { label: 'Siap AL',           color: 'violet',  icon: MapPin },
  al_in_progress:  { label: 'AL Berlangsung',    color: 'orange',  icon: MapPin },
  completed:       { label: 'Selesai',           color: 'emerald', icon: Award },
};

const colorMap = {
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    dot: 'bg-rose-500'    },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  dot: 'bg-violet-500'  },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'amber', icon: AlertCircle };
  const colors = colorMap[cfg.color] || colorMap.amber;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${colors.bg} ${colors.border} ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-sm font-semibold text-slate-800 break-all ${mono ? 'font-mono text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60 mt-1' : ''}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

export default function AsesorAssignmentDetailPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const role = user?.role || 'asesor';
  const menuItems = getMenuForRole(role);

  useEffect(() => {
    loadDetail();
  }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Load assignments list to find this specific one
      const assignRes = await fetch(`${API_BASE_URL}/assessor/assignments`, { headers });
      if (assignRes.ok) {
        const data = await assignRes.json();
        const list = Array.isArray(data) ? data : [];
        const found = list.find(a => a.submissionId === id);
        if (found) setAssignment(found);
      }

      // Load full submission detail
      const subRes = await fetch(`${API_BASE_URL}/submissions/${id}`, { headers });
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubmission(subData.data || subData);
      }
    } catch (err) {
      setError('Gagal memuat data. Periksa koneksi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const handleBack = () => navigate('/asesor/assignments');

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-64 w-72 h-72 bg-violet-100/20 rounded-full blur-3xl pointer-events-none" />

      <Sidebar
        user={user}
        menuItems={menuItems}
        onLogout={() => navigate('/login')}
      />

      <main className="flex-1 ml-64 overflow-auto">
        <div className="p-8 max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-5 cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Kembali ke Penugasan Saya
            </button>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Detail Penugasan</h1>
                <p className="text-slate-500 text-sm font-semibold mt-1">
                  Informasi lengkap penugasan penilaian akreditasi Anda
                </p>
              </div>
              <button
                onClick={loadDetail}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl text-sm font-bold transition-all duration-200 shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-slate-500 text-sm font-semibold">Memuat data penugasan...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <p className="text-rose-700 font-bold">{error}</p>
              <button onClick={loadDetail} className="mt-4 px-5 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors cursor-pointer">
                Coba Lagi
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column – Assignment Info */}
              <div className="lg:col-span-2 space-y-6">

                {/* Status Banner */}
                {assignment && (
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">Status Penugasan</h2>
                      <StatusBadge status={assignment.status} />
                    </div>

                    {/* Timeline-style progress */}
                    <div className="flex items-center gap-2 mt-4">
                      {['pending', 'accepted', 'ak_submitted', 'al_ready', 'completed'].map((s, i, arr) => {
                        const statuses = ['pending','offered','accepted','assigned','ak_submitted','al_ready','al_in_progress','completed'];
                        const currentIdx = statuses.indexOf(assignment.status);
                        const stepIdx = statuses.indexOf(s);
                        const isDone = currentIdx >= stepIdx;
                        const labels = ['Ditawarkan', 'Diterima', 'AK Terkirim', 'Siap AL', 'Selesai'];
                        return (
                          <div key={s} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all
                                ${isDone ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                              </div>
                              <p className={`text-[9px] font-black mt-1.5 uppercase tracking-wider text-center leading-tight
                                ${isDone ? 'text-indigo-600' : 'text-slate-400'}`}>{labels[i]}</p>
                            </div>
                            {i < arr.length - 1 && (
                              <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${isDone && currentIdx > stepIdx ? 'bg-indigo-400' : 'bg-slate-200'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submission Info */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h2 className="text-base font-black text-slate-800">Informasi Submission</h2>
                  </div>

                  <InfoRow icon={Hash}      label="Submission ID"    value={id}                                     mono />
                  <InfoRow icon={BookOpen}  label="Program Studi"    value={assignment?.programName || submission?.programName || submission?.program_name || '—'} />
                  <InfoRow icon={Building2} label="Institusi"        value={assignment?.institutionName || submission?.institutionName || submission?.institution_name || '—'} />
                  <InfoRow icon={Layers}    label="Jenjang"          value={submission?.degree || submission?.jenjang || '—'} />
                  <InfoRow icon={Calendar}  label="Tanggal Pengajuan" value={formatDate(submission?.createdAt || submission?.created_at)} />
                  <InfoRow icon={Calendar}  label="Tanggal Penugasan" value={formatDate(assignment?.assignedAt || assignment?.assigned_at)} />
                </div>

                {/* Assessment Actions */}
                {assignment && (
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
                        <Award className="w-4 h-4 text-violet-600" />
                      </div>
                      <h2 className="text-base font-black text-slate-800">Aksi Tersedia</h2>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {assignment.status === 'assigned' && (
                        <button
                          onClick={() => navigate(`/asesor/assessment/${id}`)}
                          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-tr from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-sm font-black cursor-pointer shadow-md shadow-indigo-100 hover:shadow-lg transition-all active:scale-95"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mulai Penilaian AK
                        </button>
                      )}
                      {assignment.status === 'accepted' && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold shadow-inner">
                          <Clock className="w-4 h-4 animate-pulse text-indigo-500" />
                          Penawaran Diterima — Menunggu persetujuan Partner Asesor & UPPS untuk memulai penilaian
                        </div>
                      )}
                      {(assignment.status === 'al_ready' || assignment.status === 'al_in_progress') && (
                        <button
                          onClick={() => navigate(`/al-execution/${id}`)}
                          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-tr from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white rounded-xl text-sm font-black cursor-pointer shadow-md shadow-amber-100 hover:shadow-lg transition-all active:scale-95"
                        >
                          <MapPin className="w-4 h-4" />
                          Laksanakan AL
                        </button>
                      )}
                      {assignment.status === 'ak_submitted' && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-200 text-slate-655 rounded-xl text-sm font-bold shadow-inner">
                          <Clock className="w-4 h-4 animate-pulse text-amber-500" />
                          Asesmen Kecukupan Selesai — Menunggu penjadwalan Asesmen Lapangan (AL) dari KEA & persetujuan Sekretariat
                        </div>
                      )}
                      {(assignment.status === 'pending' || assignment.status === 'offered') && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-bold">
                          <Clock className="w-4 h-4" />
                          Menunggu respons Anda — kembali ke daftar penugasan untuk Terima/Tolak
                        </div>
                      )}
                      {assignment.status === 'completed' && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold">
                          <CheckCircle className="w-4 h-4" />
                          Penugasan telah selesai
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column – Team & Meta */}
              <div className="space-y-6">

                {/* Team Asesor */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <Users className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h2 className="text-base font-black text-slate-800">Tim Asesor</h2>
                  </div>

                  {/* Self */}
                  <div className="flex items-center gap-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl mb-3">
                    <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-indigo-700 truncate">{user?.name || user?.username || 'Anda'}</p>
                      <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Asesor Anda</p>
                    </div>
                  </div>

                  {/* Partner */}
                  {(assignment?.partnerName || assignment?.partner_name) && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                      <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{assignment.partnerName || assignment.partner_name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Partner Asesor</p>
                      </div>
                    </div>
                  )}

                  {!assignment?.partnerName && !assignment?.partner_name && (
                    <div className="text-center py-4 text-slate-400 text-xs font-semibold">
                      Partner asesor belum ditentukan
                    </div>
                  )}
                </div>

                {/* Submission Meta */}
                {submission && (
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <h2 className="text-base font-black text-slate-800">Status Submission</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-500">Status</span>
                        <span className="text-xs font-black text-slate-800 capitalize">{submission.status || '—'}</span>
                      </div>
                      {submission.akreditasiGrade && (
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-500">Peringkat</span>
                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">{submission.akreditasiGrade}</span>
                        </div>
                      )}
                      {submission.ai?.scoring?.finalScore !== undefined && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs font-bold text-slate-500">Skor AI</span>
                          <span className="text-xs font-black text-violet-700">{Number(submission.ai.scoring.finalScore).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Links */}
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-indigo-100">
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-200 mb-3">Navigasi Cepat</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate('/asesor/assignments')}
                      className="flex items-center gap-2 w-full text-left px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Penugasan Saya
                    </button>
                    <button
                      onClick={() => navigate('/asesor/history')}
                      className="flex items-center gap-2 w-full text-left px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Riwayat Penilaian
                    </button>
                    <button
                      onClick={() => navigate('/asesor/notifications')}
                      className="flex items-center gap-2 w-full text-left px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Notifikasi
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
