import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, FileText, Award, TrendingUp, Calendar, 
  AlertCircle, ChevronLeft, Save, Building, BookOpen, Clock,
  Download, Users, Copy, Check, FileSpreadsheet, ExternalLink, ShieldCheck, ArrowRight
} from 'lucide-react';
import api from '../services/api';
import SuccessModal from '../components/SuccessModal';

const VerificationPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Verification Form State
  const [notes, setNotes] = useState('');
  const [finalScore, setFinalScore] = useState(0);
  const [recommendedRank, setRecommendedRank] = useState('Baik');
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const alRes = await api.get(`/al-execution/${submissionId}`);
        const alData = alRes.data.data;
        
        const subRes = await api.get(`/submissions/${submissionId}`);
        const subData = subRes.data.data;
        
        setSubmission({
          ...alData,
          programStudi: subData.programStudi,
          institusi: subData.institusi,
          programType: subData.programType || subData.jenjang || 'S1',
          createdAt: subData.createdAt || subData.submittedAt || null,
          documents: subData.documents || [],
          assignedAssessors: subData.assignedAssessors || subData.currentOffer || null,
          assignedAssessorName: subData.assignedAssessorName || null,
          assignedAssessorUsername: subData.assignedAssessorUsername || null
        });
        
        if (alData.alExecution) {
          setFinalScore(Number(alData.alExecution.total_score || 0));
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [submissionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        notes,
        finalScore,
        recommendedRank,
        scoreAdjustments: [] 
      };
      await api.post(`/verification/${submissionId}/verify`, payload);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error verifying:', error);
      alert('Gagal menyimpan verifikasi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccessModal(false);
    navigate(`/verification`);
  };

  const downloadDocument = async (docType) => {
    try {
      const response = await api.get(`/download/${submissionId}/${docType}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      if (docType.toUpperCase() === 'LED') {
        link.download = `LED_${submission?.programStudi || 'Prodi'}_${submission?.institusi || 'Institusi'}.pdf`;
      } else {
        link.download = `LKPS_${submission?.programStudi || 'Prodi'}_${submission?.institusi || 'Institusi'}.xlsx`;
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Gagal mengunduh berkas.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(submissionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
      <div className="animate-spin rounded-full h-12 w-12 border-3 border-indigo-200 border-t-indigo-600 mb-3"></div>
      <p className="text-slate-400 font-bold text-sm">Memuat berkas hasil asesmen...</p>
    </div>
  );

  if (!submission) return (
    <div className="p-12 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
        <AlertCircle className="w-8 h-8 text-rose-500" />
      </div>
      <h2 className="text-lg font-black text-slate-800">Data Pengajuan Tidak Ditemukan</h2>
      <p className="text-slate-500 text-xs font-semibold mt-1">Berkas asesmen lapangan tidak tersedia atau telah dihapus.</p>
      <button 
        onClick={() => navigate('/verification')} 
        className="mt-6 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
      >
        Kembali ke Daftar
      </button>
    </div>
  );

  const { alExecution, alResponse, programType, createdAt } = submission;
  const IPFS_GATEWAY = 'https://ivory-fancy-junglefowl-107.mypinata.cloud/ipfs/';

  // Assessor Names fallback logic for high fidelity simulation matching screenshots
  const assessor1Name = submission.assignedAssessors?.assessor1Name || submission.assignedAssessorName || 'Dr. Andes Ismayana, S.TP,MT';
  const assessor2Name = submission.assignedAssessors?.assessor2Name || 'Dr. Indah Yuliasih S.TP, M.Si';

  return (
    <div className="space-y-8 relative z-10 w-full pb-10">
      {/* Success Dialog Popup */}
      <SuccessModal 
        isOpen={showSuccessModal}
        title="Verifikasi Sukses ✓"
        message="Hasil verifikasi telah disimpan di ledger blockchain. Status pengajuan kini diperbarui menjadi Verified."
        onConfirm={handleSuccessConfirm}
        confirmText="Kembali ke Daftar"
      />

      {/* Ambient background glow inside the main container */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[600px] h-[600px] bg-purple-200/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Back navigation & Header */}
      <div>
        <button 
          onClick={() => navigate('/verification')}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-black text-xs uppercase tracking-wider transition-all duration-200 group cursor-pointer mb-3 bg-transparent border-0 outline-none"
        >
          <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform text-slate-400" />
          Kembali ke Daftar
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-100/50">
                <ShieldCheck className="w-5.5 h-5.5" />
              </div>
              Verifikasi Kelayakan Hasil AL
            </h1>
            <p className="text-slate-500 text-sm font-semibold mt-1">Review laporan Berita Acara lapangan, tanggapan UPPS, dan tentukan peringkat akreditasi final</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-inner">
              Ledger Sync Active
            </span>
          </div>
        </div>
      </div>

      {/* Left Column + Right Column Grid Layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Detailed Submission Data */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Submission Metadata */}
          <div className="glass-panel-light p-6 rounded-2xl shadow-sm border border-slate-200/60 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-500" />
              Identitas Pengajuan Akreditasi
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Universitas / Institusi</p>
                  <p className="text-base font-bold text-slate-800">{submission.institusi || 'Institut Pertanian Bogor'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Program Studi</p>
                  <p className="text-lg font-black text-slate-900 leading-snug tracking-tight">{submission.programStudi || 'Teknik Industri Pertanian'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">ID Submission</p>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-600 shadow-sm">
                      <span>{submissionId}</span>
                      <button 
                        onClick={copyToClipboard}
                        className="text-slate-400 hover:text-indigo-600 bg-transparent border-0 cursor-pointer p-0.5"
                        title="Copy ID"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Jenjang / Strata</p>
                    <span className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 rounded-lg inline-block">
                      {programType || 'S1 - Sarjana'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Tanggal Pengajuan</p>
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Assigned Assessor Team */}
          <div className="glass-panel-light p-6 rounded-2xl shadow-sm border border-slate-200/60">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Tim Asesor Ditugaskan (LAM-TEK)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Assessor 1 */}
              <div className="flex items-start gap-3.5 p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-inner-sm hover:border-slate-300 transition duration-150 relative overflow-hidden group">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                  1
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Asesor Kepala / Ketua</p>
                  <p className="text-sm font-black text-slate-900 truncate tracking-tight">{assessor1Name}</p>
                  <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">Anggota KEA LAM-TEK</p>
                </div>
              </div>

              {/* Assessor 2 */}
              <div className="flex items-start gap-3.5 p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-inner-sm hover:border-slate-300 transition duration-150 relative overflow-hidden group">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                  2
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Asesor Anggota</p>
                  <p className="text-sm font-black text-slate-900 truncate tracking-tight">{assessor2Name}</p>
                  <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">Pakar Bidang LAM-TEK</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Official Documents Review */}
          <div className="glass-panel-light p-6 rounded-2xl shadow-sm border border-slate-200/60">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Tinjau Berkas Laporan Pengajuan UPPS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* LED Download card */}
              <div className="flex items-center justify-between p-4 bg-red-50/20 border border-red-200 rounded-xl shadow-inner-sm group hover:border-red-300 transition duration-150">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                    <FileText className="w-5.5 h-5.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">Laporan Evaluasi Diri (LED-PS)</p>
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">PDF Document • 10MB Maks</p>
                  </div>
                </div>
                <button 
                  onClick={() => downloadDocument('LED')}
                  className="p-2 rounded-lg bg-white border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-600 shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer flex items-center justify-center flex-shrink-0"
                  title="Unduh LED"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* LKPS Download card */}
              <div className="flex items-center justify-between p-4 bg-emerald-50/20 border border-emerald-200 rounded-xl shadow-inner-sm group hover:border-emerald-300 transition duration-150">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <FileSpreadsheet className="w-5.5 h-5.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">Laporan Kinerja Program Studi</p>
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Excel Document • 10MB Maks</p>
                  </div>
                </div>
                <button 
                  onClick={() => downloadDocument('LKPS')}
                  className="p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-600 shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer flex items-center justify-center flex-shrink-0"
                  title="Unduh LKPS"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Side-by-Side Assessment Results */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Left: Assessor Findings & Berita Acara */}
            <div className="glass-panel-light rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-black text-xs text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Temuan & Catatan Asesor (AL)
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {alExecution?.findings?.length > 0 ? (
                  <ul className="space-y-2.5 flex-1 overflow-auto max-h-[220px] pr-1">
                    {alExecution.findings.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 p-3 bg-amber-50/30 border border-amber-100 rounded-xl shadow-inner-sm">
                        <AlertCircle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold text-slate-700 leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 flex-1 flex items-center justify-center">
                    <p className="text-xs font-semibold text-slate-400 italic">Tidak ada temuan krusial yang dicatat oleh Asesor.</p>
                  </div>
                )}

                {alExecution?.berita_acara_cid && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      Berita Acara Terverifikasi
                    </p>
                    <a 
                      href={`${IPFS_GATEWAY}${alExecution.berita_acara_cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 bg-indigo-50/40 hover:bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800 w-full transition-all group cursor-pointer decoration-none"
                    >
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span className="flex-1 truncate">BA_Asesmen_Asesor.pdf</span>
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                    <span className="text-[9px] text-slate-400 font-mono mt-1 block truncate">CID: {alExecution.berita_acara_cid}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: UPPS Sanggahan / Responses */}
            <div className="glass-panel-light rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-black text-xs text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Tanggapan / Sanggahan UPPS
                </h3>
                {alResponse?.responded_at && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black bg-blue-50 border border-blue-200 text-blue-800 tracking-wide">
                    {formatDate(alResponse.responded_at)}
                  </span>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {alResponse ? (
                  <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-200 shadow-inner-sm flex-1 overflow-auto max-h-[220px]">
                    <p className="text-xs font-semibold text-slate-700 leading-relaxed">{alResponse.notes}</p>
                  </div>
                ) : (
                  <div className="text-center py-8 flex-1 flex items-center justify-center">
                    <p className="text-xs font-semibold text-slate-400 italic">Belum ada berkas tanggapan diunggah oleh pihak UPPS.</p>
                  </div>
                )}

                {alResponse?.response_cid && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Dokumen Lampiran Sanggahan</p>
                    <a 
                      href={`${IPFS_GATEWAY}${alResponse.response_cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 w-full transition-all group cursor-pointer decoration-none"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="flex-1 truncate">Bukti_Sanggahan_UPPS.pdf</span>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                    <span className="text-[9px] text-slate-400 font-mono mt-1 block truncate">CID: {alResponse.response_cid}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right 1 Column: Decision Card & Form */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Asesor AL Score Summary Card */}
          <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-md text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-300" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black text-indigo-100 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-200" />
                  Skor Asesmen Asesor (AL)
                </p>
                <h3 className="text-4xl font-black tracking-tight leading-none mt-1">
                  {alExecution?.total_score ? Number(alExecution.total_score).toFixed(2) : '0.00'}
                </h3>
              </div>
              <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2 text-indigo-100 text-[10px] font-semibold uppercase tracking-wider">
              <Clock className="w-4 h-4 text-indigo-200" />
              <span>Submit: {alExecution?.submitted_at ? new Date(alExecution.submitted_at).toLocaleDateString('id-ID') : '-'}</span>
            </div>
          </div>

          {/* Form Keputusan Verifikasi */}
          <div className="glass-panel-light rounded-2xl shadow-lg border border-indigo-200 sticky top-6">
            <div className="p-5 border-b border-slate-200/60 bg-gradient-to-r from-indigo-50/50 to-white/10 rounded-t-2xl">
              <h3 className="font-black text-xs text-indigo-900 flex items-center gap-2 uppercase tracking-wider">
                <Award className="w-4.5 h-4.5 text-indigo-600" />
                Form Keputusan Verifikasi KEA
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Final Score */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Skor Final Terverifikasi
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-base font-black text-slate-800 outline-none shadow-sm"
                    value={finalScore}
                    onChange={(e) => setFinalScore(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    min="0"
                    max="4.00"
                    required
                  />
                  <div className="absolute right-4 top-3.5 text-slate-400 text-xs font-black uppercase tracking-wider">PTS</div>
                </div>
                <p className="text-[9px] text-slate-400 font-semibold leading-relaxed mt-0.5">Masukkan skala 0.00 s.d. 4.00. Dapat disesuaikan pasca-tinjau tanggapan.</p>
              </div>

              {/* Recommended Rank */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Rekomendasi Peringkat
                </label>
                <select 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs font-bold outline-none shadow-sm cursor-pointer"
                  value={recommendedRank}
                  onChange={(e) => setRecommendedRank(e.target.value)}
                >
                  <option value="Unggul">Unggul (Skor ≥ 3.50)</option>
                  <option value="Baik Sekali">Baik Sekali (Skor 3.00 - 3.49)</option>
                  <option value="Baik">Baik (Skor 2.00 - 2.99)</option>
                  <option value="Tidak Terakreditasi">Tidak Terakreditasi (Skor &lt; 2.00)</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Justifikasi Catatan KEA
                </label>
                <textarea 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all h-28 resize-none text-xs font-semibold outline-none shadow-sm leading-relaxed"
                  placeholder="Masukkan justifikasi tertulis dan catatan keputusan verifikasi resmi KEA untuk diteruskan ke sidang Majelis..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
              </div>

              {/* Submit button */}
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black py-3.5 rounded-xl hover:shadow-lg hover:shadow-indigo-100 transition-all duration-150 active:scale-95 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs uppercase tracking-wider"
              >
                {submitting ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Verifikasi
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>

    </div>
  );
};

export default VerificationPage;
