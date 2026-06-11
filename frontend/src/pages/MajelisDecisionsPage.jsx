import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Gavel, Calendar, Award, RefreshCw, FileCheck, ExternalLink, Upload } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function MajelisDecisionsPage({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [decidedSubmissions, setDecidedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
    fetchDecided();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/verification/list/decisions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubmissions(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecided = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/verification/list/decided`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDecidedSubmissions(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching decided submissions:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[600px] h-[600px] bg-indigo-200/10 rounded-full blur-[150px] pointer-events-none" />

      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('majelis')}
      />

      <div className="flex-1 ml-64 overflow-auto relative z-10">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <header className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650 shadow-sm shadow-purple-100/50">
                  <Award className="w-5 h-5" />
                </div>
                Keputusan Akreditasi
              </h1>
              <p className="text-slate-550 text-sm font-semibold mt-1">
                Tetapkan peringkat akreditasi, masa berlaku, nomor SK, dan tanggal SK berdasarkan hasil verifikasi KEA
              </p>
            </div>
            <button
              onClick={() => { fetchSubmissions(); fetchDecided(); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-purple-650 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </header>

          {/* Pending Decisions Section */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm animate-pulse">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-slate-555 font-bold text-sm">Menyelaraskan data usulan...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-850 tracking-tight flex items-center gap-2">
                <Gavel className="w-5 h-5 text-purple-600" />
                Menunggu Penetapan Keputusan
              </h2>
              {submissions.length === 0 ? (
                <div className="glass-panel-light rounded-2xl p-12 text-center shadow-sm max-w-2xl mx-auto my-4 animate-fade-in">
                  <div className="bg-purple-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 border border-purple-100/50">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-black text-slate-805 mb-1">Semua Sudah Diputuskan</h3>
                  <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                    Tidak ada submission yang menunggu penetapan keputusan akreditasi saat ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((sub) => (
                    <div key={sub.submission_id} className="glass-panel-light glass-panel-light-hover rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm transition-all duration-300 relative overflow-hidden group animate-fade-in">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-indigo-500" />
                      
                      <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-purple-650 transition-colors">
                            {sub.program_studi}
                          </h3>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                            <span className="text-purple-750 font-bold">{sub.institusi}</span>
                            <span>•</span>
                            <span className="bg-slate-150 px-2 py-0.5 rounded text-[10px] uppercase font-black text-slate-650">{sub.program_type || 'Program Studi'}</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-semibold text-slate-600">
                            <span className="flex items-center gap-1 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full text-purple-750 font-black">
                              <Award className="w-3.5 h-3.5" />
                              Rekomendasi Rank: {sub.recommended_rank}
                            </span>
                            <span className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full text-slate-650">
                              <FileCheck className="w-3.5 h-3.5 text-slate-450" />
                              Skor Verifikasi: {sub.verified_score}
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                              Diverifikasi: {formatDate(sub.verified_at)}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => navigate(`/majelis-decision/${sub.submission_id}`)}
                          className="px-5 py-2.5 bg-gradient-to-tr from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-750 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                          Tetapkan Keputusan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Already Decided Submissions */}
          {decidedSubmissions.length > 0 && (
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-black text-slate-850 tracking-tight flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                Keputusan Selesai
              </h2>
              <div className="space-y-3">
                {decidedSubmissions.map((sub) => {
                  const isFallbackCid = sub.certificate_cid && sub.certificate_cid.startsWith('QmCertFallback');
                  const needsReupload = !sub.certificate_cid || isFallbackCid;
                  
                  return (
                    <div key={sub.submission_id} className="glass-panel-light glass-panel-light-hover rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm transition-all duration-300 relative overflow-hidden group animate-fade-in">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                      
                      <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-1.5">
                            <h3 className="font-black text-slate-900 tracking-tight leading-snug group-hover:text-emerald-700 transition-colors">
                              {sub.program_studi || 'Program Studi'}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 border border-amber-250 text-amber-800 uppercase">
                              ⭐ {sub.final_rank}
                            </span>
                            <span className="text-slate-400 text-xs font-semibold">Skor Akhir: {sub.final_score}</span>
                          </div>

                          {sub.institusi && sub.institusi !== 'N/A' && (
                            <p className="text-emerald-700 font-bold text-xs -mt-1 mb-3">
                              {sub.institusi}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                            <span>Nomor SK: <strong className="text-slate-700 font-mono font-bold">{sub.sk_number}</strong></span>
                            <span>Tanggal SK: {formatDate(sub.sk_date)}</span>
                            
                            {needsReupload ? (
                              <span className="text-amber-700 font-black uppercase tracking-wider text-[9px] flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                                <Upload className="w-3.5 h-3.5 animate-pulse" />
                                IPFS Upload Pending (Sekretariat)
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-black uppercase tracking-wider text-[9px] flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                ✅ Sertifikat Terbit
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {!needsReupload && (
                            <button
                              onClick={() => navigate(`/release/${sub.submission_id}`)}
                              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all duration-200 active:scale-95 flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Lihat Sertifikat
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
