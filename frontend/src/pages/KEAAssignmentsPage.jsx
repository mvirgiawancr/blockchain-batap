import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  Users, Search, UserPlus, Send, Calendar, Award, Star, Sparkles, 
  Clock, Lock, CheckCircle, AlertTriangle, RefreshCw, X, GraduationCap
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const KEAAssignmentsPage = ({ user }) => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssessors, setLoadingAssessors] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedAssessors, setSelectedAssessors] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationContent, setNotificationContent] = useState({
    type: 'processing',
    title: '',
    message: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const submissionsRes = await fetch(`${API_BASE_URL}/kea/submissions-approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (submissionsRes.ok) {
        const data = await submissionsRes.json();
        setSubmissions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssessorsForSubmission = async (submission) => {
    setSelectedSubmission(submission);
    setLoadingAssessors(true);
    setSelectedAssessors([]);
    
    try {
      const token = localStorage.getItem('token');
      const programStudi = encodeURIComponent(submission.programStudi);
      
      const response = await fetch(
        `${API_BASE_URL}/kea/assessors?programStudi=${programStudi}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        const list = data.assessors || data.data || data;
        setAssessors(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error('Error loading assessors:', error);
    } finally {
      setLoadingAssessors(false);
    }
  };

  const handleAssignAssessors = async () => {
    if (selectedAssessors.length !== 2) {
      setNotificationContent({
        type: 'error',
        title: 'Formulir Tidak Lengkap',
        message: 'Mohon pilih tepat 2 asesor terlebih dahulu untuk melakukan penugasan.'
      });
      setShowNotificationModal(true);
      return;
    }

    setAssigning(true);
    setNotificationContent({
      type: 'processing',
      title: 'Menugaskan Asesor',
      message: 'Sedang memproses penugasan tim asesor dan mencatat transaksi pada blockchain...'
    });
    setShowNotificationModal(true);

    try {
      const token = localStorage.getItem('token');
      const assessor1 = assessors.find(a => a.id === selectedAssessors[0]);
      const assessor2 = assessors.find(a => a.id === selectedAssessors[1]);

      const response = await fetch(
        `${API_BASE_URL}/kea/assign/${selectedSubmission.submissionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assessor1Id: assessor1.id,
            assessor1Name: assessor1.name,
            assessor2Id: assessor2.id,
            assessor2Name: assessor2.name
          }),
        }
      );

      if (response.ok) {
        setNotificationContent({
          type: 'success',
          title: 'Penugasan Berhasil',
          message: 'Kedua asesor berhasil ditugaskan dan penugasan telah dicatat pada blockchain secara permanen!'
        });
        setSelectedSubmission(null);
        setSelectedAssessors([]);
        loadData();
      } else {
        const err = await response.json();
        setNotificationContent({
          type: 'error',
          title: 'Gagal Menugaskan',
          message: `Gagal menugaskan asesor: ${err.error || 'Terjadi kesalahan pada sistem'}`
        });
      }
    } catch (error) {
      console.error('Error assigning assessors:', error);
      setNotificationContent({
        type: 'error',
        title: 'Kesalahan Sistem',
        message: 'Terjadi kesalahan sistem saat mencoba menugaskan asesor.'
      });
    } finally {
      setAssigning(false);
    }
  };

  const toggleAssessor = (assessorId) => {
    if (selectedAssessors.includes(assessorId)) {
      setSelectedAssessors(selectedAssessors.filter((id) => id !== assessorId));
    } else {
      if (selectedAssessors.length >= 2) {
        // Automatically swap out the first selected or prevent adding more than 2
        setSelectedAssessors([selectedAssessors[1], assessorId]);
      } else {
        setSelectedAssessors([...selectedAssessors, assessorId]);
      }
    }
  };

  const getScoreBadge = (score) => {
    if (score >= 90) return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', label: 'Sangat Cocok' };
    if (score >= 70) return { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-800', label: 'Cocok' };
    if (score >= 50) return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', label: 'Cukup' };
    return { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', label: 'Kurang Cocok' };
  };

  const filteredSubmissions = submissions.filter(
    (s) =>
      s.programStudi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.institusi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[600px] h-[600px] bg-indigo-200/10 rounded-full blur-[150px] pointer-events-none" />

      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('kea')}
      />

      <div className="flex-1 ml-64 overflow-auto relative z-10">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm shadow-purple-100/50">
                  <Users className="w-5 h-5" />
                </div>
                Penugasan Asesor
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">
                Tugaskan pasangan asesor dengan bantuan rekomendasi keahlian berbasis kecerdasan buatan (AI)
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-purple-600 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>

          {/* Search - Glass Box */}
          <div className="glass-panel-light rounded-2xl p-6 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari berdasarkan program studi atau institusi universitas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-800 text-sm font-semibold transition-all duration-200 outline-none focus:shadow-sm"
              />
            </div>
          </div>

          {/* Submissions Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 glass-panel-light rounded-2xl shadow-sm animate-pulse">
              <Users className="w-12 h-12 text-purple-500 animate-bounce mb-3" />
              <p className="text-slate-500 font-bold text-sm">Memuat data pengajuan akreditasi...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="glass-panel-light rounded-2xl p-16 text-center shadow-sm max-w-2xl mx-auto my-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Pengajuan</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Tidak ada berkas pengajuan lolos verifikasi yang membutuhkan penugasan asesor saat ini.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {filteredSubmissions.map((submission) => {
                const isAssigned = !!submission.assignedAssessors;
                const isForceAssigned = submission.currentOffer && submission.currentOffer.status === 'force_assigned';
                const isPendingReview = submission.currentOffer && submission.currentOffer.status === 'pending_kea_review';
                const isPendingOffer = submission.currentOffer && submission.currentOffer.status !== 'rejected' && !isAssigned && !isForceAssigned && !isPendingReview;
                
                // Card Stripe Indicator Color
                let stripeColor = 'bg-slate-350';
                if (isAssigned) stripeColor = 'bg-emerald-500';
                else if (isForceAssigned) stripeColor = 'bg-indigo-500';
                else if (isPendingReview) stripeColor = 'bg-rose-500';
                else if (isPendingOffer) stripeColor = 'bg-amber-500';
                else if (submission.paymentStatus === 'verified') stripeColor = 'bg-purple-500';

                return (
                  <div
                    key={submission.submissionId}
                    className="glass-panel-light glass-panel-light-hover rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[320px]"
                  >
                    {/* Status Indicator Stripe */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${stripeColor}`} />

                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                          {submission.submissionId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {submission.paymentStatus === 'verified' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 border border-emerald-250 text-emerald-800 uppercase">
                              <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                              Lunas
                            </span>
                          ) : submission.paymentStatus === 'submitted' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-blue-50 border border-blue-200 text-blue-800 uppercase animate-pulse">
                              <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                              Bukti Unggah
                            </span>
                          ) : submission.paymentStatus === 'invoiced' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-amber-50 border border-amber-200 text-amber-800 uppercase">
                              <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                              Tagihan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-slate-50 border border-slate-200 text-slate-500 uppercase">
                              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                              Draft
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug truncate group-hover:text-purple-650 transition-colors">
                        {submission.programStudi}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 truncate mt-0.5 mb-5 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        {submission.institusi}
                      </p>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-slate-100/60">
                      {isAssigned ? (
                        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-150 shadow-inner-sm text-center">
                          <p className="text-[10px] text-emerald-800 font-black uppercase tracking-wide flex items-center justify-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Asesor Ditugaskan
                          </p>
                          <p className="text-[10px] text-slate-600 font-bold mt-1.5 truncate">
                            {submission.assignedAssessors.assessor1Name} & {submission.assignedAssessors.assessor2Name}
                          </p>
                        </div>
                      ) : isForceAssigned ? (
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-150 shadow-inner-sm text-center">
                          <p className="text-[10px] text-indigo-800 font-black uppercase tracking-wide flex items-center justify-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-indigo-600" />
                            Force Assigned (Permanen)
                          </p>
                          <p className="text-[10px] text-slate-600 font-bold mt-1.5 truncate">
                            {submission.currentOffer.assessor1Name} & {submission.currentOffer.assessor2Name}
                          </p>
                        </div>
                      ) : isPendingReview ? (
                        <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-150 shadow-inner-sm text-center cursor-pointer hover:bg-rose-50 transition-colors" onClick={() => navigate('/kea/rejection-review')}>
                          <p className="text-[10px] text-rose-800 font-black uppercase tracking-wide flex items-center justify-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                            Perlu Review Penolakan
                          </p>
                          <p className="text-[9px] text-rose-600 font-semibold mt-1">
                            UPPS Mengajukan penolakan. Klik untuk meninjau.
                          </p>
                        </div>
                      ) : isPendingOffer ? (
                        <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-150 shadow-inner-sm text-center">
                          <p className="text-[10px] text-amber-800 font-black uppercase tracking-wide flex items-center justify-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            Menunggu Respon UPPS
                          </p>
                          <p className="text-[10px] text-slate-600 font-bold mt-1.5 truncate">
                            {submission.currentOffer.assessor1Name} & {submission.currentOffer.assessor2Name}
                          </p>
                        </div>
                      ) : submission.paymentStatus !== 'verified' ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-rose-50/40 border border-rose-150/50 rounded-xl flex items-start gap-2.5 shadow-inner-sm">
                            <Lock className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-black text-rose-800 uppercase tracking-wider">Penugasan Terkunci</p>
                              <p className="text-[9px] text-rose-650 font-semibold leading-relaxed mt-0.5">
                                Pembayaran belum terverifikasi lunas oleh Sekretariat.
                              </p>
                            </div>
                          </div>
                          <button
                            disabled
                            className="w-full px-4 py-2.5 bg-slate-100 text-slate-400 border border-slate-200/50 rounded-xl font-bold text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2 shadow-inner-sm"
                          >
                            <Lock className="w-4 h-4" />
                            Tugaskan Asesor
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => loadAssessorsForSubmission(submission)}
                          className="w-full px-4 py-2.5 bg-gradient-to-tr from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-750 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg shadow-purple-100/80 flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                        >
                          <UserPlus className="w-4 h-4" />
                          Tugaskan Asesor
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Assignment Modal */}
          {selectedSubmission && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
                <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-650" />
                <div className="p-7 overflow-y-auto space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                          <Sparkles className="w-4.5 h-4.5" />
                        </div>
                        Tugaskan Asesor Program Studi
                      </h2>
                      <p className="text-slate-500 text-xs font-semibold">Tugaskan sepasang asesor dengan keahlian yang cocok untuk penilaian akreditasi</p>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedSubmission(null);
                        setSelectedAssessors([]);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-150/60 shadow-inner-sm">
                    <p className="text-[10px] font-black text-purple-650 uppercase tracking-wider mb-1">Sasaran Program Studi</p>
                    <p className="text-base font-black text-purple-900 leading-snug">{selectedSubmission.programStudi}</p>
                    <p className="text-xs font-semibold text-purple-750 mt-0.5 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                      {selectedSubmission.institusi}
                    </p>
                  </div>

                  {/* AI Recommendation Header */}
                  <div className="p-4.5 bg-gradient-to-tr from-purple-600 to-indigo-650 rounded-2xl text-white shadow-md shadow-purple-100/50 flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0 border border-white/20">
                      <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider">Rekomendasi AI Terpadu</span>
                      <p className="text-purple-50/90 text-xs font-semibold leading-relaxed mt-1">
                        Sistem AI telah memindai profil keahlian, riwayat publikasi, dan kecocokan Scopus/Scholar asesor dengan mata kuliah prodi <strong>"{selectedSubmission.programStudi}"</strong>.
                      </p>
                      <p className="text-purple-100 text-xs font-bold mt-2">
                        Pilih tepat 2 asesor untuk ditugaskan. Dipilih saat ini: <span className="bg-white/25 px-2 py-0.5 rounded-full text-white font-black">{selectedAssessors.length} / 2</span>
                      </p>
                    </div>
                  </div>

                  {/* Loading or Assessor Grid */}
                  {loadingAssessors ? (
                    <div className="text-center py-16 bg-purple-50/20 rounded-2xl border border-purple-150 flex flex-col items-center justify-center">
                      <div className="relative inline-block mb-4">
                        <Sparkles className="w-12 h-12 text-purple-600 animate-pulse" />
                        <div className="absolute inset-0 w-12 h-12 border-3 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
                      </div>
                      <h3 className="text-base font-black text-purple-900 mb-1">AI Sedang Menganalisis...</h3>
                      <p className="text-slate-400 text-xs font-semibold">Mencocokkan keahlian asesor dengan mata kuliah program studi</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {assessors.map((assessor) => {
                        const badge = getScoreBadge(assessor.similarityScore || 50);
                        const isSelected = selectedAssessors.includes(assessor.id);
                        return (
                          <div
                            key={assessor.id}
                            onClick={() => toggleAssessor(assessor.id)}
                            className={`p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                              isSelected
                                ? 'border-purple-650 bg-purple-50/50 shadow-md shadow-purple-50'
                                : 'border-slate-200/80 hover:border-purple-300 bg-white/70 hover:bg-white hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              {/* Assessor Details & Logo */}
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="relative flex-shrink-0">
                                  <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-650 shadow-inner">
                                    <Users className="w-5 h-5 text-slate-500" />
                                  </div>
                                  {assessor.similarityScore !== undefined && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-tr from-purple-500 to-indigo-650 rounded-full flex items-center justify-center border border-white text-[9px] font-black text-white">
                                      AI
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h3 className="font-black text-sm text-slate-900 leading-snug truncate">{assessor.name}</h3>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{assessor.institution || '-'}</p>
                                  <p className="text-xs font-semibold text-slate-600 mt-2 leading-relaxed">{assessor.expertise}</p>
                                  
                                  {/* Score Badge */}
                                  {assessor.similarityScore !== undefined && (
                                    <div className="flex items-center gap-2 mt-3.5">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border shadow-inner-sm flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                                        <Star className="w-2.5 h-2.5 fill-current" />
                                        {assessor.similarityScore}% {badge.label}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* AI Recommendation Quote */}
                                  {assessor.aiRecommendation && (
                                    <div className="mt-3.5 p-3 bg-purple-50/30 border border-purple-100/60 rounded-xl relative">
                                      <p className="text-[10px] text-purple-950/70 font-semibold italic leading-relaxed pl-1.5 border-l-2 border-purple-400">
                                        "{assessor.aiRecommendation}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Checkbox indicator */}
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150 flex-shrink-0 ${
                                isSelected ? 'bg-purple-650 border-purple-650 shadow-md shadow-purple-200' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-slate-100/60">
                    <button
                      onClick={handleAssignAssessors}
                      disabled={assigning || selectedAssessors.length !== 2}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-tr from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 disabled:shadow-none transition-all duration-200 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md disabled:shadow-none shadow-purple-100 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                    >
                      {assigning ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Menugaskan...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Tugaskan Kedua Asesor
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSubmission(null);
                        setSelectedAssessors([]);
                      }}
                      className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition-colors"
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
      
      {/* Premium Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="glass-panel-light max-w-sm w-full p-6 text-center shadow-2xl rounded-3xl border border-slate-100/80">
            {notificationContent.type === 'processing' && (
              <div className="w-16 h-16 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-purple-650 animate-spin" />
              </div>
            )}
            {notificationContent.type === 'success' && (
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
            )}
            {notificationContent.type === 'error' && (
              <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                <X className="w-8 h-8 text-rose-650" />
              </div>
            )}
            <h3 className="text-lg font-black text-slate-900 mb-1">{notificationContent.title}</h3>
            <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed">{notificationContent.message}</p>
            {notificationContent.type !== 'processing' && (
              <button
                onClick={() => setShowNotificationModal(false)}
                className="w-full py-2.5 bg-gradient-to-tr from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-750 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg transition-all"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KEAAssignmentsPage;
