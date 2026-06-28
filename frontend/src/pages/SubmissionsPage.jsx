import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { FileText, Clock, CheckCircle, XCircle, Download, RefreshCw, History, TrendingUp, Star, ChevronDown, ChevronRight, Award } from 'lucide-react';
import SubmissionHistoryModal from '../components/SubmissionHistoryModal';
import ScoringResultDisplay from '../components/ScoringResultDisplay';
import ScoringDetailDropdown from '../components/ScoringDetailDropdown';

export default function SubmissionsPage({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistorySubmission, setSelectedHistorySubmission] = useState(null);
  const [expandedScoring, setExpandedScoring] = useState(new Set());

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const rawData = result.data || [];
        const mappedData = (Array.isArray(rawData) ? rawData : []).map(sub => {
          const typeNames = {
            'S': 'Sarjana (S1)',
            'M': 'Magister (S2)',
            'D': 'Doktor (S3)',
            'D1': 'Diploma 1',
            'D2': 'Diploma 2',
            'D3': 'Diploma 3',
            'STr': 'Sarjana Terapan',
            'MTr': 'Magister Terapan',
            'DTr': 'Doktor Terapan',
            'PPI': 'Program Profesi/Internship'
          };
          
          const inferJenjang = (progStudi) => {
            if (!progStudi) return 'Sarjana (S1)';
            const name = progStudi.toLowerCase();
            if (name.includes('magister') || name.includes('s2') || name.includes('s-2')) return 'Magister (S2)';
            if (name.includes('doktor') || name.includes('s3') || name.includes('s-3')) return 'Doktor (S3)';
            if (name.includes('d3') || name.includes('d-3') || name.includes('diploma tiga') || name.includes('diploma 3')) return 'Diploma 3';
            if (name.includes('d2') || name.includes('d-2') || name.includes('diploma dua') || name.includes('diploma 2')) return 'Diploma 2';
            if (name.includes('d1') || name.includes('d-1') || name.includes('diploma satu') || name.includes('diploma 1')) return 'Diploma 1';
            if (name.includes('terapan') || name.includes('d4') || name.includes('d-4') || name.includes('str')) return 'Sarjana Terapan';
            if (name.includes('profesi') || name.includes('insinyur') || name.includes('ppi')) return 'Program Profesi/Internship';
            return 'Sarjana (S1)';
          };

          const inferJenjangFromDocs = (documents) => {
            if (!Array.isArray(documents)) return null;
            for (const doc of documents) {
              const fname = (doc.filename || doc.fileName || doc.name || '').toLowerCase();
              if (fname) {
                if (fname.includes('s3') || fname.includes('s-3') || fname.includes('doktor') || fname.includes('doctor')) return 'D';
                if (fname.includes('s2') || fname.includes('s-2') || fname.includes('magister') || fname.includes('master')) return 'M';
                if (fname.includes('d3') || fname.includes('d-3') || fname.includes('diploma tiga') || fname.includes('diploma 3')) return 'D3';
                if (fname.includes('d2') || fname.includes('d-2') || fname.includes('diploma dua') || fname.includes('diploma 2')) return 'D2';
                if (fname.includes('d1') || fname.includes('d-1') || fname.includes('diploma satu') || fname.includes('diploma 1')) return 'D1';
                if (fname.includes('terapan') || fname.includes('d4') || fname.includes('d-4') || fname.includes('str')) return 'STr';
                if (fname.includes('profesi') || fname.includes('insinyur') || fname.includes('ppi')) return 'PPI';
                if (fname.includes('s1') || fname.includes('s-1') || fname.includes('sarjana') || fname.includes('bachelor')) return 'S';
              }
            }
            return null;
          };

          const rawType = sub.programType || 
                          sub.ai?.scoring?.programType || 
                          sub.ai?.scoringResults?.programType || 
                          sub.scoringResult?.programType;

          let pType = 'S';
          if (rawType) {
            const rt = String(rawType).trim().toUpperCase();
            if (typeNames[rt]) {
              pType = rt;
            } else {
              const rtLower = rt.toLowerCase();
              if (rtLower.includes('doktor') || rtLower.includes('doctor') || rtLower === 'd') pType = 'D';
              else if (rtLower.includes('magister') || rtLower.includes('master') || rtLower === 'm') pType = 'M';
              else if (rtLower.includes('profesi') || rtLower === 'ppi') pType = 'PPI';
              else if (rtLower.includes('diploma 3') || rtLower.includes('d3') || rtLower === 'd3') pType = 'D3';
              else if (rtLower.includes('diploma 2') || rtLower.includes('d2') || rtLower === 'd2') pType = 'D2';
              else if (rtLower.includes('diploma 1') || rtLower.includes('d1') || rtLower === 'd1') pType = 'D1';
              else if (rtLower.includes('sarjana terapan') || rtLower === 'str') pType = 'STr';
              else if (rtLower.includes('magister terapan') || rtLower === 'mtr') pType = 'MTr';
              else if (rtLower.includes('doktor terapan') || rtLower === 'dtr') pType = 'DTr';
              else if (rtLower.includes('sarjana') || rtLower === 's') pType = 'S';
            }
          } else {
            const inferredFromStudi = sub.programStudi ? inferJenjang(sub.programStudi) : null;
            if (!inferredFromStudi || inferredFromStudi === 'Sarjana (S1)') {
              const inferredFromDocs = inferJenjangFromDocs(sub.documents);
              if (inferredFromDocs) {
                pType = inferredFromDocs;
              } else if (inferredFromStudi) {
                return {
                  ...sub,
                  programType: 'S',
                  jenjang: sub.jenjang && sub.jenjang !== '-' && sub.jenjang !== 'N/A'
                    ? sub.jenjang
                    : inferredFromStudi
                };
              }
            } else {
              if (inferredFromStudi === 'Magister (S2)') pType = 'M';
              else if (inferredFromStudi === 'Doktor (S3)') pType = 'D';
              else if (inferredFromStudi === 'Diploma 3') pType = 'D3';
              else if (inferredFromStudi === 'Diploma 2') pType = 'D2';
              else if (inferredFromStudi === 'Diploma 1') pType = 'D1';
              else if (inferredFromStudi === 'Sarjana Terapan') pType = 'STr';
              else if (inferredFromStudi === 'Program Profesi/Internship') pType = 'PPI';
            }
          }

          return {
            ...sub,
            programType: pType,
            jenjang: sub.jenjang && sub.jenjang !== '-' && sub.jenjang !== 'N/A'
              ? sub.jenjang 
              : (typeNames[pType] || inferJenjang(sub.programStudi))
          };
        });
        setSubmissions(mappedData);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleScoring = (submissionId) => {
    const newExpanded = new Set(expandedScoring);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedScoring(newExpanded);
  };

  const getStatusBadge = (status, hasCertificate = false) => {
    const config = {
      'pending': { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: 'Menunggu Verifikasi' },
      'under_review': { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Clock, label: 'Dalam Tinjauan' },
      'approved': { bg: 'bg-emerald-50 text-emerald-755 border-emerald-200', icon: CheckCircle, label: 'Disetujui' },
      'rejected': { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle, label: 'Ditolak' },
      'verified': { bg: 'bg-indigo-50 text-indigo-750 border-indigo-200', icon: CheckCircle, label: 'Hasil AL Diverifikasi KEA' },
      'accredited': { bg: 'bg-emerald-50 text-emerald-755 border-emerald-250', icon: Award, label: hasCertificate ? 'Sertifikat Terbit' : 'Sidang Majelis: Terakreditasi' },
      'released': { bg: 'bg-emerald-50 text-emerald-755 border-emerald-250', icon: Award, label: 'Sertifikat Terbit' }
    };
    const statusConfig = config[status] || config['pending'];
    const Icon = statusConfig.icon;
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-black tracking-wide border uppercase inline-flex items-center gap-2 shadow-sm ${statusConfig.bg}`}>
        <Icon size={14} />
        {statusConfig.label}
      </span>
    );
  };

  const getScoreGradeColor = (score) => {
    if (score >= 3.5) return 'text-emerald-600';
    if (score >= 3.0) return 'text-indigo-600';
    if (score >= 2.0) return 'text-amber-600';
    return 'text-rose-600';
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
                <FileText className="w-8 h-8 text-indigo-600" />
                Submission Saya
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Riwayat lengkap berkas pengajuan akreditasi & penilaian AI</p>
            </div>
            <button
              onClick={loadSubmissions}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-600 hover:text-indigo-600 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>

          {/* Submissions List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50">
              <Clock className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
              <p className="text-slate-500 font-bold text-sm">Memuat data submission...</p>
            </div>
          ) : !Array.isArray(submissions) || submissions.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-12 text-center shadow-sm max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Pengajuan</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed mb-6">
                Anda belum memiliki berkas pengajuan akreditasi aktif saat ini. Mulailah mengunggah dokumen Anda di dashboard untuk memulai penilaian.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-gradient-to-tr from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl transition-all font-black text-xs shadow-md shadow-indigo-100 active:scale-95 cursor-pointer"
              >
                Buat Pengajuan Baru
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {submissions.map((submission) => {
                const scoring = submission.ai?.scoring || submission.ai?.scoringResults;
                const hasScoringData = !!scoring;
                const isExpanded = expandedScoring.has(submission.submissionId);

                return (
                  <div 
                    key={submission.submissionId} 
                    className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col relative"
                  >
                    {/* Left status color accent bar */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${
                      submission.status === 'approved' || submission.status === 'accredited' || submission.status === 'released' ? 'bg-gradient-to-b from-emerald-500 to-teal-500' :
                      submission.status === 'rejected' ? 'bg-gradient-to-b from-rose-500 to-red-500' :
                      submission.status === 'under_review' || submission.status === 'verified' ? 'bg-gradient-to-b from-indigo-500 to-blue-500' :
                      'bg-gradient-to-b from-amber-400 to-amber-500'
                    }`} />

                    {/* Submission Main Container with Left Padding Offset */}
                    <div className="p-6 pl-8">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                            {submission.programStudi}
                          </h3>
                          <p className="text-slate-500 font-semibold text-sm mt-0.5">{submission.institusi}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(submission.status, !!submission.accreditationDecision?.certificateCid)}
                        </div>
                      </div>

                      {/* Info Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 mb-6">
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">ID Pengajuan</p>
                          <p className="text-xs font-black text-slate-800 font-mono tracking-tight bg-white px-2.5 py-1 rounded border border-slate-200/60 inline-block shadow-sm">
                            {submission.submissionId}
                          </p>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">Jenjang Program</p>
                          <p className="text-sm font-bold text-slate-700">
                            {submission.jenjang || submission.programType || '-'}
                          </p>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">Tanggal Diajukan</p>
                          <p className="text-sm font-bold text-slate-700">
                            {new Date(submission.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        {hasScoringData ? (
                          <div className="bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/50">
                            <p className="text-[10px] text-indigo-650 font-black uppercase tracking-wider mb-1.5">Skor AI LAM-TEK</p>
                            <p className={`text-xl font-black ${getScoreGradeColor(scoring.overallScore || 0)}`}>
                              {(scoring.overallScore || 0).toFixed(2)} <span className="text-xs font-semibold text-slate-400">/ 4.00</span>
                            </p>
                          </div>
                        ) : (
                          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">Hasil Skoring AI</p>
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-550 border border-slate-200/50 rounded-full text-[10px] font-bold">
                              Dalam Proses
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Row */}
                      <div className="flex flex-wrap gap-3 border-t border-slate-100/80 pt-5">
                        {/* Scoring Toggle Button */}
                        {hasScoringData && (
                          <button
                            onClick={() => toggleScoring(submission.submissionId)}
                            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl transition-all duration-150 font-bold text-xs cursor-pointer border ${
                              isExpanded 
                                ? 'bg-indigo-600 text-white border-indigo-650 shadow-md shadow-indigo-100/80 active:translate-y-0.5' 
                                : 'bg-indigo-50/70 text-indigo-750 border-indigo-100 hover:bg-indigo-100 hover:text-indigo-800'
                            }`}
                          >
                            <TrendingUp className="w-4 h-4" />
                            {isExpanded ? 'Tutup Hasil Skoring' : 'Lihat Hasil Skoring'}
                            {isExpanded ? <ChevronDown className="w-4.5 h-4.5" /> : <ChevronRight className="w-4.5 h-4.5" />}
                          </button>
                        )}

                        {/* History Button */}
                        <button
                          onClick={() => setSelectedHistorySubmission(submission)}
                          className="flex items-center gap-2 px-4.5 py-2.5 bg-purple-50 text-purple-750 border border-purple-100 hover:bg-purple-100 active:bg-purple-200 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                        >
                          <History className="w-4 h-4" />
                          Riwayat Blockchain
                        </button>
                        
                        {submission.ledHash && (
                          <a
                            href={`https://ipfs.io/ipfs/${submission.ledHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4.5 py-2.5 bg-blue-50/70 text-blue-750 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-blue-500" />
                            Download LED (IPFS)
                          </a>
                        )}
                        {submission.lkpsHash && (
                          <a
                            href={`https://ipfs.io/ipfs/${submission.lkpsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4.5 py-2.5 bg-emerald-50/70 text-emerald-750 border border-emerald-100 hover:bg-emerald-100 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-emerald-500" />
                            Download LKPS (IPFS)
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Scoring Detail Section - Expandable */}
                    {hasScoringData && isExpanded && (
                      <div className="border-t border-slate-100 bg-indigo-50/10 p-6 pl-8 animate-fade-in">
                        {/* Overall Gemini AI scoring header */}
                        <div className="flex items-center gap-2.5 mb-6">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100/80 flex items-center justify-center text-indigo-700 border border-indigo-200/50 shadow-inner">
                            <Star className="w-4.5 h-4.5 text-indigo-655 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 tracking-tight text-base">Hasil Penilaian & Skoring Otomatis AI</h4>
                            <p className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider mt-0.5">Analisis Komparatif Gemini AI & Hyperledger Ledger LAM-TEK 2025</p>
                          </div>
                        </div>

                        {/* Two-Column Grid Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Left Column: Result & AI Recommendations */}
                          <div className="lg:col-span-1 space-y-5">
                            <ScoringResultDisplay scoringResult={scoring} />
                            
                            {submission.ai?.recommendations && submission.ai.recommendations.length > 0 && (
                              <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-2xl p-5 shadow-inner">
                                <h4 className="text-sm font-black text-indigo-950 mb-3 flex items-center gap-2">
                                  💡 Rekomendasi Perbaikan AI
                                </h4>
                                <ul className="space-y-2.5">
                                  {submission.ai.recommendations.map((rec, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-indigo-850">
                                      <span className="text-indigo-400 font-black flex-shrink-0">•</span>
                                      <span className="text-xs font-semibold leading-relaxed">{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          {/* Right Column: Detailed 7 Criteria List */}
                          <div className="lg:col-span-2">
                            <ScoringDetailDropdown scoring={scoring} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No Scoring Data Message */}
                    {!hasScoringData && (
                      <div className="border-t border-slate-100/60 px-6 py-4 bg-slate-50/40 pl-8 flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <span>Skor AI belum tersedia — dokumen sedang mengantri untuk proses penilaian blockchain & Gemini Scoring</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Submission History Modal */}
          {selectedHistorySubmission && (
            <SubmissionHistoryModal 
              submissionId={selectedHistorySubmission.submissionId}
              programStudi={selectedHistorySubmission.programStudi}
              onClose={() => setSelectedHistorySubmission(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
