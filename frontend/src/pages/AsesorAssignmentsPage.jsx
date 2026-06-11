import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { ClipboardCheck, CheckCircle, XCircle, Clock, FileText, RefreshCw, MapPin, Calendar } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function AsesorAssignmentsPage({ user }) {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const [executedSubmissions, setExecutedSubmissions] = useState(new Set());

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/assessor/assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const assignmentList = Array.isArray(data) ? data : [];
        setAssignments(assignmentList);

        // Check which submissions already have AL execution (Berita Acara submitted)
        const executed = new Set();
        await Promise.all(
          assignmentList
            .filter(a => a.status === 'ak_submitted' || a.status === 'al_ready' || a.status === 'al_in_progress')
            .map(async (a) => {
              try {
                const execRes = await fetch(`${API_BASE_URL}/al-execution/${a.submissionId}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (execRes.ok) {
                  const execData = await execRes.json();
                  if (execData.data?.alExecution) {
                    executed.add(a.submissionId);
                  }
                }
              } catch (e) { /* ignore */ }
            })
        );
        setExecutedSubmissions(executed);
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

  const handleResponse = async (submissionId, response) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/asesor/assignments/${submissionId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ response })
      });

      if (res.ok) {
        setResultModal({
          isOpen: true,
          type: 'success',
          title: response === 'accepted' ? 'Penugasan Diterima! 🎉' : 'Penugasan Ditolak',
          message: response === 'accepted' 
            ? 'Anda telah menerima penugasan ini. Silakan tunggu konfirmasi dari pihak lain sebelum memulai penilaian.'
            : 'Anda telah menolak penugasan ini. KEA akan menugaskan asesor lain.'
        });
        loadAssignments();
      } else {
        setResultModal({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memproses',
          message: 'Terjadi kesalahan saat memproses respons Anda. Silakan coba lagi.'
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
    }
  };

  const filteredAssignments = Array.isArray(assignments) ? assignments.filter(assignment => {
    if (filter === 'all') return true;
    if (filter === 'pending') return assignment.status === 'offered' || assignment.status === 'pending';
    if (filter === 'accepted') return assignment.status === 'accepted' || assignment.status === 'assigned';
    if (filter === 'completed') return assignment.status === 'completed' || assignment.status === 'ak_submitted';
    return true;
  }) : [];

  const getStatusBadge = (status) => {
    const styles = {
      'offered': { bg: 'bg-yellow-50 border-yellow-200 text-yellow-800', label: 'Menunggu Respons' },
      'pending': { bg: 'bg-yellow-50 border-yellow-200 text-yellow-800', label: 'Menunggu Respons' },
      'accepted': { bg: 'bg-emerald-50 border-emerald-250 text-emerald-800', label: 'Diterima' },
      'assigned': { bg: 'bg-emerald-50 border-emerald-255 text-emerald-800', label: 'Diterima' },
      'rejected': { bg: 'bg-rose-50 border-rose-250 text-rose-805', label: 'Ditolak' },
      'completed': { bg: 'bg-blue-50 border-blue-200 text-blue-800', label: 'Selesai' },
      'ak_submitted': { bg: 'bg-purple-50 border-purple-200 text-purple-800', label: 'AK Disubmit' },
      'al_ready': { bg: 'bg-amber-50 border-amber-200/80 text-amber-850', label: 'Siap AL' },
      'al_in_progress': { bg: 'bg-orange-50 border-orange-250 text-orange-800', label: 'AL Berlangsung' }
    };
    const style = styles[status] || { bg: 'bg-slate-50 border-slate-200 text-slate-800', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${style.bg}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[600px] h-[600px] bg-indigo-200/10 rounded-full blur-[150px] pointer-events-none" />

      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('asesor')}
      />

      <div className="flex-1 ml-64 overflow-auto relative z-10">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shadow-sm shadow-indigo-100/50">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                Penugasan Saya
              </h1>
              <p className="text-slate-550 text-sm font-semibold mt-1">Daftar penugasan penilaian akreditasi Anda</p>
            </div>
            <button
              onClick={loadAssignments}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-indigo-600 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Filter - Premium Glass Capsule */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-1.5 mb-6 flex gap-2 shadow-sm">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                filter === 'pending'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Menunggu Respons
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                filter === 'accepted'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Diterima
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                filter === 'completed'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Selesai
            </button>
          </div>

          {/* Assignments List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm animate-pulse">
              <Clock className="w-10 h-10 text-indigo-500 animate-bounce mb-3" />
              <p className="text-slate-550 font-bold text-sm">Menyelaraskan data penugasan...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="glass-panel-light rounded-2xl p-16 text-center shadow-sm max-w-2xl mx-auto my-6 animate-fade-in">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                <ClipboardCheck className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Tidak Ada Penugasan</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Saat ini tidak ada daftar penugasan penilaian yang sesuai dengan filter Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                <div key={assignment.id} className="glass-panel-light glass-panel-light-hover rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm transition-all duration-300 relative overflow-hidden group animate-fade-in">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-blue-500" />
                  
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-650 transition-colors mb-1.5 leading-snug">
                        {assignment.programStudi || 'Program Studi'}
                      </h3>
                      <p className="text-sm font-semibold text-slate-500">{assignment.institusi || 'Institusi'}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(assignment.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-5 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Submission ID</p>
                      <p className="font-mono text-xs font-semibold text-slate-650 mt-0.5">{assignment.submissionId}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tanggal Penugasan</p>
                      <p className="text-xs font-semibold text-slate-650 mt-0.5">
                        {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Partner Asesor</p>
                      <p className="text-xs font-bold text-slate-750 mt-0.5">{assignment.partnerAssessor || '-'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end flex-wrap">
                    {(assignment.status === 'offered' || assignment.status === 'pending') && (
                      <>
                        <button
                          onClick={() => handleResponse(assignment.submissionId, 'accepted')}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Terima
                        </button>
                        <button
                          onClick={() => handleResponse(assignment.submissionId, 'rejected')}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                          <XCircle className="w-4 h-4" />
                          Tolak
                        </button>
                      </>
                    )}
                    {assignment.status === 'assigned' && (
                      <button
                        onClick={() => navigate(`/asesor/assessment/${assignment.submissionId}`)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-indigo-600 to-blue-650 hover:from-indigo-700 hover:to-blue-750 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mulai Penilaian
                      </button>
                    )}
                    {assignment.status === 'accepted' && (
                      <span className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs font-black uppercase tracking-wider shadow-inner">
                        <Clock className="w-4 h-4 animate-pulse text-indigo-500" />
                        Menunggu Partner & UPPS
                      </span>
                    )}
                    {(assignment.status === 'al_ready' || assignment.status === 'al_in_progress') && (
                      executedSubmissions.has(assignment.submissionId) ? (
                        <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-xs font-black uppercase tracking-wider">
                          <CheckCircle className="w-4 h-4" />
                          Berita Acara Terkirim
                        </span>
                      ) : (
                        <button
                          onClick={() => navigate(`/al-execution/${assignment.submissionId}`)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-amber-600 to-orange-555 hover:from-amber-700 hover:to-orange-655 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                          <MapPin className="w-4 h-4" />
                          Laksanakan AL
                        </button>
                      )
                    )}
                    {assignment.status === 'ak_submitted' && (
                      <span className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-black uppercase tracking-wider shadow-inner">
                        <Clock className="w-4 h-4 animate-pulse text-amber-500" />
                        Menunggu Jadwal AL
                      </span>
                    )}
                    <button
                      onClick={() => navigate(`/asesor/detail/${assignment.submissionId}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all duration-200 active:scale-95"
                    >
                      <FileText className="w-4 h-4" />
                      Lihat Detail
                    </button>
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
    </div>
  );
}
