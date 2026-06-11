import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { 
  ClipboardList, CheckCircle, XCircle, Clock, AlertTriangle, 
  RefreshCw, User, FileText, Calendar, X
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function KEARejectionReviewPage({ user }) {
  const navigate = useNavigate();
  const [rejections, setRejections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [reviewModal, setReviewModal] = useState({ isOpen: false, rejection: null });
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadRejections();
  }, []);

  const loadRejections = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/kea/pending-rejections`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setRejections(result.data || []);
      } else {
        setRejections([]);
      }
    } catch (error) {
      console.error('Error loading rejections:', error);
      setRejections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submissionId, decision) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/kea/review-rejection/${submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ decision, notes: reviewNotes })
      });

      if (response.ok) {
        const result = await response.json();
        setResultModal({
          isOpen: true,
          type: 'success',
          title: decision === 'reason_accepted' ? 'Alasan Diterima' : 'Alasan Ditolak',
          message: result.message
        });
        setReviewModal({ isOpen: false, rejection: null });
        setReviewNotes('');
        loadRejections();
      } else {
        const err = await response.json();
        setResultModal({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memproses',
          message: err.message || 'Terjadi kesalahan saat memproses review.'
        });
      }
    } catch (error) {
      console.error('Error reviewing rejection:', error);
      setResultModal({
        isOpen: true,
        type: 'error',
        title: 'Terjadi Kesalahan',
        message: 'Tidak dapat terhubung ke server.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (rejection) => {
    setReviewModal({ isOpen: true, rejection });
    setReviewNotes('');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-200/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[600px] h-[600px] bg-orange-200/10 rounded-full blur-[150px] pointer-events-none" />

      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('kea')}
      />
      
      <div className="flex-1 ml-64 overflow-auto relative z-10">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm shadow-amber-100/50">
                  <ClipboardList className="w-5 h-5" />
                </div>
                Review Penolakan Asesor
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">
                Tinjau dan proses alasan penolakan penugasan asesor yang diajukan oleh UPPS
              </p>
            </div>
            <button
              onClick={loadRejections}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-amber-600 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>

          {/* Stats Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex items-center justify-between group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Menunggu Review</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{rejections.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Rejections List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 glass-panel-light rounded-2xl shadow-sm animate-pulse">
              <ClipboardList className="w-12 h-12 text-amber-500 animate-bounce mb-3" />
              <p className="text-slate-500 font-bold text-sm">Memuat data penolakan UPPS...</p>
            </div>
          ) : rejections.length === 0 ? (
            <div className="glass-panel-light rounded-2xl p-16 text-center shadow-sm max-w-2xl mx-auto my-6 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Tidak Ada Penolakan</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Luar biasa! Seluruh permohonan penolakan asesor oleh UPPS telah selesai ditinjau.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-1 gap-6 animate-fade-in">
              {rejections.map((rejection) => (
                <div 
                  key={rejection.submissionId} 
                  className="glass-panel-light glass-panel-light-hover rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black bg-amber-50 border border-amber-200 text-amber-800 uppercase shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Menunggu Review
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            {rejection.submissionId}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug group-hover:text-amber-600 transition-colors">
                          {rejection.programStudi}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">{rejection.institusi}</p>
                      </div>
                      
                      {/* Assessors Display Tags */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl flex items-center gap-3 shadow-inner-sm">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 font-black text-[10px]">
                            A1
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Asesor 1</p>
                            <p className="text-xs font-bold text-slate-700 truncate">{rejection.assessor1Name}</p>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl flex items-center gap-3 shadow-inner-sm">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 font-black text-[10px]">
                            A2
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Asesor 2</p>
                            <p className="text-xs font-bold text-slate-700 truncate">{rejection.assessor2Name}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Rejection Reason Block */}
                      <div className="p-4 bg-rose-50/50 border border-rose-150 rounded-xl shadow-inner-sm">
                        <div className="flex items-start gap-3">
                          <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-black text-rose-800 uppercase tracking-wider mb-1">Alasan Penolakan UPPS</p>
                            <p className="text-xs text-rose-700 font-semibold leading-relaxed">
                              {rejection.rejectionReason || rejection.uppsNotes || 'Tidak ada alasan diberikan.'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-405">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        Ditolak pada: {formatDate(rejection.uppsResponseAt)}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 self-stretch justify-center">
                      <button
                        onClick={() => openReviewModal(rejection)}
                        className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-tr from-amber-500 to-orange-650 hover:from-amber-600 hover:to-orange-750 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-150 shadow-md hover:shadow-lg shadow-amber-100/80 flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                      >
                        <FileText className="w-4 h-4" />
                        Review Berkas
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal.isOpen && reviewModal.rejection && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col animate-fade-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
            
            <div className="p-7 overflow-y-auto space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm shadow-amber-100/50">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Review Penolakan Asesor</h3>
                    <p className="text-xs font-semibold text-slate-500">{reviewModal.rejection.programStudi}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setReviewModal({ isOpen: false, rejection: null })}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-rose-50/50 border border-rose-150 rounded-xl shadow-inner-sm">
                <p className="text-[10px] font-black text-rose-800 uppercase tracking-wider mb-1">Alasan Penolakan UPPS</p>
                <p className="text-xs text-rose-700 font-semibold leading-relaxed">
                  {reviewModal.rejection.rejectionReason || reviewModal.rejection.uppsNotes}
                </p>
              </div>

              <div className="p-4 bg-indigo-50/50 border border-indigo-150 rounded-xl flex items-start gap-3 shadow-inner-sm">
                <CheckCircle className="w-5 h-5 text-indigo-650 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-indigo-850 uppercase tracking-wide">Panduan Peninjauan KEA</p>
                  <p className="text-xs text-slate-650 leading-relaxed mt-1">
                    <strong>Terima Alasan:</strong> Menghapus penugasan saat ini dan membuka kembali opsi penugasan pasangan asesor baru di menu Penugasan Asesor.<br/>
                    <strong className="mt-1 block">Tolak Alasan:</strong> Memaksakan penugasan saat ini (*force assign*), memicu penugasan permanen yang langsung tercatat di blockchain.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                  Catatan KEA (Opsional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Tambahkan catatan resmi KEA untuk keputusan penolakan ini..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none text-sm font-semibold outline-none focus:shadow-sm"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 border-t border-slate-100/60 pt-4">
                <button
                  onClick={() => handleReview(reviewModal.rejection.submissionId, 'reason_accepted')}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 transition-all font-black text-xs uppercase tracking-wider cursor-pointer shadow-md disabled:shadow-none shadow-emerald-100/80 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  <CheckCircle className="w-4.5 h-4.5" />
                  {submitting ? 'Memproses...' : 'Terima Alasan'}
                </button>
                <button
                  onClick={() => handleReview(reviewModal.rejection.submissionId, 'reason_rejected')}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-tr from-rose-600 to-red-650 hover:from-rose-700 hover:to-red-750 text-white rounded-xl disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 transition-all font-black text-xs uppercase tracking-wider cursor-pointer shadow-md disabled:shadow-none shadow-rose-100/80 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  <XCircle className="w-4.5 h-4.5" />
                  {submitting ? 'Memproses...' : 'Tolak Alasan'}
                </button>
              </div>
              
              <button
                onClick={() => setReviewModal({ isOpen: false, rejection: null })}
                className="w-full px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      <ResultModal
        isOpen={resultModal.isOpen}
        onClose={() => setResultModal({ ...resultModal, isOpen: false })}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
      />
    </div>
  );
}
