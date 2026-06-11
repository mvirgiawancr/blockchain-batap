import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSubmissions, setDecision, getUsers, assignAssessor, getAssignment } from '../services/api';
import wsService from '../services/websocket';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { CheckCircle, XCircle, Clock, RefreshCw, FileText, Award, TrendingUp, AlertCircle, FileCheck, Download, Star } from 'lucide-react';
import ScoringResultDisplay from '../components/ScoringResultDisplay';
import ScoringDetailDropdown from '../components/ScoringDetailDropdown';

export default function SekretariatDashboard({ user }) {
  const navigate = useNavigate();
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('under_review');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ type: '', message: '' });
  const [assessors, setAssessors] = useState([]);
  const [selectedAssessorId, setSelectedAssessorId] = useState('');
  const [assignmentInfo, setAssignmentInfo] = useState(null);
 
  const handleDownload = async (submissionId, documentType, filename) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/download/${submissionId}/${documentType}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(`Download failed: ${error.message}`);
        return;
      }
 
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert(`Download failed: ${error.message}`);
    }
  };
 
  useEffect(() => {
    loadSubmissions();
    loadAssessors();
    
    const wsId = (user && (user.username || user.id)) || 'sekretariat';
    wsService.connect(wsId);
 
    wsService.on('SubmissionCreated', () => {
      loadSubmissions();
    });
 
    wsService.on('SubmissionDecided', () => {
      loadSubmissions();
    });
 
    return () => {
      wsService.disconnect();
    };
  }, [user]);
 
  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const response = await getAllSubmissions();
      setAllSubmissions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setAllSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAssessors = async () => {
    try {
      const res = await getUsers({ role: 'assessor' });
      const list = Array.isArray(res.data) ? res.data : [];
      setAssessors(list);
      if (list.length > 0 && !selectedAssessorId) {
        setSelectedAssessorId(list[0].id);
      }
    } catch (error) {
      console.error('Error loading assessors:', error);
    }
  };

  const loadAssignmentInfo = async (submissionId) => {
    try {
      const res = await getAssignment(submissionId);
      setAssignmentInfo(res.data || null);
      if (res.data?.assessor_user_id) {
        setSelectedAssessorId(res.data.assessor_user_id);
      }
    } catch (error) {
      setAssignmentInfo(null);
    }
  };

  const handleDecision = async (submissionId, decision) => {
    if (!decisionNotes.trim()) {
      setModalContent({
        type: 'error',
        message: 'Mohon masukkan catatan keputusan terlebih dahulu'
      });
      setShowModal(true);
      return;
    }

    try {
      setSubmitting(true);
      setModalContent({
        type: 'processing',
        message: 'Menyimpan keputusan ke blockchain...'
      });
      setShowModal(true);
      
      await setDecision(submissionId, {
        decision,
        notes: decisionNotes,
        decidedBy: user?.username || 'Sekretariat Admin'
      });
      
      setModalContent({
        type: 'success',
        message: `Submission berhasil ${decision === 'approved' ? 'disetujui' : 'ditolak'} dan tercatat di blockchain!`
      });
      
      setSelectedSubmission(null);
      setDecisionNotes('');
      
      setTimeout(() => {
        setShowModal(false);
        loadSubmissions();
      }, 2000);
    } catch (error) {
      setModalContent({
        type: 'error',
        message: 'Error: ' + (error.response?.data?.detail || error.message)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      under_review: { 
        bg: 'bg-amber-50 text-amber-800 border-amber-200/50', 
        icon: Clock,
        text: 'Menunggu Verifikasi' 
      },
      approved: { 
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-250/30', 
        icon: CheckCircle,
        text: 'Disetujui' 
      },
      rejected: { 
        bg: 'bg-rose-50 text-rose-800 border-rose-250/30', 
        icon: XCircle,
        text: 'Ditolak' 
      }
    };

    const config = styles[status] || styles.under_review;
    const Icon = config.icon;

    return (
      <span className={`${config.bg} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border shadow-sm`}>
        <Icon size={12} />
        {config.text}
      </span>
    );
  };

  const getStatistics = () => {
    const submissionArray = Array.isArray(allSubmissions) ? allSubmissions : [];
    const total = submissionArray.length;
    const pending = submissionArray.filter(s => s.status === 'under_review').length;
    const approved = submissionArray.filter(s => s.status === 'approved').length;
    const rejected = submissionArray.filter(s => s.status === 'rejected').length;
    
    return { total, pending, approved, rejected };
  };

  const stats = getStatistics();
  const displayedSubmissions = allSubmissions.filter(sub => sub.status === filter);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')} 
        menuItems={getMenuForRole('sekretariat')} 
      />
      
      <div className="flex-1 ml-64 overflow-auto">
        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full p-8 text-center flex flex-col items-center">
              {modalContent.type === 'processing' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 shadow-sm animate-pulse">
                    <Clock className="w-8 h-8 text-indigo-650 animate-spin" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">Memproses Keputusan</h3>
                  <p className="text-slate-500 text-sm font-semibold leading-relaxed">{modalContent.message}</p>
                </>
              )}
              
              {modalContent.type === 'success' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 shadow-md">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-black text-emerald-800 mb-2">Berhasil Disimpan</h3>
                  <p className="text-slate-500 text-sm font-semibold leading-relaxed mb-6">{modalContent.message}</p>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    Tutup Notifikasi
                  </button>
                </>
              )}
              
              {modalContent.type === 'error' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 shadow-md">
                    <AlertCircle className="w-8 h-8 text-rose-600" />
                  </div>
                  <h3 className="text-lg font-black text-rose-800 mb-2">Gagal Memproses</h3>
                  <p className="text-slate-500 text-sm font-semibold leading-relaxed mb-6">{modalContent.message}</p>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    Tutup Notifikasi
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 mb-2 tracking-tight">
                <Award className="w-8 h-8 text-indigo-650" />
                Dashboard Sekretariat
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Verifikasi dan Validasi Kelengkapan Dokumen Pengajuan Akreditasi</p>
            </div>
            <button
              onClick={loadSubmissions}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 shadow-sm cursor-pointer hover:-translate-y-0.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Data
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm flex items-center justify-between border-l-4 border-l-indigo-650">
              <div>
                <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Total Submission</p>
                <p className="text-2xl font-black text-slate-950 mt-0.5">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-250/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-indigo-650" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm flex items-center justify-between border-l-4 border-l-amber-500">
              <div>
                <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Menunggu Tinjauan</p>
                <p className="text-2xl font-black text-amber-700 mt-0.5">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 border border-amber-250/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-600">
              <div>
                <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Disetujui</p>
                <p className="text-2xl font-black text-emerald-700 mt-0.5">{stats.approved}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-250/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm flex items-center justify-between border-l-4 border-l-rose-600">
              <div>
                <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Ditolak</p>
                <p className="text-2xl font-black text-rose-700 mt-0.5">{stats.rejected}</p>
              </div>
              <div className="w-10 h-10 bg-rose-50 border border-rose-250/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-rose-650" />
              </div>
            </div>
          </div>

          {/* Submissions Section */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
            {/* Filter Tabs - Premium Glass Capsule */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="bg-slate-100/80 p-1 rounded-xl flex flex-wrap gap-1 border border-slate-200/20 w-full md:w-auto">
                <button
                  onClick={() => setFilter('under_review')}
                  className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    filter === 'under_review'
                      ? 'bg-amber-500 text-white shadow-sm shadow-amber-250'
                      : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Clock size={14} />
                  Menunggu Tinjauan ({stats.pending})
                </button>
                <button
                  onClick={() => setFilter('approved')}
                  className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    filter === 'approved'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-250'
                      : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle size={14} />
                  Disetujui ({stats.approved})
                </button>
                <button
                  onClick={() => setFilter('rejected')}
                  className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    filter === 'rejected'
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-250'
                      : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <XCircle size={14} />
                  Ditolak ({stats.rejected})
                </button>
              </div>
              
              <button
                onClick={loadSubmissions}
                className="px-3.5 py-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-750 rounded-xl transition-all shadow-inner-sm cursor-pointer self-end md:self-auto flex items-center justify-center"
                title="Muat Ulang Data"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm animate-pulse">
                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                <p className="text-slate-550 font-bold text-sm">Memuat data pengisian akreditasi...</p>
              </div>
            ) : displayedSubmissions.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-16 text-center shadow-sm max-w-2xl mx-auto my-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Tidak Ada Data</h3>
                <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                  Tidak ditemukan berkas submission pengajuan program studi dengan status "{filter === 'under_review' ? 'Menunggu Tinjauan' : filter === 'approved' ? 'Disetujui' : 'Ditolak'}" saat ini.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {displayedSubmissions.map((sub) => (
                  <div key={sub.submissionId} className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 hover:shadow-md hover:border-slate-350 transition-all duration-200 relative overflow-hidden shadow-sm hover:-translate-y-0.5">
                    {/* Status Top border line indicator */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${
                      sub.status === 'under_review' ? 'bg-amber-500' :
                      sub.status === 'approved' ? 'bg-emerald-600' : 'bg-rose-600'
                    }`} />
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-5 pb-5 border-b border-slate-100/80">
                      <div className="flex-1">
                        <div className="flex items-center gap-3.5 mb-2">
                          <div className="w-11 h-11 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                            <FileCheck className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">{sub.programStudi}</h3>
                            <p className="text-xs font-semibold text-slate-500">{sub.institusi}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 font-extrabold uppercase mt-4">
                          <span className="bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg font-mono">
                            ID: <strong className="text-slate-700 font-bold">{sub.submissionId.substring(0, 18)}...</strong>
                          </span>
                          <span className="bg-indigo-50 border border-indigo-100 text-indigo-750 px-2.5 py-1 rounded-lg">
                            Versi: {sub.version}
                          </span>
                          <span className="bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                            Diajukan: {new Date(sub.createdAt).toLocaleDateString('id-ID', {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(sub.status)}
                      </div>
                    </div>

                    {/* AI Analysis Panel */}
                    {sub.ai && (
                      <div className="bg-indigo-50/20 rounded-xl p-5 border border-indigo-150/40 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                          <h4 className="text-sm font-black text-indigo-950 uppercase tracking-wide">Analisis Kelengkapan AI Gemini</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                          <div className="bg-white rounded-xl p-4 border border-slate-200/50 shadow-sm flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Kelengkapan LED</span>
                            <div className="flex items-center gap-2">
                              {(sub.ai.hasLED !== undefined ? sub.ai.hasLED : sub.documents?.some(d => d.type === 'LED')) ? (
                                <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">✓ Valid</span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-full text-[10px] font-black uppercase tracking-wider">✗ Tidak Ada</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-white rounded-xl p-4 border border-slate-200/50 shadow-sm flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Kelengkapan LKPS</span>
                            <div className="flex items-center gap-2">
                              {(sub.ai.hasLKPS !== undefined ? sub.ai.hasLKPS : sub.documents?.some(d => d.type === 'LKPS')) ? (
                                <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">✓ Valid</span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-full text-[10px] font-black uppercase tracking-wider">✗ Tidak Ada</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Automated Scoring display with Gemini confidence */}
                        {(sub.ai.scoring || sub.ai.scoringResults) && (
                          <div className="mb-5 bg-white border border-slate-200/60 p-5 rounded-xl shadow-sm">
                            <div className="flex items-center gap-2 mb-3.5">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide">Hasil Skoring Otomatis AI (LAM-TEK 2025)</h5>
                            </div>
                            <ScoringResultDisplay scoringResult={sub.ai.scoring || sub.ai.scoringResults} />
                            
                            <div className="mt-4 border-t border-slate-100 pt-4">
                              <ScoringDetailDropdown scoring={sub.ai.scoring || sub.ai.scoringResults} />
                            </div>
                          </div>
                        )}
                        
                        {sub.ai.flags && sub.ai.flags.length > 0 && (
                          <div className="mb-4 bg-white/60 p-4 rounded-xl border border-slate-200/30">
                            <p className="text-xs font-black text-slate-800 mb-2 uppercase tracking-wide">📋 Temuan Deteksi Sistem:</p>
                            <ul className="space-y-1.5">
                              {sub.ai.flags.map((flag, idx) => (
                                <li key={idx} className="text-xs font-semibold text-slate-600 bg-white/90 border border-slate-200/50 px-3 py-2 rounded-lg leading-relaxed">• {flag}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {sub.ai.recommendations && sub.ai.recommendations.length > 0 && (
                          <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-250/20">
                            <p className="text-xs font-black text-emerald-800 mb-2 uppercase tracking-wide">💡 Rekomendasi Peningkatan Dokumen:</p>
                            <ul className="space-y-1.5">
                              {sub.ai.recommendations.map((rec, idx) => (
                                <li key={idx} className="text-xs font-semibold text-emerald-950 bg-white/80 border border-emerald-200/40 px-3 py-2 rounded-lg leading-relaxed">• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Documents List */}
                    <div className="mb-6">
                      <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider mb-3.5 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-650" />
                        Dokumen Pengajuan
                      </h4>
                      <div className="grid gap-3.5 md:grid-cols-2">
                        {sub.documents.map((doc, idx) => (
                          <div key={idx} className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-4 shadow-inner-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <FileCheck className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-slate-900 leading-snug uppercase tracking-wide">{doc.type}</p>
                                  <p className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">{doc.filename || 'N/A'}</p>
                                  <p className="text-[9px] font-mono text-slate-350 truncate mt-1">CID: {doc.cid}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDownload(sub.submissionId, doc.type, doc.filename)}
                                className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider shadow-sm cursor-pointer hover:-translate-y-0.5"
                              >
                                <Download size={12} />
                                Unduh
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Decision Section */}
                    {sub.status === 'under_review' && (
                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/50 mt-4 shadow-inner-sm">
                        {selectedSubmission === sub.submissionId ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">
                                Catatan Keputusan Verifikasi <span className="text-rose-500">*</span>
                              </label>
                              <textarea
                                value={decisionNotes}
                                onChange={(e) => setDecisionNotes(e.target.value)}
                                placeholder="Masukkan alasan penolakan atau catatan persetujuan dokumen..."
                                className="w-full min-h-[100px] px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold transition-all duration-205 shadow-inner-sm"
                                required
                              />
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={() => handleDecision(sub.submissionId, 'approved')}
                                disabled={submitting}
                                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                              >
                                <CheckCircle size={16} />
                                Setujui Dokumen
                              </button>
                              <button
                                onClick={() => handleDecision(sub.submissionId, 'rejected')}
                                disabled={submitting}
                                className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                              >
                                <XCircle size={16} />
                                Tolak Dokumen
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedSubmission(null);
                                  setDecisionNotes('');
                                }}
                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all border border-slate-200/40 cursor-pointer hover:-translate-y-0.5"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedSubmission(sub.submissionId)}
                            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-705 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer hover:-translate-y-0.5 flex items-center justify-center gap-2"
                          >
                            <FileCheck size={16} />
                            Buat Keputusan Verifikasi Dokumen
                          </button>
                        )}
                      </div>
                    )}

                    {/* Final Decision Display */}
                    {sub.decision && (
                      <div className="bg-gradient-to-tr from-indigo-50/80 via-indigo-50/30 to-purple-50/15 border border-indigo-200/60 rounded-xl p-5 mt-4 shadow-sm">
                        <h4 className="text-indigo-850 font-black text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Award className="w-5 h-5" />
                          Keputusan Akhir Verifikasi Dokumen
                        </h4>
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between border-b border-indigo-100/50 pb-2.5">
                            <span className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wide">Hasil Keputusan:</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              sub.decision.result === 'approved' 
                                ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
                                : 'bg-rose-50 border-rose-250 text-rose-800'
                            }`}>
                              {sub.decision.result === 'approved' ? 'DISETUJUI' : 'DITOLAK'}
                            </span>
                          </div>
                          
                          <div className="bg-white/80 rounded-xl p-3 border border-slate-200/60 shadow-inner-sm">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Catatan Keputusan:</p>
                            <p className="text-xs font-bold text-slate-800 leading-relaxed">{sub.decision.notes}</p>
                          </div>
                          
                          <div className="flex justify-between text-[10px] text-slate-400 font-extrabold uppercase tracking-wide pt-1">
                            <span><strong>Verifikator:</strong> <span className="text-slate-700">{sub.decision.decidedBy}</span></span>
                            <span><strong>Tanggal:</strong> <span className="text-slate-700">{new Date(sub.decision.decidedAt).toLocaleString('id-ID')}</span></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

