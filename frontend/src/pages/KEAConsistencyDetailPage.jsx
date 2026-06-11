import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  TrendingUp, ChevronLeft, CheckCircle, XCircle, AlertTriangle, 
  RefreshCw, X, GraduationCap, Award
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const CRITERIA_NAMES = {
  '1': 'K1: Visi, Misi, Tujuan & Strategi',
  '2': 'K2: Tata Kelola & Kerjasama', 
  '3': 'K3: Mahasiswa',
  '4': 'K4: Sumber Daya Manusia',
  '5': 'K5: Keuangan, Sarana & Prasarana',
  '6': 'K6: Pendidikan',
  '7': 'K7: Penelitian & PKM'
};

export default function KEAConsistencyDetailPage({ user }) {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, [submissionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/kea/consistency/${submissionId}/detail`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        setMessage({ type: 'error', text: 'Gagal memuat data' });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Terjadi kesalahan' });
    } finally {
      setLoading(false);
    }
  };

  const handleConsistencyCheck = async (consistent) => {
    if (!confirm(`Apakah Anda yakin ingin menandai pengajuan ini sebagai ${consistent ? 'KONSISTEN' : 'TIDAK KONSISTEN'}?`)) {
      return;
    }

    setSubmitting(true);
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
        setMessage({ type: 'success', text: 'Status konsistensi berhasil diupdate!' });
        setTimeout(() => navigate('/kea/consistency'), 1500);
      } else {
        const err = await response.json();
        setMessage({ type: 'error', text: err.message || 'Gagal update status' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Terjadi kesalahan' });
    } finally {
      setSubmitting(false);
    }
  };

  const getDifferenceColor = (diff) => {
    if (diff <= 5) return 'text-emerald-800 bg-emerald-50 border border-emerald-200';
    if (diff <= 10) return 'text-amber-800 bg-amber-50 border border-amber-200';
    return 'text-rose-800 bg-rose-50 border border-rose-250';
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
        <div className="p-8 max-w-6xl mx-auto space-y-6">
          
          {/* Back Button */}
          <button
            onClick={() => navigate('/kea/consistency')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black text-xs uppercase tracking-wider transition-all duration-200 group cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
            Kembali ke Daftar
          </button>

          {/* Header */}
          <header className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm shadow-purple-100/50">
                  <TrendingUp className="w-5 h-5" />
                </div>
                Detail Analisis Konsistensi
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">
                Perbandingan nilai per kriteria antara dua asesor penilai instrumen kecukupan
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-purple-600 font-bold text-xs cursor-pointer active:scale-95"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
          </header>

          {/* Message */}
          {message && (
            <div className={`rounded-xl p-4 border animate-fade-in ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
              'bg-rose-50 border-rose-250 text-rose-800'
            }`}>
              <p className="text-xs font-black uppercase tracking-wider">{message.type === 'success' ? 'Sukses ✓' : 'Error'}</p>
              <p className="text-sm font-semibold mt-0.5">{message.text}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 glass-panel-light rounded-2xl shadow-sm animate-pulse">
              <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mb-3" />
              <p className="text-slate-500 font-bold text-sm">Menyelaraskan detail perbandingan...</p>
            </div>
          ) : !data ? (
            <div className="glass-panel-light rounded-2xl p-16 text-center shadow-sm max-w-2xl mx-auto my-6 animate-fade-in">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <XCircle className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Data Tidak Ditemukan</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Pengajuan akreditasi ini tidak memiliki data konsistensi yang valid.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              
              {/* Submission Info */}
              <div className="glass-panel-light rounded-2xl p-6 shadow-sm">
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                  {data.submissionId}
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug mt-1">{data.programStudi}</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  {data.institusi}
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Assessor 1 */}
                <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex flex-col justify-between group">
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Total Skor Asesor 1
                    </p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{data.assessor1.totalScore.toFixed(2)}</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-655 truncate mt-4 border-t border-slate-100 pt-3">{data.assessor1.name}</p>
                </div>

                {/* Assessor 2 */}
                <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex flex-col justify-between group">
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Total Skor Asesor 2
                    </p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{data.assessor2.totalScore.toFixed(2)}</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-655 truncate mt-4 border-t border-slate-100 pt-3">{data.assessor2.name}</p>
                </div>

                {/* Selisih */}
                <div className={`bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 border-l-4 ${
                  data.scoreDifference <= 5 ? 'border-emerald-500' : 'border-rose-500'
                } shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden flex flex-col justify-between group`}>
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${data.scoreDifference <= 5 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      Selisih Total
                    </p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{data.scoreDifference.toFixed(2)}</p>
                  </div>
                  <p className={`text-xs font-black mt-4 border-t border-slate-100 pt-3 ${data.scoreDifference <= 5 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {data.scoreDifference <= 5 ? '✓ Dalam batas toleransi' : '⚠ Melebihi batas (5)'}
                  </p>
                </div>
              </div>

              {/* Per-Criteria Comparison Table */}
              <div className="glass-panel-light rounded-2xl shadow-sm overflow-hidden border border-slate-200/60">
                <div className="p-6 border-b border-slate-200/60 bg-slate-50/50">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Perbandingan Nilai Per Kriteria</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-600 to-indigo-650 text-white">
                        <th className="px-6 py-4.5 text-left text-xs font-black uppercase tracking-wider">Kriteria Evaluasi</th>
                        <th className="px-6 py-4.5 text-center text-xs font-black uppercase tracking-wider min-w-[150px]">
                          <div>{data.assessor1.name.split(' ').slice(0, 2).join(' ')}</div>
                          <div className="text-[9px] font-bold opacity-80 mt-0.5">Asesor 1 (Total)</div>
                        </th>
                        <th className="px-6 py-4.5 text-center text-xs font-black uppercase tracking-wider min-w-[150px]">
                          <div>{data.assessor2.name.split(' ').slice(0, 2).join(' ')}</div>
                          <div className="text-[9px] font-bold opacity-80 mt-0.5">Asesor 2 (Total)</div>
                        </th>
                        <th className="px-6 py-4.5 text-center text-xs font-black uppercase tracking-wider min-w-[120px]">Selisih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150/60 bg-white/40">
                      {Object.entries(CRITERIA_NAMES).map(([key, name]) => {
                        const score1 = data.assessor1.scores[key] || 0;
                        const score2 = data.assessor2.scores[key] || 0;
                        const diff = Math.abs(score1 - score2);
                        
                        return (
                          <tr key={key} className="hover:bg-purple-50/40 transition-colors duration-150">
                            <td className="px-6 py-4.5 text-xs font-black text-slate-800">{name}</td>
                            <td className="px-6 py-4.5 text-center">
                              <span className="text-sm font-black text-blue-650">{score1.toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4.5 text-center">
                              <span className="text-sm font-black text-purple-650">{score2.toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4.5 text-center">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getDifferenceColor(diff)}`}>
                                {diff.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/70 border-t border-slate-200/80 font-black">
                        <td className="px-6 py-4 text-xs text-slate-900 uppercase font-black">TOTAL SKOR AKHIR</td>
                        <td className="px-6 py-4 text-center text-sm text-blue-700">
                          {data.assessor1.totalScore.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-purple-700">
                          {data.assessor2.totalScore.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-slate-900">
                          {data.scoreDifference.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="glass-panel-light rounded-2xl p-6 shadow-sm border border-slate-200/60">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Keputusan Konsistensi KEA</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => handleConsistencyCheck(true)}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-tr from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-750 text-white rounded-xl disabled:from-slate-200 disabled:to-slate-350 transition-all duration-150 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg shadow-emerald-100/80 active:scale-95 hover:-translate-y-0.5"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Nyatakan Konsisten
                  </button>
                  <button
                    onClick={() => handleConsistencyCheck(false)}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-tr from-amber-500 to-orange-650 hover:from-amber-600 hover:to-orange-750 text-white rounded-xl disabled:from-slate-200 disabled:to-slate-350 transition-all duration-150 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg shadow-amber-100/80 active:scale-95 hover:-translate-y-0.5"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    Perlu Diskusi Panel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
