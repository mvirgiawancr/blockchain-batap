import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Gavel, Calendar, Award, RefreshCw, FileCheck, ExternalLink, Upload } from 'lucide-react';

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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex h-screen bg-purple-50 overflow-hidden">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('majelis')}
      />

      <div className="flex-1 ml-64 overflow-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Gavel className="w-8 h-8 text-purple-800" />
              Keputusan Majelis Akreditasi
            </h1>
            <p className="text-gray-600 mt-1">Tetapkan peringkat dan SK akreditasi final</p>
          </div>
          <button
            onClick={() => { fetchSubmissions(); fetchDecided(); }}
            className="p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </header>

        {/* Pending Decisions Section */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-purple-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Memuat data...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-purple-100 mb-8">
            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="w-6 h-6 text-purple-800" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Semua Sudah Diputuskan</h3>
            <p className="text-gray-500 text-sm">Tidak ada submission yang menunggu keputusan majelis saat ini.</p>
          </div>
        ) : (
          <div className="grid gap-4 mb-8">
            <h2 className="text-lg font-bold text-gray-700">Menunggu Keputusan</h2>
            {submissions.map((sub) => (
              <div key={sub.submission_id} className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-purple-600 hover:shadow-md transition-all flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{sub.program_studi}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <span className="font-medium text-purple-700">{sub.institusi}</span>
                    <span>•</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{sub.program_type || 'Program Studi'}</span>
                  </div>
                  <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded text-purple-800 font-medium">
                      <Award className="w-4 h-4" />
                      Rekomendasi Rank: {sub.recommended_rank}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileCheck className="w-4 h-4" />
                      Skor Verifikasi: {sub.verified_score}
                    </span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      Diverifikasi: {formatDate(sub.verified_at)}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => navigate(`/majelis-decision/${sub.submission_id}`)}
                  className="px-6 py-2 bg-purple-800 text-white rounded-lg hover:bg-purple-900 font-medium transition-colors shadow-lg shadow-purple-200"
                >
                  Tetapkan Keputusan
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Already Decided Submissions */}
        {decidedSubmissions.length > 0 && (
          <div className="mt-4">
            <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Keputusan Selesai
            </h2>
            <div className="grid gap-3">
              {decidedSubmissions.map((sub) => {
                const isFallbackCid = sub.certificate_cid && sub.certificate_cid.startsWith('QmCertFallback');
                const needsReupload = !sub.certificate_cid || isFallbackCid;
                
                return (
                  <div key={sub.submission_id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-gray-900">{sub.program_studi || 'Program Studi'}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
                            ⭐ {sub.final_rank}
                          </span>
                          <span className="text-gray-400 text-sm">Skor: {sub.final_score}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>SK: <strong className="text-gray-700 font-mono">{sub.sk_number}</strong></span>
                          <span>Tanggal: {formatDate(sub.sk_date)}</span>
                          {needsReupload && (
                            <span className="text-amber-600 font-medium flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" />
                              IPFS upload pending
                            </span>
                          )}
                          {!needsReupload && (
                            <span className="text-green-600 font-medium">✅ Sertifikat terbit</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/release/${sub.submission_id}`)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 ${
                            needsReupload 
                              ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <ExternalLink className="w-4 h-4" />
                          {needsReupload ? 'Re-upload IPFS' : 'Lihat Sertifikat'}
                        </button>
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
  );
}
