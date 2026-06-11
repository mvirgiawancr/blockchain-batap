import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { ClipboardCheck, FileText, Clock, CheckCircle, XCircle, TrendingUp, RefreshCw, MapPin, Award, Download, Shield, ExternalLink, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function StatusPage({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accreditationDetail, setAccreditationDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  // Load accreditation detail when submission is selected
  useEffect(() => {
    if (selectedSubmission?.submissionId) {
      loadAccreditationDetail(selectedSubmission.submissionId);
    } else {
      setAccreditationDetail(null);
    }
  }, [selectedSubmission]);

  const loadSubmissions = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || [];
        setSubmissions(Array.isArray(data) ? data : []);
      } else {
        setError('Gagal memuat data submission');
        setSubmissions([]);
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAccreditationDetail = async (submissionId) => {
    setDetailLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/traceability/detail/${submissionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        setAccreditationDetail(result.data);
      } else {
        setAccreditationDetail(null);
      }
    } catch (err) {
      setAccreditationDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusColor = (statusStr) => {
    const colors = {
      'pending': 'bg-amber-50 text-amber-700 border-amber-250',
      'under_review': 'bg-indigo-50 text-indigo-750 border-indigo-250',
      'approved': 'bg-emerald-50 text-emerald-750 border-emerald-250',
      'rejected': 'bg-rose-50 text-rose-700 border-rose-250',
      'SUBMITTED': 'bg-indigo-50 text-indigo-700 border-indigo-250',
      'DESK_EVALUATION': 'bg-blue-50 text-blue-705 border-blue-250',
      'AK_SCORED': 'bg-purple-50 text-purple-705 border-purple-250',
      'AL_PROPOSED': 'bg-amber-50 text-amber-750 border-amber-250',
      'AL_APPROVED': 'bg-emerald-50 text-emerald-750 border-emerald-250',
      'AL_IN_PROGRESS': 'bg-orange-50 text-orange-705 border-orange-250',
      'AL_SUBMITTED': 'bg-teal-50 text-teal-705 border-teal-250',
      'UPPS_RESPONDED': 'bg-cyan-50 text-cyan-705 border-cyan-250',
      'VERIFIED': 'bg-lime-50 text-lime-705 border-lime-250',
      'ACCREDITED': 'bg-emerald-50 text-emerald-800 border-emerald-250 font-black',
      'RELEASED': 'bg-emerald-50 text-emerald-900 border-emerald-300 font-black'
    };
    return colors[statusStr] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getStatusIcon = (status) => {
    if (status === 'approved' || status === 'ACCREDITED' || status === 'RELEASED') return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    if (status === 'rejected') return <XCircle className="w-5 h-5 text-rose-600" />;
    if (status === 'under_review' || status === 'DESK_EVALUATION') return <Clock className="w-5 h-5 text-indigo-600" />;
    return <Clock className="w-5 h-5 text-amber-600" />;
  };

  const getRankBadgeColor = (rank) => {
    const colors = {
      'Unggul': 'bg-gradient-to-tr from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-100',
      'Baik Sekali': 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-100',
      'Baik': 'bg-gradient-to-tr from-indigo-500 to-blue-500 text-white shadow-sm shadow-indigo-100',
      'Tidak Terakreditasi': 'bg-gradient-to-tr from-rose-500 to-red-500 text-white shadow-sm shadow-rose-100'
    };
    return colors[rank] || 'bg-slate-100 text-slate-800 border border-slate-200';
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('upps')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <ClipboardCheck className="w-8 h-8 text-indigo-600" />
                Status Akreditasi
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Pantau perkembangan tahapan dan keputusan akreditasi program studi</p>
            </div>
            <button
              onClick={loadSubmissions}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-600 hover:text-indigo-600 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4.5 mb-6 flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-rose-800 text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50">
              <Clock className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
              <p className="text-slate-500 font-bold text-sm">Memuat data akreditasi...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Submissions List (5 columns width) */}
              <div className="lg:col-span-5 space-y-4">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">Daftar Pengajuan Program Studi</h2>
                
                {submissions.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-8 text-center shadow-sm">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-base font-black text-slate-800 mb-1">Belum Ada Pengajuan</h3>
                    <p className="text-slate-500 text-xs font-semibold mb-4 leading-relaxed">
                      Anda belum memiliki berkas pengajuan akreditasi aktif.
                    </p>
                    <button
                      onClick={() => navigate('/')}
                      className="px-5 py-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl transition-all font-black text-xs shadow-md active:scale-95 cursor-pointer"
                    >
                      Buat Pengajuan Baru
                    </button>
                  </div>
                ) : (
                  submissions.map((submission) => (
                    <div
                      key={submission.submissionId}
                      onClick={() => setSelectedSubmission(submission)}
                      className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md relative overflow-hidden flex flex-col ${
                        selectedSubmission?.submissionId === submission.submissionId
                          ? 'border-2 border-indigo-600 ring-2 ring-indigo-50/50'
                          : 'border border-slate-200/60 hover:border-slate-350'
                      }`}
                    >
                      {/* Left status color accent */}
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${
                        submission.status === 'approved' || submission.status === 'ACCREDITED' || submission.status === 'RELEASED' ? 'bg-gradient-to-b from-emerald-500 to-teal-500' :
                        submission.status === 'rejected' ? 'bg-gradient-to-b from-rose-500 to-red-500' :
                        submission.status === 'under_review' || submission.status === 'DESK_EVALUATION' ? 'bg-gradient-to-b from-indigo-500 to-blue-500' :
                        'bg-gradient-to-b from-amber-400 to-amber-500'
                      }`} />
                      
                      <div className="pl-4 flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug truncate">
                            {submission.programStudi}
                          </h3>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">{submission.institusi}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusIcon(submission.status)}
                        </div>
                      </div>
                      
                      <div className="pl-4 flex items-center justify-between border-t border-slate-100/60 pt-3 mt-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusColor(submission.status)}`}>
                          {submission.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-extrabold font-mono uppercase tracking-wider">
                          {new Date(submission.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right: Submission Detail + Certificate (7 columns width) */}
              <div className="lg:col-span-7 space-y-5">
                {selectedSubmission ? (
                  <>
                    {/* Basic Info Card */}
                    <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-5 pb-3 border-b border-slate-100">Detail Pengajuan</h2>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between py-3 border-b border-slate-150/50">
                          <span className="text-xs text-slate-550 font-semibold">Status Saat Ini</span>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black border-2 uppercase tracking-wide shadow-sm ${getStatusColor(selectedSubmission.status)}`}>
                            {selectedSubmission.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-150/50">
                          <span className="text-xs text-slate-550 font-semibold">ID Pengajuan</span>
                          <span className="font-mono text-xs font-black text-slate-800 bg-slate-50 px-2.5 py-0.5 border border-slate-200 rounded-md shadow-sm">
                            {selectedSubmission.submissionId}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-150/50">
                          <span className="text-xs text-slate-550 font-semibold">Program Studi</span>
                          <span className="text-xs font-black text-slate-800 text-right max-w-[65%] truncate">
                            {selectedSubmission.programStudi}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-150/50">
                          <span className="text-xs text-slate-550 font-semibold">Institusi / Universitas</span>
                          <span className="text-xs font-bold text-slate-800 text-right max-w-[65%] truncate">
                            {selectedSubmission.institusi}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-150/50">
                          <span className="text-xs text-slate-550 font-semibold">Jenjang</span>
                          <span className="text-xs font-extrabold text-slate-800">
                            {selectedSubmission.jenjang || selectedSubmission.programType || '-'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-150/50">
                          <span className="text-xs text-slate-550 font-semibold">Tanggal Submit</span>
                          <span className="text-xs font-bold text-slate-850">
                            {new Date(selectedSubmission.createdAt).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>

                        {selectedSubmission.ai?.scoring?.finalScore && (
                          <div className="flex items-center justify-between py-3 border-b border-slate-150/50 bg-indigo-50/10 px-2 rounded-lg">
                            <span className="text-xs text-indigo-700 font-bold flex items-center gap-1.5">
                              <TrendingUp className="w-4 h-4" />
                              Skor Prediksi AI
                            </span>
                            <span className="text-lg font-black text-indigo-600 font-heading">
                              {selectedSubmission.ai.scoring.finalScore.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ {selectedSubmission.ai.scoring.maxPossibleScore}</span>
                            </span>
                          </div>
                        )}

                        {selectedSubmission.decision && (
                          <div className="mt-5 p-4.5 bg-slate-50/70 border border-slate-200/65 rounded-xl shadow-inner">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-emerald-600 animate-pulse" />
                              Keputusan Resmi Sekretariat
                            </h3>
                            <div className="space-y-1.5 text-xs text-slate-600 font-semibold leading-relaxed">
                              <p><strong>Hasil:</strong> <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase border inline-block ${
                                selectedSubmission.decision.result === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>{selectedSubmission.decision.result === 'approved' ? 'DISETUJUI' : 'DITOLAK'}</span></p>
                              <p><strong>Catatan:</strong> <span className="text-slate-750 font-bold">{selectedSubmission.decision.notes}</span></p>
                              <p className="text-[10px] text-slate-400 mt-2 font-mono">Diputuskan oleh {selectedSubmission.decision.decidedBy}</p>
                            </div>
                          </div>
                        )}

                        {/* AL Response Button */}
                        {(selectedSubmission.status === 'ak_submitted' || 
                          selectedSubmission.status === 'al_ready' || 
                          selectedSubmission.status === 'al_in_progress' ||
                          selectedSubmission.status === 'AL_SUBMITTED' ||
                          selectedSubmission.akConsistent === true) && (
                          <div className="mt-6">
                            <button
                              onClick={() => navigate(`/al-response/${selectedSubmission.submissionId}`)}
                              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-tr from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-650 hover:to-amber-700 transition-all font-black text-xs cursor-pointer shadow-md shadow-amber-100"
                            >
                              <MapPin className="w-4 h-4 text-white" />
                              RESPON ASESMEN LAPANGAN
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Accreditation Decision & Certificate Card */}
                    {detailLoading ? (
                      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 p-6 text-center shadow-sm animate-fade-in">
                        <Clock className="w-6 h-6 text-indigo-500 mx-auto mb-2 animate-spin" />
                        <p className="text-slate-500 text-xs font-semibold">Memuat berkas detail akreditasi...</p>
                      </div>
                    ) : accreditationDetail ? (
                      <div className="bg-gradient-to-tr from-emerald-50/75 via-emerald-50/30 to-green-50/15 border border-emerald-200/80 rounded-2xl shadow-sm p-6 relative overflow-hidden animate-fade-in">
                        {/* Soft background decor blur circle */}
                        <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                        
                        <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5 text-emerald-600" />
                          Keputusan Akreditasi Sah
                        </h3>

                        {/* Rank Badge */}
                        {accreditationDetail.finalRank && (
                          <div className="text-center mb-5 bg-white/70 border border-emerald-100/60 p-4.5 rounded-xl">
                            <span className={`inline-block px-5 py-2.5 rounded-full text-base font-black uppercase tracking-wide ${getRankBadgeColor(accreditationDetail.finalRank)}`}>
                              ⭐ {accreditationDetail.finalRank}
                            </span>
                            {accreditationDetail.finalScore && (
                              <p className="text-emerald-700 mt-2 text-xs font-bold">
                                Skor Kinerja Akhir: <strong className="text-base text-emerald-800 font-black">{accreditationDetail.finalScore}</strong>
                              </p>
                            )}
                          </div>
                        )}

                        <div className="space-y-2.5 text-xs font-semibold">
                          {accreditationDetail.skNumber && (
                            <div className="flex justify-between items-center bg-white/60 border border-emerald-100/30 rounded-lg p-3 shadow-inner-sm">
                              <span className="text-emerald-700">Nomor SK</span>
                              <span className="font-mono font-black text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-100/50">{accreditationDetail.skNumber}</span>
                            </div>
                          )}
                          {accreditationDetail.skDate && (
                            <div className="flex justify-between items-center bg-white/60 border border-emerald-100/30 rounded-lg p-3">
                              <span className="text-emerald-700">Tanggal Terbit SK</span>
                              <span className="font-bold text-emerald-900">{formatDate(accreditationDetail.skDate)}</span>
                            </div>
                          )}
                          {accreditationDetail.validUntil && (
                            <div className="flex justify-between items-center bg-white/60 border border-emerald-100/30 rounded-lg p-3">
                              <span className="text-emerald-700">Berlaku Hingga</span>
                              <span className="font-black text-emerald-900">{formatDate(accreditationDetail.validUntil)}</span>
                            </div>
                          )}
                          {accreditationDetail.decidedAt && (
                            <div className="flex justify-between items-center bg-white/60 border border-emerald-100/30 rounded-lg p-3">
                              <span className="text-emerald-700">Tanggal Keputusan</span>
                              <span className="font-bold text-emerald-900">{formatDate(accreditationDetail.decidedAt)}</span>
                            </div>
                          )}
                        </div>

                        {/* Certificate Download Box */}
                        {accreditationDetail.certificateCid && (
                          <div className="mt-5 p-4 bg-white/95 backdrop-blur-md rounded-xl border border-emerald-100/80 shadow-sm flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Sertifikat Akreditasi</p>
                                <p className="text-[10px] text-emerald-600 font-mono truncate mt-0.5">CID: {accreditationDetail.certificateCid}</p>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <a
                                href={`https://gateway.pinata.cloud/ipfs/${accreditationDetail.certificateCid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-bold text-[10px] uppercase cursor-pointer shadow-sm active:scale-95"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </a>
                              <button
                                onClick={() => navigate(`/traceability?q=${selectedSubmission.submissionId}&type=submission`)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-bold text-[10px] uppercase cursor-pointer shadow-sm active:scale-95"
                              >
                                <Shield className="w-3.5 h-3.5" />
                                Trace
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Blockchain verification badge */}
                        <div className="mt-4.5 flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          <span>Data Kelayakan Tervalidasi Hyperledger Fabric Blockchain</span>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-12 text-center shadow-sm">
                    <FileText className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                    <p className="text-slate-500 text-xs font-semibold">Pilih salah satu program studi pengajuan di kolom kiri untuk melihat rincian status akreditasi secara lengkap</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
