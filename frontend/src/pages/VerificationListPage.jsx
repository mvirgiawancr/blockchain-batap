import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
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
    if (s >= 3.5) return 'text-green-700 bg-green-50 border-green-200';
    if (s >= 2.5) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (s >= 1.5) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 overflow-hidden">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('kea')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-indigo-600" />
                Verifikasi Hasil AL
              </h1>
              <p className="text-gray-500 mt-1">
                Review dan verifikasi hasil Asesmen Lapangan sebelum diajukan ke Majelis
              </p>
            </div>
            <button
              onClick={fetchSubmissions}
              className="p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </header>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
                <p className="text-sm text-gray-500">Menunggu Verifikasi</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.length > 0 
                    ? (submissions.reduce((sum, s) => sum + parseFloat(s.al_score || 0), 0) / submissions.length).toFixed(2) 
                    : '-'}
                </p>
                <p className="text-sm text-gray-500">Rata-rata Skor AL</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.filter(s => parseFloat(s.al_score || 0) >= 3.5).length}
                </p>
                <p className="text-sm text-gray-500">Skor ≥ 3.50</p>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Semua Beres!</h3>
              <p className="text-gray-500">Tidak ada submission yang perlu diverifikasi saat ini.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Submission Menunggu Verifikasi
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Klik verifikasi untuk review detail dan memberikan rekomendasi peringkat
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {submissions.map((sub) => (
                  <div 
                    key={sub.submission_id} 
                    className="p-5 hover:bg-indigo-50/50 transition-colors group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Menunggu Verifikasi
                          </span>
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(sub.al_submitted_at)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                          {sub.program_studi}
                        </h3>
                        <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          {sub.institution || sub.institusi}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Score Badge */}
                        <div className={`px-4 py-2 rounded-xl border-2 text-center min-w-[80px] ${getScoreColor(sub.al_score)}`}>
                          <p className="text-xs font-medium opacity-75">Skor AL</p>
                          <p className="text-xl font-bold">{sub.al_score || '0.00'}</p>
                        </div>
                        
                        <button
                          onClick={() => navigate(`/verification/${sub.submission_id}`)}
                          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95"
                        >
                          <ShieldCheck className="w-4 h-4" />
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
      </div>
    </div>
  );
}
