import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { ClipboardCheck, CheckCircle, XCircle, Clock, FileText, RefreshCw, Users, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function UPPSAssignmentsPage({ user }) {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [submitting, setSubmitting] = useState(false);
  // Result Modal state
  const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  // Rejection Modal state
  const [rejectModal, setRejectModal] = useState({ isOpen: false, submissionId: null, programStudi: '' });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Fetch all submissions for this UPPS
      const response = await fetch(`${API_BASE_URL}/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const data = result.data || [];
        
        // Filter for submissions with offers
        const offers = data.filter(s => s.currentOffer || s.assignedAssessors).map(s => {
          let status = 'pending';
          let assessor1Status = s.currentOffer?.assessor1Response || 'pending';
          let assessor2Status = s.currentOffer?.assessor2Response || 'pending';
          
          if (s.assignedAssessors) {
            status = 'approved';
          } else if (s.currentOffer) {
            // Check if UPPS already responded
            if (s.currentOffer.uppsResponse === 'accepted') {
              status = 'accepted';
            } else if (s.currentOffer.uppsResponse === 'rejected') {
              status = 'rejected';
            // Check if both assessors have accepted - only then UPPS can respond
            } else if (assessor1Status === 'accepted' && assessor2Status === 'accepted') {
              status = 'pending_approval'; // Ready for UPPS approval
            } else {
              status = 'waiting_assessors'; // Waiting for assessors to accept
            }
          }

          return {
            id: s.submissionId,
            submissionId: s.submissionId,
            programStudi: s.programStudi,
            institusi: s.institusi,
            assessor1: s.currentOffer?.assessor1Name || s.assignedAssessors?.assessor1Name,
            assessor2: s.currentOffer?.assessor2Name || s.assignedAssessors?.assessor2Name,
            assessor1Status,
            assessor2Status,
            offeredAt: s.currentOffer?.offeredAt,
            status: status
          };
        });

        setAssignments(offers);
      } else {
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (submissionId, response, notes = '') => {
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/submissions/${submissionId}/upps-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ response, notes })
      });

      if (res.ok) {
        setResultModal({
          isOpen: true,
          type: 'success',
          title: response === 'accepted' ? 'Penugasan Disetujui! 🎉' : 'Penugasan Ditolak',
          message: response === 'accepted' 
            ? 'Anda telah menyetujui penugasan asesor untuk submission ini. Asesor dapat segera memulai penilaian.'
            : 'Alasan penolakan Anda telah dikirim ke KEA untuk ditinjau.'
        });
        // Close reject modal if open
        setRejectModal({ isOpen: false, submissionId: null, programStudi: '' });
        setRejectReason('');
        loadAssignments();
      } else {
        const err = await res.json();
        setResultModal({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memproses',
          message: err.message || 'Terjadi kesalahan saat memproses respons. Silakan coba lagi.'
        });
      }
    } catch (error) {
      console.error('Error responding to assignment:', error);
      setResultModal({
        isOpen: true,
        type: 'error',
        title: 'Terjadi Kesalahan',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open rejection modal
  const openRejectModal = (submissionId, programStudi) => {
    setRejectModal({ isOpen: true, submissionId, programStudi });
    setRejectReason('');
  };

  // Handle rejection with reason
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setResultModal({
        isOpen: true,
        type: 'error',
        title: 'Alasan Diperlukan',
        message: 'Silakan berikan alasan mengapa Anda menolak penugasan asesor ini.'
      });
      return;
    }
    await handleResponse(rejectModal.submissionId, 'rejected', rejectReason.trim());
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    if (filter === 'pending') return assignment.status === 'pending_approval' || assignment.status === 'waiting_assessors';
    if (filter === 'approved') return assignment.status === 'approved' || assignment.status === 'accepted';
    if (filter === 'rejected') return assignment.status === 'rejected';
    return true;
  });

  const getStatusBadge = (status) => {
    const styles = {
      'waiting_assessors': { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Menunggu Asesor ACC' },
      'pending_approval': { bg: 'bg-indigo-50 text-indigo-750 border-indigo-200', label: 'Menunggu Persetujuan Anda' },
      'approved': { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Telah Disetujui' },
      'accepted': { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Telah Disetujui' },
      'rejected': { bg: 'bg-rose-50 text-rose-800 border-rose-200', label: 'Telah Ditolak' }
    };
    const style = styles[status] || { bg: 'bg-slate-50 text-slate-700 border-slate-200', label: status };
    return (
      <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wide border uppercase shadow-sm ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('upps')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-8 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <Users className="w-8 h-8 text-indigo-650" />
                Persetujuan Asesor
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Setujui atau ajukan penolakan usulan tim pasangan asesor dari KEA</p>
            </div>
            <button
              onClick={loadAssignments}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-600 hover:text-indigo-600 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>

          {/* Filter */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-4 mb-6 shadow-sm">
            <div className="flex gap-3">
              <button
                onClick={() => setFilter('pending')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  filter === 'pending'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-slate-100/60 text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'
                }`}
              >
                Menunggu Persetujuan
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  filter === 'approved'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-slate-100/60 text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'
                }`}
              >
                Disetujui
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-slate-100/60 text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'
                }`}
              >
                Semua Usulan
              </button>
            </div>
          </div>

          {/* Assignments List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50">
              <Clock className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
              <p className="text-slate-500 font-bold text-sm">Memuat usulan penugasan asesor...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-12 text-center shadow-sm max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Tidak Ada Usulan</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Belum ada usulan penugasan pasangan asesor yang perlu ditinjau atau disetujui saat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredAssignments.map((assignment) => (
                <div 
                  key={assignment.id} 
                  className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col relative animate-fade-in"
                >
                  {/* Top Status Border line */}
                  <div className={`h-1.5 w-full ${
                    assignment.status === 'approved' || assignment.status === 'accepted' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                    assignment.status === 'rejected' ? 'bg-gradient-to-r from-rose-500 to-red-500' :
                    assignment.status === 'pending_approval' ? 'bg-gradient-to-r from-indigo-500 to-blue-500' :
                    'bg-gradient-to-r from-amber-400 to-amber-500'
                  }`} />

                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5 border-b border-slate-100 pb-4">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                          {assignment.programStudi}
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">{assignment.institusi}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(assignment.status)}
                      </div>
                    </div>

                    {/* Assessors Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      {/* Assessor 1 */}
                      <div className={`p-4.5 rounded-xl border-2 transition-all duration-200 ${
                        assignment.assessor1Status === 'accepted' ? 'bg-emerald-50/50 border-emerald-200/80 shadow-sm' : 
                        assignment.assessor1Status === 'rejected' ? 'bg-rose-50/50 border-rose-200/80 shadow-sm animate-pulse' : 
                        'bg-slate-50/50 border-slate-200/40 shadow-inner'
                      }`}>
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Asesor 1 Utama</p>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full shadow-sm ${
                            assignment.assessor1Status === 'accepted' ? 'bg-emerald-100 text-emerald-800 border-emerald-250' : 
                            assignment.assessor1Status === 'rejected' ? 'bg-rose-100 text-rose-800 border-rose-250' : 
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {assignment.assessor1Status === 'accepted' ? '✓ ACC' : 
                             assignment.assessor1Status === 'rejected' ? '✗ Tolak' : '⏳ Pending'}
                          </span>
                        </div>
                        <p className="font-black text-slate-800 text-sm tracking-tight">{assignment.assessor1}</p>
                      </div>

                      {/* Assessor 2 */}
                      <div className={`p-4.5 rounded-xl border-2 transition-all duration-200 ${
                        assignment.assessor2Status === 'accepted' ? 'bg-emerald-50/50 border-emerald-200/80 shadow-sm' : 
                        assignment.assessor2Status === 'rejected' ? 'bg-rose-50/50 border-rose-200/80 shadow-sm animate-pulse' : 
                        'bg-slate-50/50 border-slate-200/40 shadow-inner'
                      }`}>
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Asesor 2 Anggota</p>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full shadow-sm ${
                            assignment.assessor2Status === 'accepted' ? 'bg-emerald-100 text-emerald-800 border-emerald-250' : 
                            assignment.assessor2Status === 'rejected' ? 'bg-rose-100 text-rose-800 border-rose-250' : 
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {assignment.assessor2Status === 'accepted' ? '✓ ACC' : 
                             assignment.assessor2Status === 'rejected' ? '✗ Tolak' : '⏳ Pending'}
                          </span>
                        </div>
                        <p className="font-black text-slate-800 text-sm tracking-tight">{assignment.assessor2}</p>
                      </div>
                    </div>

                    {/* Helper Banner when waiting for assessors */}
                    {assignment.status === 'waiting_assessors' && (
                      <div className="mb-4.5 p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-xl flex items-start gap-2.5 text-xs font-semibold text-amber-850 shadow-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                        <p className="leading-relaxed">
                          Menunggu konfirmasi kesediaan dari kedua asesor. Tombol persetujuan UPPS akan aktif setelah kedua asesor menyatakan setuju (ACC).
                        </p>
                      </div>
                    )}

                    {/* Card Action Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-4 mt-3">
                      <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-mono">
                        Diusulkan KEA: {assignment.offeredAt ? new Date(assignment.offeredAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                      </div>
                      
                      {assignment.status === 'pending_approval' && (
                        <div className="flex gap-2.5">
                          <button
                            onClick={() => handleResponse(assignment.submissionId, 'accepted')}
                            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition-all duration-150 font-black text-xs cursor-pointer shadow-md shadow-emerald-100/60 active:scale-95"
                          >
                            <CheckCircle className="w-4 h-4" />
                            SETUJUI ASESOR
                          </button>
                          <button
                            onClick={() => openRejectModal(assignment.submissionId, assignment.programStudi)}
                            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-tr from-rose-600 to-red-650 hover:from-rose-700 hover:to-red-700 text-white rounded-xl transition-all duration-150 font-black text-xs cursor-pointer shadow-md shadow-rose-100/60 active:scale-95"
                          >
                            <XCircle className="w-4 h-4" />
                            TOLAK ASESOR
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      <ResultModal
        isOpen={resultModal.isOpen}
        onClose={() => setResultModal({ ...resultModal, isOpen: false })}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
      />

      {/* Rejection Reason Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-red-500" />
            <div className="p-7">
              <div className="flex items-center gap-3.5 mb-5 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200/50 flex items-center justify-center text-rose-600 shadow-inner">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Tolak Usulan Asesor</h3>
                  <p className="text-[10px] text-slate-500 font-semibold font-mono tracking-tight bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-0.5">{rejectModal.programStudi}</p>
                </div>
              </div>
              
              <div className="mb-5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  Alasan Penolakan Resmi <span className="text-rose-550 font-bold">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Jelaskan alasan objektif / konflik kepentingan penolakan ini..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-800 text-xs font-semibold leading-relaxed resize-none shadow-inner-sm"
                  rows={4}
                />
                <p className="text-[10px] text-slate-400 font-semibold mt-2.5 leading-relaxed">
                  Catatan: Alasan ini akan diverifikasi oleh KEA. KEA berhak menerima penolakan Anda atau menunjuk pasangan asesor pengganti di dalam ledger.
                </p>
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 pt-4 mt-3">
                <button
                  onClick={handleReject}
                  disabled={submitting || !rejectReason.trim()}
                  className="flex-1 px-5 py-2.5 bg-gradient-to-tr from-rose-600 to-red-650 hover:from-rose-700 hover:to-red-750 text-white rounded-xl font-black text-xs cursor-pointer shadow-md shadow-rose-100/60 active:scale-95 disabled:from-slate-350 disabled:to-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Penolakan'}
                </button>
                <button
                  onClick={() => setRejectModal({ isOpen: false, submissionId: null, programStudi: '' })}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer border border-slate-200/40"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
