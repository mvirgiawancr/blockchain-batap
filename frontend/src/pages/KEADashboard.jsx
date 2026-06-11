import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSubmissions } from '../services/api';
import wsService from '../services/websocket';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  Users, CheckSquare, XSquare, Clock, AlertTriangle, 
  TrendingUp, FileCheck, Award, Search, Filter, RefreshCw,
  FileText, CheckCircle, XCircle, AlertCircle, ShieldAlert
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function KEADashboard({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Offer form state
  const [selectedAssessor1, setSelectedAssessor1] = useState('');
  const [selectedAssessor2, setSelectedAssessor2] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Stats
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pendingOffers: 0,
    assignedAssessors: 0,
    akPending: 0,
    akConsistent: 0,
    akInconsistent: 0
  });

  useEffect(() => {
    loadAssessors();
    loadSubmissions();
    
    const wsId = (user && (user.username || user.id)) || 'kea';
    wsService.connect(wsId);
    wsService.on('AssessorOfferCreated', loadSubmissions);
    wsService.on('AssessorResponded', loadSubmissions);
    wsService.on('UPPSResponded', loadSubmissions);
    wsService.on('AKAssessmentSubmitted', loadSubmissions);
    
    return () => wsService.disconnect();
  }, [user]);

  const loadAssessors = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('[KEA] Loading assessors from:', `${API_BASE_URL}/assessors`);
      
      const response = await fetch(`${API_BASE_URL}/assessors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      console.log('[KEA] Assessors response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[KEA] Assessors data:', data);
        const assessorList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        console.log('[KEA] Assessors count:', assessorList.length);
        setAssessors(assessorList);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[KEA] Failed to load assessors:', response.status, errorData);
        setAssessors([]);
      }
    } catch (err) {
      console.error('[KEA] Error loading assessors:', err);
      setAssessors([]);
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const res = await getAllSubmissions();
      const list = Array.isArray(res.data) ? res.data : [];
      
      // Calculate stats
      const pendingOffers = list.filter(s => s.currentOffer?.status === 'pending').length;
      const assigned = list.filter(s => s.assignedAssessors).length;
      const akPending = list.filter(s => s.assignedAssessors && (!s.akAssessments || s.akAssessments.length < 2)).length;
      const akConsistent = list.filter(s => s.akConsistent === true).length;
      const akInconsistent = list.filter(s => s.akAssessments?.length >= 2 && s.akConsistent === false).length;
      
      setStats({
        totalSubmissions: list.length,
        pendingOffers,
        assignedAssessors: assigned,
        akPending,
        akConsistent,
        akInconsistent
      });
      
      setSubmissions(list);
    } catch (err) {
      console.error('Error loading submissions:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOfferAssessors = async () => {
    if (!selectedSubmission || !selectedAssessor1 || !selectedAssessor2) {
      setMessage({ type: 'error', text: 'Pilih kedua asesor' });
      return;
    }

    if (selectedAssessor1 === selectedAssessor2) {
      setMessage({ type: 'error', text: 'Asesor 1 dan Asesor 2 harus berbeda' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const token = localStorage.getItem('token');
      const assessor1 = assessors.find(a => a.id === selectedAssessor1);
      const assessor2 = assessors.find(a => a.id === selectedAssessor2);

      const response = await fetch(`${API_BASE_URL}/kea/assign/${selectedSubmission.submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assessor1Id: assessor1.id,
          assessor1Name: assessor1.name,
          assessor2Id: assessor2.id,
          assessor2Name: assessor2.name,
          notes: offerNotes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal mengirim penawaran');
      }

      setMessage({ type: 'success', text: 'Penawaran asesor berhasil dikirim!' });
      setShowOfferModal(false);
      setSelectedAssessor1('');
      setSelectedAssessor2('');
      setOfferNotes('');
      await loadSubmissions();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckConsistency = async (submission) => {
    if (!submission.akAssessments || submission.akAssessments.length < 2) {
      setMessage({ type: 'error', text: 'Belum ada 2 penilaian AK' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Calculate consistency (simple example: check if scores are within threshold)
      const scores1 = submission.akAssessments[0].totalScore;
      const scores2 = submission.akAssessments[1].totalScore;
      const difference = Math.abs(scores1 - scores2);
      const consistent = difference <= 20; // 20 point threshold
      
      const response = await fetch(`${API_BASE_URL}/kea/consistency/${submission.submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          consistent,
          notes: `Selisih skor: ${difference} poin`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal memeriksa konsistensi');
      }

      setMessage({ 
        type: 'success', 
        text: consistent ? 'Skor konsisten ✓' : 'Skor tidak konsisten - perlu penilaian ulang' 
      });
      await loadSubmissions();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = sub.programStudi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.institusi?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending-offer') return sub.currentOffer?.status === 'pending';
    if (filterStatus === 'assigned') return sub.assignedAssessors && !sub.akConsistent;
    if (filterStatus === 'ak-complete') return sub.akConsistent === true;
    
    return true;
  });

  const openOfferModal = (submission) => {
    setSelectedSubmission(submission);
    setShowOfferModal(true);
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('kea')}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <Award className="w-8 h-8 text-purple-650" />
                Evaluasi & Akreditasi
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">
                Monitor penugasan asesor, hasil asesmen kecukupan, dan analisis konsistensi skor LAM-TEK
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadSubmissions}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-purple-650 font-bold text-xs cursor-pointer active:scale-95"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>
          </div>


          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4.5">
            {/* Total Submissions */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex items-center justify-between group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Berkas</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalSubmissions}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* Penawaran Pending */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex items-center justify-between group">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Tawaran Pending</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{stats.pendingOffers}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Asesor Ditugaskan */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex items-center justify-between group">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Asesor Ditunjuk</p>
                <p className="text-2xl font-black text-emerald-650 mt-1">{stats.assignedAssessors}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* AK Pending */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex items-center justify-between group">
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-500" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Penilaian Pending</p>
                <p className="text-2xl font-black text-orange-600 mt-1">{stats.akPending}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* AK Konsisten */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex items-center justify-between group">
              <div className="absolute top-0 left-0 w-full h-1 bg-teal-500" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Skor Konsisten</p>
                <p className="text-2xl font-black text-teal-650 mt-1">{stats.akConsistent}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>

            {/* AK Perlu Review */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex items-center justify-between group">
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Perlu Review</p>
                <p className="text-2xl font-black text-rose-650 mt-1">{stats.akInconsistent}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-150 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filters - Glass Box */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[280px]">
                <div className="relative">
                  <Search className="absolute left-4.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan program studi, institusi universitas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-800 text-sm font-semibold transition-all duration-200 shadow-inner-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 shadow-sm cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-purple-600 text-white shadow-purple-100 shadow-lg'
                      : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-650'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setFilterStatus('pending-offer')}
                  className={`px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 shadow-sm cursor-pointer ${
                    filterStatus === 'pending-offer'
                      ? 'bg-amber-600 text-white shadow-amber-100 shadow-lg'
                      : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-650'
                  }`}
                >
                  Tawaran Pending
                </button>
                <button
                  onClick={() => setFilterStatus('assigned')}
                  className={`px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 shadow-sm cursor-pointer ${
                    filterStatus === 'assigned'
                      ? 'bg-emerald-600 text-white shadow-emerald-100 shadow-lg'
                      : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-650'
                  }`}
                >
                  Ditugaskan
                </button>
                <button
                  onClick={() => setFilterStatus('ak-complete')}
                  className={`px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 shadow-sm cursor-pointer ${
                    filterStatus === 'ak-complete'
                      ? 'bg-indigo-600 text-white shadow-indigo-100 shadow-lg'
                      : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-650'
                  }`}
                >
                  AK Selesai
                </button>
              </div>
            </div>
          </div>

          {/* Message Alert */}
          {message.text && (
            <div className={`rounded-xl p-4.5 border flex items-start gap-3 shadow-sm animate-fade-in ${
              message.type === 'success' 
                ? 'bg-emerald-50 border-emerald-150 text-emerald-800' 
                : 'bg-rose-50 border-rose-150 text-rose-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <p className="font-semibold text-sm leading-relaxed">{message.text}</p>
            </div>
          )}

          {/* Submissions Table - Glass Box */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="px-6 py-4.5 text-left">Program Studi</th>
                    <th className="px-6 py-4.5 text-left">Institusi</th>
                    <th className="px-6 py-4.5 text-left">Status Penawaran</th>
                    <th className="px-6 py-4.5 text-left">Pasangan Asesor</th>
                    <th className="px-6 py-4.5 text-left">Status Penilaian AK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-16 text-center text-slate-500 font-semibold">
                        <Clock className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                        Memuat data pengajuan...
                      </td>
                    </tr>
                  ) : filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-16 text-center text-slate-400 font-semibold leading-relaxed">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        Tidak ada berkas pengajuan yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <tr key={sub.submissionId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4.5">
                          <div className="font-black text-slate-900 leading-snug">{sub.programStudi}</div>
                          <div className="text-[10px] text-slate-400 font-bold font-mono tracking-tight mt-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded inline-block">
                            {sub.submissionId}
                          </div>
                        </td>
                        <td className="px-6 py-4.5 font-bold text-slate-700">{sub.institusi}</td>
                        <td className="px-6 py-4.5">
                          {sub.currentOffer ? (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border shadow-sm ${
                              sub.currentOffer.status === 'pending' ? 'bg-amber-55/60 border-amber-200 text-amber-800' :
                              sub.currentOffer.status === 'completed' ? 'bg-emerald-55/60 border-emerald-250 text-emerald-800' :
                              'bg-rose-55/60 border-rose-250 text-rose-800'
                            }`}>
                              {sub.currentOffer.status}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">Belum ditawarkan</span>
                          )}
                        </td>
                        <td className="px-6 py-4.5">
                          {sub.assignedAssessors ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-750">
                                <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <span>{sub.assignedAssessors.assessor1Name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-750">
                                <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <span>{sub.assignedAssessors.assessor2Name}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4.5">
                          {sub.akAssessments && sub.akAssessments.length > 0 ? (
                            <div className="space-y-1.5">
                              <div className="text-xs font-bold text-slate-500">
                                {sub.akAssessments.length} / 2 Penilaian Masuk
                              </div>
                              {sub.akConsistent === true && (
                                <span className="inline-flex px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-black uppercase text-emerald-700 shadow-sm">
                                  ✓ Konsisten
                                </span>
                              )}
                              {sub.akConsistent === false && (
                                <span className="inline-flex px-2.5 py-0.5 bg-rose-50 border border-rose-200 rounded-full text-[10px] font-black uppercase text-rose-700 shadow-sm">
                                  ✗ Tidak Konsisten
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold">Belum dimulai</span>
                          )}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Offer Modal */}
          {showOfferModal && selectedSubmission && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col">
                <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600" />
                <div className="p-7 space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1 flex items-center gap-2">
                      <Users className="w-6 h-6 text-purple-600" />
                      Tawarkan Pasangan Asesor
                    </h2>
                    <p className="text-slate-500 text-xs font-semibold">Tugaskan sepasang asesor untuk melakukan Asesmen Kecukupan (AK) program studi</p>
                  </div>
                  
                  <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-150 shadow-inner-sm">
                    <p className="text-[10px] font-black text-purple-650 uppercase tracking-wider mb-1">Sasaran Program Studi</p>
                    <p className="text-base font-black text-purple-900 leading-snug">{selectedSubmission.programStudi}</p>
                    <p className="text-xs font-semibold text-purple-750 mt-0.5">{selectedSubmission.institusi}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Asesor 1 */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">
                        Asesor 1 <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <select
                        value={selectedAssessor1}
                        onChange={(e) => setSelectedAssessor1(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-805 text-sm font-semibold transition-all duration-200 shadow-sm cursor-pointer"
                        required
                      >
                        <option value="">-- Pilih Asesor Pertama --</option>
                        {assessors.map(assessor => (
                          <option key={assessor.id} value={assessor.id}>
                            {assessor.name} {assessor.institution ? `(${assessor.institution})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Asesor 2 */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">
                        Asesor 2 <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <select
                        value={selectedAssessor2}
                        onChange={(e) => setSelectedAssessor2(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-805 text-sm font-semibold transition-all duration-200 shadow-sm cursor-pointer"
                        required
                      >
                        <option value="">-- Pilih Asesor Kedua --</option>
                        {assessors.map(assessor => (
                          <option key={assessor.id} value={assessor.id}>
                            {assessor.name} {assessor.institution ? `(${assessor.institution})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Catatan Penugasan */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">
                        Catatan Khusus <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <textarea
                        value={offerNotes}
                        onChange={(e) => setOfferNotes(e.target.value)}
                        placeholder="Berikan instruksi tambahan atau batas waktu penyelesaian penugasan..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-semibold transition-all duration-200 shadow-inner-sm min-h-[90px]"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={handleOfferAssessors}
                      disabled={submitting || !selectedAssessor1 || !selectedAssessor2}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-tr from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl disabled:from-slate-300 disabled:to-slate-400 transition-all font-black text-xs uppercase tracking-wider cursor-pointer shadow-md disabled:shadow-none shadow-purple-100 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {submitting ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Mengirim Penawaran...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4" />
                          Kirim Penawaran Penugasan
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowOfferModal(false);
                        setSelectedAssessor1('');
                        setSelectedAssessor2('');
                        setOfferNotes('');
                      }}
                      disabled={submitting}
                      className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/40 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Batal
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
