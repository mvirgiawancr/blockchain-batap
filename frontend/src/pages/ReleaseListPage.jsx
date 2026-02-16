import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Award, Stamp, CheckCircle, RefreshCw, Printer, ArrowRight, Calendar 
} from 'lucide-react';
import api from '../services/api';

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
    <div className="p-8 font-sans min-h-screen">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Stamp className="w-8 h-8 text-emerald-700" />
            Rilis Sertifikat Akreditasi
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Terbitkan dan distribusikan sertifikat akreditasi final.</p>
        </div>
        <button
          onClick={fetchSubmissions}
          className="p-3 rounded-xl bg-white shadow-sm border border-gray-200 hover:shadow-md hover:bg-gray-50 transition-all text-emerald-700 self-start md:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-6"></div>
          <p className="text-gray-500 font-medium text-lg">Memuat data sertifikat...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-16 text-center border border-gray-100 max-w-2xl mx-auto">
          <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-12 h-12 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Belum Ada Sertifikat Siap Rilis</h3>
          <p className="text-gray-500 text-lg">Menunggu keputusan Majelis Akreditasi untuk penerbitan sertifikat selanjutnya.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {submissions.map((sub) => (
            <div 
                key={sub.submission_id} 
                className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 hover:shadow-lg transition-all relative"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {sub.final_rank}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-mono">
                            {sub.sk_number}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">
                        {sub.program_studi}
                    </h3>
                    <p className="text-gray-500 font-medium">{sub.institusi}</p>
                </div>
                
                <div className="flex items-center gap-4">
                     {sub.status === 'released' ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-500 rounded-lg font-medium border border-gray-200">
                            <CheckCircle className="w-5 h-5" />
                            <span>Sudah Dirilis</span>
                        </div>
                     ) : (
                        <button
                          onClick={() => navigate(`/release/${sub.submission_id}`)}
                          className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold shadow-md hover:shadow-emerald-200 transition-all flex items-center gap-2 active:scale-95"
                        >
                          Terbitkan Sertifikat
                          <ArrowRight className="w-4 h-4" />
                        </button>
                     )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
