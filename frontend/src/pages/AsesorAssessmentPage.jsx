import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { 
  FileText, Save, CheckCircle, AlertCircle, ArrowLeft, Download, 
  File, FileSpreadsheet, RefreshCw, Star, Info, Hash, Building2, BookOpen
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function AsesorAssessmentPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Initial scores for 7 criteria
  const [scores, setScores] = useState({
    '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0
  });
  const [notes, setNotes] = useState('');
  const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  // 7 Kriteria LAM-TEK 2025
  const criteria = [
    { id: '1', name: 'Diferensiasi Misi', weight: 2.05, desc: 'Kesesuaian visi, misi, tujuan, sasaran serta keunikan program studi.' },
    { id: '2', name: 'Akuntabilitas', weight: 7.06, desc: 'Keandalan tata kelola, tata pamong, penjaminan kerja sama, dan tata kelola keuangan.' },
    { id: '3', name: 'Relevansi Pendidikan, Penelitian, dan PkM', weight: 22.45, desc: 'Kurikulum, integrasi penelitian & pengabdian masyarakat dalam kegiatan akademik.' },
    { id: '4', name: 'Sumber Daya Manusia', weight: 13.44, desc: 'Profil kualifikasi dosen tetap, dosen tidak tetap, tenaga kependidikan, serta pembinaan karir.' },
    { id: '5', name: 'Sarana, Prasarana, dan K3L', weight: 7.51, desc: 'Ketersediaan laboratorium, sarana perkuliahan, perpustakaan, keamanan, kesehatan, & keselamatan kerja.' },
    { id: '6', name: 'Mahasiswa dan Luaran Mahasiswa', weight: 26.87, desc: 'Pola penerimaan mahasiswa baru, prestasi mahasiswa, masa studi lulusan, serta tracer study.' },
    { id: '7', name: 'Sistem Penjaminan Mutu', weight: 15.35, desc: 'Ketersediaan dokumen SPMI, pelaksanaan siklus PPEPP, serta evaluasi audit mutu eksternal.' },
  ];

  useEffect(() => {
    loadSubmission();
  }, [id]);

  const loadSubmission = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/submissions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setSubmission(result.data || result);
        
        // Pre-fill if there are existing assessor assessments
        const data = result.data || result;
        if (data.akAssessments) {
          const currentAK = data.akAssessments.find(a => a.assessorId === user?.id);
          if (currentAK && currentAK.scores) {
            const mappedScores = {};
            criteria.forEach(c => {
              mappedScores[c.id] = currentAK.scores[c.id] || 0;
            });
            setScores(mappedScores);
            setNotes(currentAK.notes || '');
          }
        }
      }
    } catch (error) {
      console.error('Error loading submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (criterionId, value) => {
    let parsedVal = parseFloat(value);
    if (isNaN(parsedVal)) parsedVal = 0;
    if (parsedVal < 0) parsedVal = 0;
    if (parsedVal > 4) parsedVal = 4;
    
    // Format to 2 decimal places to prevent infinite precision issue
    parsedVal = Math.round(parsedVal * 100) / 100;
    
    setScores(prev => ({
      ...prev,
      [criterionId]: parsedVal
    }));
  };

  const calculateTotal = () => {
    let totalScore = 0;
    let totalWeight = 0;
    
    criteria.forEach(c => {
      totalScore += (scores[c.id] || 0) * c.weight;
      totalWeight += c.weight;
    });
    
    return totalWeight > 0 ? (totalScore / totalWeight) : 0;
  };

  const getAiScore = (criterion) => {
    if (!submission?.ai?.scoring?.criteriaScores) return null;
    const aiData = submission.ai.scoring.criteriaScores[criterion.id];
    return aiData ? aiData.averageScore : null;
  };

  const handleDownloadLED = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/download/${id}/led`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LED_${submission.programStudi || submission.program_name}_${submission.institusi || submission.institution_name}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Gagal mengunduh file LED');
      }
    } catch (error) {
      console.error('Error downloading LED:', error);
    }
  };

  const handleDownloadLKPS = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/download/${id}/lkps`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LKPS_${submission.programStudi || submission.program_name}_${submission.institusi || submission.institution_name}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Gagal mengunduh file LKPS');
      }
    } catch (error) {
      console.error('Error downloading LKPS:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/asesor/assignments/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scores,
          notes
        })
      });

      if (response.ok) {
        setResultModal({
          isOpen: true,
          type: 'success',
          title: 'Penilaian AK Berhasil! 🎉',
          message: 'Penilaian Asesmen Kecukupan Anda telah berhasil disubmit secara permanen. KEA akan melakukan verifikasi konsistensi penilaian antar asesor dalam waktu dekat.'
        });
      } else {
        const err = await response.json();
        setResultModal({
          isOpen: true,
          type: 'error',
          title: 'Gagal Submit Penilaian',
          message: err.message || 'Terjadi kesalahan saat submit penilaian. Silakan coba lagi.'
        });
      }
    } catch (error) {
      console.error('Error submitting assessment:', error);
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

  const role = user?.role || 'asesor';
  const menuItems = getMenuForRole(role);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-64 w-72 h-72 bg-violet-100/20 rounded-full blur-3xl pointer-events-none" />

      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={menuItems}
      />

      <div className="flex-1 ml-64 overflow-auto relative">
        <div className="p-8 max-w-5xl mx-auto">
          
          {/* Back Button */}
          <button 
            onClick={() => navigate('/asesor/assignments')}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-5 cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Kembali ke Penugasan
          </button>

          {/* Page Info */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Penilaian Asesmen Kecukupan (AK)</h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">
                Lakukan review dokumen akreditasi dan isi nilai secara objektif berdasarkan standar LAM-TEK 2025
              </p>
            </div>
            <button
              onClick={loadSubmission}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl text-sm font-bold transition-all duration-200 shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-slate-500 text-sm font-semibold">Memuat data submission...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Header Card UPPS Info */}
              <div className="bg-gradient-to-tr from-indigo-600 to-indigo-850 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />
                
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="inline-flex px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-wider mb-2.5">
                      Target Evaluasi
                    </span>
                    <h2 className="text-2xl font-black tracking-tight">{submission.programStudi || submission.program_name}</h2>
                    <p className="text-indigo-150 font-bold text-sm mt-1">{submission.institusi || submission.institution_name}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4.5 border border-white/10 text-right min-w-[200px]">
                    <p className="text-[10px] text-indigo-250 font-black uppercase tracking-wider mb-1">ID Submission</p>
                    <p className="font-mono text-xs font-bold text-white tracking-wide break-all">{submission.id}</p>
                  </div>
                </div>
              </div>

              {/* Document Download Section */}
              <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="text-base font-black text-slate-800">Berkas Dokumen Akreditasi</h3>
                </div>
                <p className="text-slate-500 text-xs font-semibold mb-6">
                  Unduh dan kaji terlebih dahulu berkas yang telah dikirimkan oleh Unit Pengelola Program Studi (UPPS)
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* LED PS */}
                  <div className="bg-white hover:bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                        <File className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm">LED-PS</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Laporan Evaluasi Diri Program Studi</p>
                        {submission.ipfs?.ledHash && (
                          <p className="text-[9px] font-mono text-slate-400 mt-2 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit truncate max-w-full">
                            CID: {submission.ipfs.ledHash.substring(0, 12)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadLED}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-rose-100 transition-all duration-200"
                    >
                      <Download className="w-4 h-4" />
                      Download LED-PS (PDF)
                    </button>
                  </div>

                  {/* LKPS */}
                  <div className="bg-white hover:bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm">LKPS</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Laporan Kinerja Program Studi</p>
                        {submission.ipfs?.lkpsHash && (
                          <p className="text-[9px] font-mono text-slate-400 mt-2 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit truncate max-w-full">
                            CID: {submission.ipfs.lkpsHash.substring(0, 12)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadLKPS}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-emerald-100 transition-all duration-200"
                    >
                      <Download className="w-4 h-4" />
                      Download LKPS (Excel)
                    </button>
                  </div>

                </div>

                {/* Instructions Box */}
                <div className="mt-5 p-4.5 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-start gap-3">
                  <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Info className="w-4 h-4 text-indigo-650" />
                  </div>
                  <div className="text-xs font-semibold text-slate-655 space-y-1">
                    <p className="font-black text-slate-800">Panduan Asesmen Kecukupan:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-500 pl-0.5">
                      <li>Kaji secara seksama seluruh berkas kelayakan akreditasi program studi.</li>
                      <li>Bandingkan data laporan dengan analisis rekomendasi skor AI (sebagai referensi tambahan).</li>
                      <li>Berikan nilai desimal dalam skala <span className="font-black text-slate-800">0.00 hingga 4.00</span> secara objektif.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Form Input 7 Kriteria */}
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-6">
                    <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <Star className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-base font-black text-slate-800">Skoring 7 Kriteria LAM-TEK 2025</h3>
                  </div>

                  <div className="space-y-5">
                    {criteria.map((c) => {
                      const aiScore = getAiScore(c);
                      const currentVal = scores[c.id] || 0;
                      
                      return (
                        <div key={c.id} className="p-5 bg-white hover:bg-slate-50/20 border border-slate-200/80 rounded-2xl transition-all hover:border-indigo-200 hover:shadow-sm">
                          <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
                            
                            {/* Kriteria Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3">
                                <span className="w-7 h-7 bg-indigo-50 border border-indigo-200/60 text-indigo-650 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm mt-0.5">
                                  {c.id}
                                </span>
                                <div className="min-w-0">
                                  <h4 className="font-black text-slate-800 text-sm tracking-tight">{c.name}</h4>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Bobot Kriteria: {c.weight}%</p>
                                  <p className="text-slate-500 text-xs mt-1.5 font-semibold leading-relaxed pr-2">{c.desc}</p>
                                </div>
                              </div>

                              {/* AI Companion Badge */}
                              {aiScore !== null && (
                                <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50/80 border border-purple-100 rounded-xl text-purple-750 text-[10px] font-black uppercase tracking-wider">
                                  <span className="text-sm">🤖</span>
                                  <span>Rekomendasi AI:</span>
                                  <span className="font-mono text-purple-600 text-xs font-bold">{aiScore.toFixed(2)}</span>
                                </div>
                              )}
                            </div>

                            {/* Slider & Input Score */}
                            <div className="w-full lg:w-72 bg-slate-50/80 border border-slate-200/50 rounded-2xl p-4 flex flex-col gap-3 flex-shrink-0">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nilai Kriteria</span>
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="number"
                                    min="0"
                                    max="4"
                                    step="0.01"
                                    value={scores[c.id]}
                                    onChange={(e) => handleScoreChange(c.id, e.target.value)}
                                    className="w-16 px-2 py-1 border border-indigo-200 rounded-lg text-center font-black text-indigo-700 bg-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                  />
                                  <span className="text-[10px] font-black text-slate-400">/ 4.00</span>
                                </div>
                              </div>

                              {/* Score Slider */}
                              <input 
                                type="range"
                                min="0"
                                max="4"
                                step="0.01"
                                value={currentVal}
                                onChange={(e) => handleScoreChange(c.id, e.target.value)}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                              />

                              {/* AI comparison bar */}
                              {aiScore !== null && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>Skor Anda</span>
                                    <span>AI Rekomendasi</span>
                                  </div>
                                  <div className="h-1 bg-slate-200 rounded-full overflow-hidden flex">
                                    <div 
                                      className="bg-indigo-500 h-full transition-all duration-200" 
                                      style={{ width: `${(currentVal / 4) * 50}%` }}
                                    />
                                    <div 
                                      className="bg-purple-400/50 h-full transition-all duration-200 ml-auto" 
                                      style={{ width: `${(aiScore / 4) * 50}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Justification & Notes */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="text-base font-black text-slate-800">Catatan Penilaian & Justifikasi</h3>
                  </div>
                  <p className="text-slate-500 text-xs font-semibold mb-4">
                    Berikan penjelasan menyeluruh, pertimbangan pengambilan nilai, atau justifikasi perbaikan bagi program studi
                  </p>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
                    placeholder="Tuliskan justifikasi skor kriteria atau saran perbaikan program studi..."
                  />
                </div>

                {/* Weighted Total & Submission Banner */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Skor Akhir Terbobot (Weighted)</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-indigo-750 tracking-tight">
                          {calculateTotal().toFixed(2)}
                        </span>
                        <span className="text-sm font-black text-slate-400">/ 4.00</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-tr from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-sm font-black uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-150 active:scale-95 disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Submit Penilaian (AK)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Blockchain Warning */}
                  <div className="mt-5 p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 font-semibold leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p>
                      <span className="font-black">PENTING:</span> Setelah disubmit, seluruh data skor kriteria beserta catatan penilai akan dienkripsi dan dicatat secara permanen di blockchain AkreChain demi menjamin akuntabilitas serta tidak dapat diubah kembali.
                    </p>
                  </div>
                </div>

              </form>

            </div>
          )}

        </div>
      </div>

      {/* Result Modal */}
      <ResultModal
        isOpen={resultModal.isOpen}
        onClose={() => {
          setResultModal({ ...resultModal, isOpen: false });
          if (resultModal.type === 'success') {
            navigate('/asesor/assignments');
          }
        }}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        buttonText={resultModal.type === 'success' ? 'Kembali ke Daftar Penugasan' : 'Tutup'}
      />
    </div>
  );
}
