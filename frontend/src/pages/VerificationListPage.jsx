import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    CheckCircle, Clock, AlertTriangle, Search, Filter, 
    RefreshCw, FileText, ArrowRight, Calendar, Building 
} from 'lucide-react';
import api from '../services/api';

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

  return (
    <div className="p-8 font-sans min-h-screen">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-indigo-600" />
            Verifikasi Hasil AL
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Daftar program studi yang telah menyelesaikan Asesmen Lapangan dan menunggu verifikasi.
          </p>
        </div>
        <button
          onClick={fetchSubmissions}
          className="p-3 rounded-xl bg-white shadow-sm border border-gray-200 hover:shadow-md hover:bg-gray-50 transition-all text-gray-600 self-start md:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
          <p className="text-gray-500 font-medium text-lg">Memuat data submission...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-16 text-center border border-gray-100 max-w-2xl mx-auto">
          <div className="bg-green-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Semua Beres!</h3>
          <p className="text-gray-500 text-lg">Tidak ada submission yang perlu diverifikasi saat ini.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {submissions.map((sub) => (
            <div 
                key={sub.submission_id} 
                className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                                Menunggu Verifikasi
                             </span>
                             <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(sub.al_submitted_at)}
                             </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-indigo-700 transition-colors">
                            {sub.program_studi}
                        </h3>
                        <div className="flex items-center text-gray-500 font-medium">
                            <Building className="w-4 h-4 mr-2" />
                            {sub.institution || sub.institusi}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Skor AL</p>
                            <p className="text-2xl font-bold text-gray-800">{sub.al_score || '0.00'}</p>
                        </div>
                        
                        <button
                            onClick={() => navigate(`/verification/${sub.submission_id}`)}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-md hover:shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95"
                        >
                            Verifikasi
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
