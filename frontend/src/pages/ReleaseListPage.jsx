import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Award, Stamp, CheckCircle, RefreshCw, Printer, ArrowRight, Calendar, ExternalLink, ShieldCheck, FileText 
} from 'lucide-react';
import Sidebar, { getMenuForRole } from '../components/Sidebar';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function ReleaseListPage({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/release/list/ready`, {
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
      {/* Ambient background glows for premium feel */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-200/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[600px] h-[600px] bg-indigo-200/10 rounded-full blur-[150px] pointer-events-none" />

      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole(user?.role || 'sekretariat')}
      />

      <div className="flex-1 ml-64 overflow-auto relative z-10">
        <div className="p-8 max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <header className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-650 shadow-sm shadow-emerald-100/50">
                  <Stamp className="w-5 h-5" />
                </div>
                Rilis Sertifikat Akreditasi
              </h1>
              <p className="text-slate-550 text-sm font-semibold mt-1">
                Terbitkan secara resmi sertifikat akreditasi program studi dan distribusikan ke blockchain & IPFS
              </p>
            </div>
            <button
              onClick={fetchSubmissions}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-emerald-650 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </header>

          {/* Main Content Area */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/50 backdrop-blur-md rounded-3xl border border-slate-200/50 shadow-sm animate-pulse">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-slate-555 font-bold text-sm">Menyelaraskan data sertifikat...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="glass-panel-light rounded-3xl p-16 text-center shadow-sm max-w-2xl mx-auto my-4 animate-fade-in">
              <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100/50 shadow-sm">
                <Award className="w-8 h-8 text-emerald-650" />
              </div>
              <h3 className="text-xl font-black text-slate-805 mb-1">Belum Ada Sertifikat Siap Rilis</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Menunggu keputusan sidang Majelis Akreditasi untuk penetapan hasil penilaian berikutnya.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {submissions.map((sub) => {
                const isReleased = sub.status === 'released';
                
                return (
                  <div 
                    key={sub.submission_id} 
                    className="group glass-panel-light glass-panel-light-hover rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm transition-all duration-300 relative overflow-hidden group animate-fade-in"
                  >
                    {/* Top colored gradient line based on status */}
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isReleased ? 'from-slate-400 to-slate-500' : 'from-emerald-400 to-teal-500'}`} />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 border border-emerald-250 text-emerald-800 uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <Award className="w-3.5 h-3.5" />
                            {sub.final_rank}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-slate-100 border border-slate-200 text-slate-600 shadow-sm">
                            {sub.sk_number}
                          </span>
                          <span className="text-slate-400 text-xs font-semibold">
                            Skor Akhir: <strong className="text-slate-700 font-bold">{sub.final_score}</strong>
                          </span>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">
                            {sub.program_studi || 'Program Studi'}
                          </h3>
                          <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                            <span className="text-emerald-800 font-black">{sub.institusi || 'Institusi Universitas'}</span>
                            <span>•</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase font-black text-slate-600">
                              {sub.program_type || 'Program Studi'}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-450 pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Tanggal Sidang: {formatDate(sub.sk_date)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {isReleased ? (
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-wider border border-slate-200/80 shadow-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-600 animate-pulse" />
                            <span>Sudah Dirilis</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => navigate(`/release/${sub.submission_id}`)}
                            className="px-5 py-2.5 bg-gradient-to-tr from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-750 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                          >
                            <span>Terbitkan Sertifikat</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
