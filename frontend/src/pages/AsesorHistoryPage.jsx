import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Award, Search, RefreshCw, Clock, ClipboardCheck, BookOpen, Calendar, ChevronRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function AsesorHistoryPage({ user }) {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHistory(history);
      return;
    }

    const filtered = history.filter(item => 
      item.programStudi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.institusi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.submissionId.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredHistory(filtered);
  }, [searchQuery, history]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/asesor/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        setHistory(list);
        setFilteredHistory(list);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    const num = parseFloat(score);
    if (isNaN(num)) return 'from-slate-500 to-slate-655 text-slate-700 bg-slate-50 border-slate-200';
    if (num >= 3.61) return 'from-emerald-500 to-teal-500 text-emerald-800 bg-emerald-50 border-emerald-200';
    if (num >= 3.01) return 'from-blue-500 to-indigo-500 text-blue-800 bg-blue-50 border-blue-200';
    if (num >= 2.01) return 'from-amber-500 to-orange-550 text-amber-800 bg-amber-50 border-amber-200';
    return 'from-rose-500 to-red-500 text-rose-800 bg-rose-50 border-rose-200';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[600px] h-[600px] bg-indigo-200/10 rounded-full blur-[150px] pointer-events-none" />

      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('asesor')}
      />

      <div className="flex-1 ml-64 overflow-auto relative z-10">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <header className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shadow-sm shadow-indigo-100/50">
                  <BookOpen className="w-5 h-5" />
                </div>
                Riwayat Penilaian
              </h1>
              <p className="text-slate-550 text-sm font-semibold mt-1">
                Pantau seluruh pengajuan akreditasi yang telah Anda berikan penilaian kecukupan (AK)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadHistory}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-indigo-600 font-bold text-xs cursor-pointer active:scale-95"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </header>

          {/* Search bar - Glass Box */}
          <div className="glass-panel-light rounded-2xl p-6 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari riwayat berdasarkan prodi, universitas, atau submission ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-sm font-semibold transition-all duration-200 outline-none focus:shadow-sm"
              />
            </div>
          </div>

          {/* Content Listing */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm animate-pulse">
              <Clock className="w-10 h-10 text-indigo-500 animate-bounce mb-3" />
              <p className="text-slate-550 font-bold text-sm">Menyelaraskan riwayat penilaian...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="glass-panel-light rounded-2xl p-16 text-center shadow-sm max-w-2xl mx-auto my-6 animate-fade-in">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                <BookOpen className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Riwayat Kosong</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Anda belum memiliki riwayat pengisian Asesmen Kecukupan (AK) akreditasi saat ini.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {filteredHistory.map((item) => {
                const scoreColorClass = getScoreColor(item.finalScore);
                return (
                  <div
                    key={item.id}
                    className="glass-panel-light glass-panel-light-hover rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[220px]"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-blue-500" />

                    <div>
                      {/* Title & Info */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-900 tracking-tight leading-snug group-hover:text-indigo-650 transition-colors truncate">
                            {item.programStudi}
                          </h3>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {item.institusi}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">{item.submissionId}</p>
                        </div>
                      </div>

                      {/* Assessed Date */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <Calendar className="w-4 h-4 text-slate-450" />
                        <span>Dinilai: {new Date(item.assessedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                      </div>
                    </div>

                    {/* Footer Score & Detail Trigger */}
                    <div className="pt-3.5 border-t border-slate-100/60 flex items-center justify-between mt-auto">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nilai Total AK</p>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border mt-1 shadow-inner-sm ${scoreColorClass}`}>
                          <Award className="w-3.5 h-3.5" />
                          {parseFloat(item.finalScore || 0).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => navigate(`/asesor/detail/${item.submissionId}`)}
                        className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-650 hover:text-indigo-750 transition-colors cursor-pointer bg-indigo-50/30 border border-indigo-100 rounded-xl px-3 py-1.5 active:scale-95"
                      >
                        Detail
                        <ChevronRight className="w-3 h-3" />
                      </button>
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
