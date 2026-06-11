import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, Clock, AlertTriangle, RefreshCw, 
  FileText, ArrowRight, Calendar, Building2, Award, ShieldCheck, BarChart3
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function VerificationListPage({ user }) {
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
      const response = await fetch(`${API_BASE_URL}/verification/list/pending`, {
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

  const getScoreColor = (score) => {
    const s = parseFloat(score);
    if (s >= 3.5) return 'text-emerald-800 bg-emerald-50 border-emerald-200';
    if (s >= 2.5) return 'text-blue-800 bg-blue-50 border-blue-200';
    if (s >= 1.5) return 'text-amber-800 bg-amber-50 border-amber-250';
    return 'text-rose-800 bg-rose-50 border-rose-250';
  };

  return (
    <div className="space-y-8 relative z-10 w-full">
      {/* Ambient background glow inside the main container */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[600px] h-[600px] bg-purple-200/5 rounded-full blur-[150px] pointer-events-none" />
      
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-100/50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            Verifikasi Hasil AL
          </h1>
          <p className="text-slate-550 text-sm font-semibold mt-1">
            Review dan verifikasi hasil Asesmen Lapangan dari tim asesor sebelum diteruskan ke Majelis
          </p>
        </div>
        <button
          onClick={fetchSubmissions}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-indigo-600 font-bold text-xs cursor-pointer active:scale-95"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Pending */}
        <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex items-center justify-between group">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
          <div>
            <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Menunggu Verifikasi</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{submissions.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex items-center justify-between group">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
          <div>
            <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Rata-rata Skor AL</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {submissions.length > 0 
                ? (submissions.reduce((sum, s) => sum + parseFloat(s.al_score || 0), 0) / submissions.length).toFixed(2) 
                : '-'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        {/* High Scores */}
        <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex items-center justify-between group">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <div>
            <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Skor Unggul (≥ 3.50)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {submissions.filter(s => parseFloat(s.al_score || 0) >= 3.5).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 glass-panel-light rounded-2xl shadow-sm animate-pulse">
          <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-3" />
          <p className="text-slate-550 font-bold text-sm">Menyelaraskan berkas verifikasi...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="glass-panel-light rounded-2xl p-16 text-center shadow-sm max-w-2xl mx-auto my-6 animate-fade-in">
          <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">Semua Berkas Selesai!</h3>
          <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
            Luar biasa! Tidak ada data hasil Asesmen Lapangan yang menunggu verifikasi KEA saat ini.
          </p>
        </div>
      ) : (
        <div className="glass-panel-light rounded-2xl shadow-sm overflow-hidden border border-slate-200/60 animate-fade-in">
          <div className="p-6 border-b border-slate-200/60 bg-slate-50/50">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Submission Menunggu Verifikasi
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Review detail temuan asesor dan tanggapan UPPS, lalu berikan rekomendasi keputusan peringkat
            </p>
          </div>
          <div className="divide-y divide-slate-150/60 bg-white/40">
            {submissions.map((sub) => (
              <div 
                key={sub.submission_id} 
                className="p-6 hover:bg-slate-50/70 transition-all duration-150 group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black bg-amber-50 border border-amber-255 text-amber-800 uppercase shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Menunggu Verifikasi
                      </span>
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Diajukan: {formatDate(sub.al_submitted_at)}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-650 transition-colors leading-snug">
                      {sub.program_studi}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-550">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {sub.institution || sub.institusi}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Score Badge */}
                    <div className={`px-4.5 py-2.5 rounded-2xl border text-center min-w-[90px] shadow-sm ${getScoreColor(sub.al_score)}`}>
                      <p className="text-[9px] font-black uppercase tracking-wider opacity-70">Skor AL</p>
                      <p className="text-2xl font-black mt-0.5 tracking-tight">{sub.al_score || '0.00'}</p>
                    </div>
                    
                    <button
                      onClick={() => navigate(`/verification/${sub.submission_id}`)}
                      className="w-full sm:w-auto px-5 py-3 bg-gradient-to-tr from-indigo-600 to-purple-650 hover:from-indigo-700 hover:to-purple-750 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg shadow-indigo-100/80 transition-all duration-150 active:scale-95 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4.5 h-4.5" />
                      Verifikasi
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
