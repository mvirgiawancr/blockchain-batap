import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSubmissions } from '../services/api';
import wsService from '../services/websocket';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  ClipboardCheck, CheckCircle, XCircle, Clock, 
  Download, FileText, AlertCircle, Award, Send, RefreshCw
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function AsesorDashboard({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showAKModal, setShowAKModal] = useState(false);
  const [responseType, setResponseType] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [downloading, setDownloading] = useState(false);

  // AK Assessment State
  const [akScores, setAkScores] = useState({
    kriteria1: '',
    kriteria2: '',
    kriteria3: '',
    kriteria4: '',
    kriteria5: '',
    kriteria6: '',
    kriteria7: ''
  });
  const [akNotes, setAkNotes] = useState('');

  const [stats, setStats] = useState({
    pendingOffers: 0,
    acceptedOffers: 0,
    akPending: 0,
    akSubmitted: 0
  });

  useEffect(() => {
    loadSubmissions();
    
    const wsId = (user && (user.username || user.id)) || 'asesor';
    wsService.connect(wsId);
    wsService.on('AssessorOfferCreated', loadSubmissions);
    wsService.on('AssessorResponded', loadSubmissions);
    wsService.on('UPPSResponded', loadSubmissions);
    wsService.on('AKAssessmentSubmitted', loadSubmissions);
    
    return () => wsService.disconnect();
  }, [user]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const res = await getAllSubmissions();
      const list = Array.isArray(res.data) ? res.data : [];
      
      // Filter submissions where user is offered or assigned as assessor
      const mySubmissions = list.filter(s => 
        (s.currentOffer?.assessor1Id === user?.id || s.currentOffer?.assessor2Id === user?.id) ||
        (s.assignedAssessors?.assessor1Id === user?.id || s.assignedAssessors?.assessor2Id === user?.id)
      );
      
      // Calculate stats
      const pending = mySubmissions.filter(s => {
        if (s.currentOffer?.assessor1Id === user?.id && s.currentOffer?.assessor1Response === 'pending') return true;
        if (s.currentOffer?.assessor2Id === user?.id && s.currentOffer?.assessor2Response === 'pending') return true;
        return false;
      }).length;

      const accepted = mySubmissions.filter(s => s.assignedAssessors).length;
      
      const akPending = mySubmissions.filter(s => {
        if (!s.assignedAssessors) return false;
        const hasMyAssessment = s.akAssessments?.some(ak => ak.assessorId === user?.id);
        return !hasMyAssessment;
      }).length;

      const akSubmitted = mySubmissions.filter(s => {
        return s.akAssessments?.some(ak => ak.assessorId === user?.id);
      }).length;
      
      setStats({ pendingOffers: pending, acceptedOffers: accepted, akPending, akSubmitted });
      setSubmissions(mySubmissions);
    } catch (err) {
      console.error('Error loading submissions:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    if (!selectedSubmission) return;
    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/download/${selectedSubmission.submissionId}/${doc.type}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Download failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename || `${doc.type}.file`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDownloading(false);
    }
  };

  const openResponseModal = (submission, type) => {
    setSelectedSubmission(submission);
    setResponseType(type);
    setShowResponseModal(true);
    setResponseNotes('');
    setMessage({ type: '', text: '' });
  };

  const handleRespondToOffer = async () => {
    if (!selectedSubmission || !responseType) return;

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/assessor/respond-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submissionId: selectedSubmission.submissionId,
          assessorId: user?.id,
          response: responseType,
          notes: responseNotes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal merespons penawaran');
      }

      setMessage({ 
        type: 'success', 
        text: responseType === 'accepted' ? 'Penawaran diterima!' : 'Penawaran ditolak' 
      });
      setShowResponseModal(false);
      await loadSubmissions();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openAKModal = (submission) => {
    setSelectedSubmission(submission);
    setShowAKModal(true);
    setAkScores({
      kriteria1: '',
      kriteria2: '',
      kriteria3: '',
      kriteria4: '',
      kriteria5: '',
      kriteria6: '',
      kriteria7: ''
    });
    setAkNotes('');
    setMessage({ type: '', text: '' });
  };

  const handleSubmitAK = async () => {
    if (!selectedSubmission) return;

    // Validate all scores are filled
    const allFilled = Object.values(akScores).every(score => score !== '');
    if (!allFilled) {
      setMessage({ type: 'error', text: 'Harap isi semua kriteria penilaian' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/assessor/submit-ak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submissionId: selectedSubmission.submissionId,
          assessorId: user?.id,
          assessorName: user?.fullName || user?.username || 'Asesor',
          scores: akScores,
          notes: akNotes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal menyimpan penilaian AK');
      }

      setMessage({ type: 'success', text: 'Penilaian AK berhasil disimpan!' });
      setShowAKModal(false);
      await loadSubmissions();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const getMyResponse = (submission) => {
    if (!submission.currentOffer) return null;
    
    if (submission.currentOffer.assessor1Id === user?.id) {
      return {
        status: submission.currentOffer.assessor1Response,
        notes: submission.currentOffer.assessor1Notes
      };
    }
    if (submission.currentOffer.assessor2Id === user?.id) {
      return {
        status: submission.currentOffer.assessor2Response,
        notes: submission.currentOffer.assessor2Notes
      };
    }
    return null;
  };

  const hasSubmittedAK = (submission) => {
    return submission.akAssessments?.some(ak => ak.assessorId === user?.id);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[600px] h-[600px] bg-indigo-200/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Sidebar */}
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('asesor')}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64 overflow-auto relative z-10">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <header className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shadow-sm shadow-indigo-100/50">
                  <Award className="w-5 h-5" />
                </div>
                Dashboard Asesor
              </h1>
              <p className="text-slate-550 text-sm font-semibold mt-1">
                Penilaian Kecukupan (AK) & Pemantauan Usulan Akreditasi
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadSubmissions}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-indigo-600 font-bold text-xs cursor-pointer active:scale-95"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </header>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-panel-light rounded-2xl p-5 border-l-4 border-l-amber-500 shadow-sm flex flex-col justify-between min-h-[100px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Penawaran Pending</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{stats.pendingOffers}</p>
            </div>
            <div className="glass-panel-light rounded-2xl p-5 border-l-4 border-l-indigo-500 shadow-sm flex flex-col justify-between min-h-[100px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Penugasan Diterima</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{stats.acceptedOffers}</p>
            </div>
            <div className="glass-panel-light rounded-2xl p-5 border-l-4 border-l-orange-500 shadow-sm flex flex-col justify-between min-h-[100px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">AK Pending</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{stats.akPending}</p>
            </div>
            <div className="glass-panel-light rounded-2xl p-5 border-l-4 border-l-emerald-500 shadow-sm flex flex-col justify-between min-h-[100px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">AK Terkirim</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{stats.akSubmitted}</p>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`rounded-xl p-4 border animate-fade-in ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
              'bg-rose-50 border-rose-250 text-rose-800'
            }`}>
              <p className="text-xs font-black uppercase tracking-wider">{message.type === 'success' ? 'Sukses ✓' : 'Gagal ⚠'}</p>
              <p className="text-sm font-semibold mt-0.5">{message.text}</p>
            </div>
          )}

          {/* Submissions List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm animate-pulse">
                <Clock className="w-10 h-10 text-indigo-500 animate-bounce mb-3" />
                <p className="text-slate-550 font-bold text-sm">Menyelaraskan data penugasan...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="glass-panel-light rounded-2xl p-16 text-center shadow-sm max-w-2xl mx-auto my-6 animate-fade-in">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                  <ClipboardCheck className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Penugasan</h3>
                <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                  Saat ini Anda belum menerima penawaran atau tugas penilaian dari tim KEA AkreChain.
                </p>
              </div>
            ) : (
              submissions.map((sub) => {
                const myResponse = getMyResponse(sub);
                const isAssigned = sub.assignedAssessors && 
                  (sub.assignedAssessors.assessor1Id === user?.id || sub.assignedAssessors.assessor2Id === user?.id);
                const akSubmitted = hasSubmittedAK(sub);

                return (
                  <div key={sub.submissionId} className="glass-panel-light glass-panel-light-hover rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm transition-all duration-300 relative overflow-hidden group animate-fade-in">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-blue-500" />
                    
                    <div className="grid md:grid-cols-4 gap-6 items-center">
                      
                      {/* Info Column */}
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 border border-indigo-100 text-indigo-750 uppercase">
                            {sub.programType || 'S1'}
                          </span>
                          <span className="text-xs font-mono text-slate-400 font-semibold">{sub.submissionId}</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-indigo-650 transition-colors">
                          {sub.programStudi}
                        </h3>
                        <p className="text-sm font-semibold text-slate-500 mt-0.5">{sub.institusi}</p>
                        
                        {sub.assignedAssessors && (
                          <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                            <p className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Pasangan Asesor:</p>
                            <div className="flex flex-col gap-0.5 text-xs font-semibold text-slate-600">
                              <span>• {sub.assignedAssessors.assessor1Name}</span>
                              <span>• {sub.assignedAssessors.assessor2Name}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status Column */}
                      <div className="flex flex-col gap-2">
                        {myResponse && (
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Status Penawaran</p>
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              myResponse.status === 'accepted' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
                              myResponse.status === 'rejected' ? 'bg-rose-50 border-rose-250 text-rose-800' :
                              'bg-amber-50 border-amber-255 text-amber-800'
                            }`}>
                              {myResponse.status === 'accepted' ? '✓ Diterima' :
                               myResponse.status === 'rejected' ? '✗ Ditolak' :
                               '⏳ Pending'}
                            </span>
                          </div>
                        )}

                        {akSubmitted && (
                          <div className="mt-2.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Status AK</p>
                            <span className="inline-flex px-3 py-1 bg-emerald-50 border border-emerald-250 text-emerald-850 rounded-full text-[10px] font-black uppercase tracking-wider">
                              ✓ Sudah Dinilai
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions Column */}
                      <div className="flex flex-col gap-2 justify-end">
                        <button
                          onClick={() => navigate('/asesor/assignments')}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 hover:text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all duration-200 active:scale-95"
                        >
                          Kelola Penugasan
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Response Modal - Modern Design */}
          {showResponseModal && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-fade-in">
                {/* Modal Header with Gradient */}
                <div className={`p-6 text-white ${
                  responseType === 'accepted' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500' 
                    : 'bg-gradient-to-r from-rose-600 to-red-500'
                }`}>
                  <div className="flex items-center gap-3">
                    {responseType === 'accepted' ? (
                      <CheckCircle className="w-10 h-10" />
                    ) : (
                      <XCircle className="w-10 h-10" />
                    )}
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">
                        {responseType === 'accepted' ? 'Terima Penugasan' : 'Tolak Penugasan'}
                      </h2>
                      <p className="text-xs opacity-90 font-medium mt-0.5">
                        {responseType === 'accepted' 
                          ? 'Konfirmasi penerimaan penugasan asesmen' 
                          : 'Berikan alasan penolakan penugasan'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Submission Info Card */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-indigo-650 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black text-slate-800 text-base">{selectedSubmission?.programStudi}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">{selectedSubmission?.institusi}</p>
                        <p className="text-[10px] text-slate-450 mt-1 font-mono">{selectedSubmission?.submissionId}</p>
                      </div>
                    </div>
                  </div>

                  {/* Notes Input */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      Catatan & Alasan {responseType === 'rejected' && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={responseNotes}
                      onChange={(e) => setResponseNotes(e.target.value)}
                      placeholder={responseType === 'accepted' 
                        ? 'Catatan opsional (jika ada)...' 
                        : 'Jelaskan secara detail alasan penolakan penugasan ini...'}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-semibold text-sm bg-white"
                      rows={4}
                      required={responseType === 'rejected'}
                    />
                    <p className="text-[10px] text-slate-450 mt-1.5 font-semibold">
                      {responseType === 'rejected' 
                        ? 'Alasan penolakan wajib diisi untuk dicatatkan secara aman di blockchain AkreChain.' 
                        : 'Catatan opsional akan dicatatkan pada arsip riwayat penugasan.'}
                    </p>
                  </div>

                  {/* Warning Alert */}
                  {responseType === 'accepted' && (
                    <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-850 font-semibold leading-relaxed">
                        <span className="font-black uppercase tracking-wider">Perhatian:</span> Dengan menerima penawaran ini, Anda berkomitmen untuk melaksanakan Penilaian AK secara objektif sesuai tenggat waktu.
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      onClick={() => setShowResponseModal(false)}
                      disabled={submitting}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleRespondToOffer}
                      disabled={submitting || (responseType === 'rejected' && !responseNotes.trim())}
                      className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all duration-200 shadow-md cursor-pointer active:scale-95 ${
                        responseType === 'accepted'
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 disabled:from-slate-250 disabled:to-slate-350'
                          : 'bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 disabled:from-slate-250 disabled:to-slate-350'
                      }`}
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Memproses...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          {responseType === 'accepted' ? 'Konfirmasi Terima' : 'Konfirmasi Tolak'}
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AK Assessment Modal - Modern Design */}
          {showAKModal && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-3xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden transform transition-all animate-fade-in">
                {/* Modal Header with Gradient */}
                <div className="bg-gradient-to-r from-indigo-600 to-blue-650 p-6 text-white">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="w-10 h-10" />
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">Penilaian Asesmen Kecukupan (AK)</h2>
                      <p className="text-xs opacity-90 font-medium mt-0.5">Berikan penilaian objektif berdasarkan 7 Kriteria LAM-TEK 2025</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Submission Info Card */}
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-start gap-3">
                      <FileText className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black text-slate-800 text-lg">{selectedSubmission?.programStudi}</p>
                        <p className="text-sm text-slate-500 font-semibold mt-0.5">{selectedSubmission?.institusi}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{selectedSubmission?.submissionId}</p>
                      </div>
                    </div>
                  </div>

                  {/* Info Alert */}
                  <div className="bg-indigo-50/50 border border-indigo-150/60 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-indigo-650 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-indigo-850 font-semibold leading-relaxed">
                      <p className="font-black uppercase tracking-wider mb-1">Panduan Penilaian Asesor:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-indigo-750 font-medium">
                        <li>Lakukan penilaian terukur dengan skor skala 0.00 hingga 4.00</li>
                        <li>Pastikan seluruh 7 kriteria terisi lengkap sebelum mengirim</li>
                        <li>Sediakan justifikasi catatan secara detail untuk kemudahan review</li>
                      </ul>
                    </div>
                  </div>

                  {/* Scoring Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.keys(akScores).map((key, index) => (
                      <div key={key} className="bg-slate-50/50 backdrop-blur-sm rounded-xl p-4 border border-slate-200/80 hover:border-indigo-300 transition-all flex flex-col justify-between min-h-[120px]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xs">
                            {index + 1}
                          </span>
                          <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                            Kriteria {index + 1}
                          </label>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="4"
                          step="0.01"
                          value={akScores[key]}
                          onChange={(e) => setAkScores({ ...akScores, [key]: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-black text-lg text-center text-indigo-650 bg-white"
                          required
                        />
                        <p className="text-[9px] font-extrabold text-slate-400 text-center mt-1 uppercase tracking-wider">Skor 0 - 4</p>
                      </div>
                    ))}
                  </div>

                  {/* Notes Section */}
                  <div className="bg-amber-50/40 rounded-xl p-5 border border-amber-200/60">
                    <label className="block text-xs font-black text-amber-800 mb-2.5 flex items-center gap-2 uppercase tracking-wider">
                      <FileText className="w-4 h-4" />
                      Catatan & Justifikasi Penilaian
                    </label>
                    <textarea
                      value={akNotes}
                      onChange={(e) => setAkNotes(e.target.value)}
                      placeholder="Tambahkan catatan penilaian, justifikasi skor, dan rekomendasi untuk perbaikan..."
                      className="w-full px-4 py-3 border border-amber-200/60 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none bg-white font-semibold text-sm"
                      rows={4}
                    />
                  </div>

                  {/* Warning Alert */}
                  <div className="bg-rose-50/50 border border-rose-200/60 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-rose-800 leading-relaxed">
                      <span className="font-black uppercase tracking-wider">Perhatian:</span> Penilaian AK akan dicatat secara permanen di blockchain dan tidak dapat diubah setelah disubmit. Pastikan semua skor dan catatan sudah benar.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      onClick={() => setShowAKModal(false)}
                      disabled={submitting}
                      className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSubmitAK}
                      disabled={submitting}
                      className="px-8 py-3 bg-gradient-to-tr from-indigo-600 to-blue-650 hover:from-indigo-700 hover:to-blue-750 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer shadow-md flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Menyimpan Penilaian...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Kirim Penilaian AK
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
