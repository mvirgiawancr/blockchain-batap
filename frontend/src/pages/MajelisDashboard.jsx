import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Gavel, Calendar, Award, RefreshCw, FileCheck, ExternalLink, ListTodo, CheckSquare, TrendingUp, ChevronRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function MajelisDashboard({ user }) {
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

  const calculateAverageScore = () => {
    if (decidedSubmissions.length === 0) return '0.00';
    const sum = decidedSubmissions.reduce((acc, curr) => acc + parseFloat(curr.final_score || 0), 0);
    return (sum / decidedSubmissions.length).toFixed(2);
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
                  <Gavel className="w-5 h-5" />
                </div>
                Dashboard Majelis
              </h1>
              <p className="text-slate-550 text-sm font-semibold mt-1">
                Ringkasan pengajuan yang telah diverifikasi KEA dan menunggu penetapan keputusan
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

          {/* Stats Metrik Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="glass-panel-light rounded-2xl p-5 border-l-4 border-l-purple-500 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650">
                <ListTodo className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Menunggu Keputusan</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{submissions.length} Pengajuan</p>
              </div>
            </div>

            <div className="glass-panel-light rounded-2xl p-5 border-l-4 border-l-emerald-500 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-650">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Keputusan Selesai</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{decidedSubmissions.length} Penetapan</p>
              </div>
            </div>

            <div className="glass-panel-light rounded-2xl p-5 border-l-4 border-l-indigo-500 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rata-Rata Skor Final</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{calculateAverageScore()}</p>
              </div>
            </div>
          </div>

          {/* Main Grid Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left Columns: Summary of Pending Decisions */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-black text-slate-850 tracking-tight flex items-center justify-between">
                <span>Pengajuan KEA Menunggu Keputusan</span>
                <span className="text-xs text-purple-650 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">{submissions.length} baru</span>
              </h2>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm animate-pulse">
                  <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-slate-550 font-semibold text-xs">Memuat daftar...</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="glass-panel-light rounded-2xl p-12 text-center shadow-sm">
                  <Award className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                  <p className="text-slate-550 font-bold text-sm">Tidak ada usulan baru</p>
                  <p className="text-slate-400 text-xs mt-1">Seluruh usulan yang diverifikasi KEA telah ditetapkan keputusannya.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.slice(0, 4).map((sub) => (
                    <div key={sub.submission_id} className="glass-panel-light rounded-2xl p-5 border border-slate-200/60 shadow-inner-sm hover:shadow-md transition-all flex justify-between items-center gap-4">
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{sub.program_studi}</h3>
                        <p className="text-xs font-semibold text-purple-750 mt-0.5">{sub.institusi} • <span className="text-slate-450">{sub.program_type}</span></p>
                        
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          <span className="bg-purple-50 border border-purple-100 text-purple-750 px-2 py-0.5 rounded-full flex items-center gap-1">
                            Rank KEA: {sub.recommended_rank}
                          </span>
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            Skor KEA: {sub.verified_score}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate(`/majelis-decision/${sub.submission_id}`)}
                        className="flex-shrink-0 p-2 bg-purple-50 hover:bg-purple-600 text-purple-650 hover:text-white border border-purple-100 hover:border-purple-600 rounded-xl transition-all cursor-pointer active:scale-90"
                        title="Buka Penetapan Keputusan"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  {/* Go to Decision Action Card */}
                  <div 
                    onClick={() => navigate('/majelis/decisions')}
                    className="glass-panel-light glass-panel-light-hover rounded-2xl p-5 flex items-center justify-between border border-dashed border-purple-300 hover:border-solid hover:border-purple-400 cursor-pointer shadow-sm active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center text-purple-650">
                        <Gavel className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">Lihat Semua & Tetapkan Keputusan</p>
                        <p className="text-xs text-slate-550 font-semibold mt-0.5">Buka daftar lengkap pengajuan untuk melengkapi peringkat dan SK akreditasi</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-purple-650" />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Decisions History Feed */}
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-850 tracking-tight flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                Penetapan Terbaru
              </h2>

              {decidedSubmissions.length === 0 ? (
                <div className="glass-panel-light rounded-2xl p-8 text-center text-slate-400 text-xs font-semibold">
                  Belum ada penetapan akreditasi yang terselesaikan.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {decidedSubmissions.slice(0, 5).map((sub) => (
                    <div key={sub.submission_id} className="glass-panel-light rounded-xl p-4 space-y-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className="font-black text-slate-850 text-xs truncate" title={sub.program_studi}>
                            {sub.program_studi}
                          </h4>
                          <p className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">{sub.institusi}</p>
                        </div>
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 border border-amber-250 text-amber-800 uppercase">
                          {sub.final_rank}
                        </span>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                        <span>SK: {sub.sk_number.substring(0, 15)}...</span>
                        <span className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-black">Score: {parseFloat(sub.final_score || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
