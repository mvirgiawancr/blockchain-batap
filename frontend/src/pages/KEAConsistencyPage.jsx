import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  TrendingUp, CheckCircle, XCircle, AlertTriangle, RefreshCw, 
  Eye, Award, ArrowRight, GraduationCap
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function KEAConsistencyPage({ user }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/kea/consistency`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading consistency data:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConsistencyCheck = async (submissionId, consistent) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/kea/consistency/${submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          consistent,
          notes: consistent ? 'Konsistensi diverifikasi oleh KEA' : 'Perlu diskusi panel'
        })
      });

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: consistent 
            ? 'Pengajuan berhasil ditandai sebagai KONSISTEN ✓' 
            : 'Pengajuan ditandai untuk DISKUSI PANEL.' 
        });
        loadData();
      } else {
        const err = await response.json();
        setMessage({ type: 'error', text: err.message || 'Gagal update status konsistensi' });
      }
      setShowResultModal(true);
    } catch (error) {
      console.error('Error updating consistency:', error);
      setMessage({ type: 'error', text: 'Terjadi kesalahan koneksi' });
      setShowResultModal(true);
    }
  };

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
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm shadow-purple-100/50">
                  <TrendingUp className="w-5 h-5" />
                </div>
                Analisis Konsistensi
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">
                Verifikasi konsistensi penilaian kecukupan antar tim asesor untuk integritas skor LAM-TEK
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-purple-600 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
              Refresh Data
            </button>
          </header>

          {/* List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 glass-panel-light rounded-2xl shadow-sm animate-pulse">
              <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mb-3" />
              <p className="text-slate-500 font-bold text-sm">Menyelaraskan data konsistensi...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="glass-panel-light rounded-2xl p-16 text-center shadow-sm max-w-2xl mx-auto my-6 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Semua Penilaian Konsisten</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Hebat! Tidak ada berkas pengajuan penilaian asesor yang berada di luar batas selisih toleransi konsistensi saat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {items.map((item) => {
                const isConsistent = item.isConsistent;
                const stripeColor = isConsistent ? 'bg-emerald-500' : 'bg-amber-500';

                return (
                  <div 
                    key={item.id} 
                    className="glass-panel-light glass-panel-light-hover rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
                  >
                    {/* Status Stripe */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${stripeColor}`} />

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2.5">
                          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                            {item.submissionId}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug group-hover:text-purple-650 transition-colors">
                          {item.programStudi}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          {item.institusi}
                        </p>
                      </div>

                      {/* Difference Capsule Badge */}
                      <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border shadow-inner-sm w-fit ${
                        isConsistent 
                          ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}>
                        {isConsistent ? (
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
                        ) : (
                          <AlertTriangle className="w-4.5 h-4.5 text-amber-600 animate-pulse" />
                        )}
                        <span className="text-xs font-black uppercase tracking-wider">
                          Selisih Skor: {item.scoreDifference.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Scores Comparison Panels */}
                    <div className="grid md:grid-cols-2 gap-4.5 mb-6">
                      {/* Assessor 1 */}
                      <div className="p-4.5 bg-blue-50/40 rounded-2xl border border-blue-150/60 shadow-inner-sm flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-450 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Asesor 1
                          </p>
                          <p className="font-black text-slate-800 text-xs truncate max-w-[180px]">{item.assessor1.name}</p>
                        </div>
                        <p className="text-blue-650 font-black text-2xl tracking-tight leading-none">
                          {item.assessor1.score.toFixed(2)}
                        </p>
                      </div>

                      {/* Assessor 2 */}
                      <div className="p-4.5 bg-purple-50/40 rounded-2xl border border-purple-150/60 shadow-inner-sm flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-455 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            Asesor 2
                          </p>
                          <p className="font-black text-slate-800 text-xs truncate max-w-[180px]">{item.assessor2.name}</p>
                        </div>
                        <p className="text-purple-650 font-black text-2xl tracking-tight leading-none">
                          {item.assessor2.score.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Actions Block */}
                    <div className="flex flex-wrap md:justify-end gap-3 pt-4 border-t border-slate-100/60">
                      <button
                        onClick={() => navigate(`/kea/consistency/${item.submissionId}`)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-sm hover:shadow transition-all duration-150 active:scale-95"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                        Lihat Rincian
                      </button>
                      <button
                        onClick={() => handleConsistencyCheck(item.submissionId, true)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-750 text-white rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg shadow-emerald-100/80 transition-all duration-150 active:scale-95 hover:-translate-y-0.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Nyatakan Konsisten
                      </button>
                      <button
                        onClick={() => handleConsistencyCheck(item.submissionId, false)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-amber-500 to-orange-650 hover:from-amber-600 hover:to-orange-750 text-white rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg shadow-amber-100/80 transition-all duration-150 active:scale-95 hover:-translate-y-0.5"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Diskusi Panel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      {showResultModal && message && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full p-6 text-center animate-fade-in">
            <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-t-2xl" />
            
            {message.type === 'success' ? (
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-sm">
                <XCircle className="w-8 h-8 text-rose-500" />
              </div>
            )}
            
            <h3 className={`text-lg font-black mb-2 tracking-tight ${
              message.type === 'success' ? 'text-emerald-800' : 'text-rose-800'
            }`}>
              {message.type === 'success' ? 'Verifikasi Sukses ✓' : 'Proses Gagal'}
            </h3>
            <p className="text-slate-550 text-xs font-semibold leading-relaxed mb-6">{message.text}</p>
            
            <button
              onClick={() => { setShowResultModal(false); setMessage(null); }}
              className={`w-full px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer text-white ${
                message.type === 'success' 
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-750 shadow-md shadow-emerald-100/80' 
                  : 'bg-gradient-to-tr from-rose-600 to-red-650 hover:from-rose-700 hover:to-red-750 shadow-md shadow-rose-100/80'
              }`}
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
