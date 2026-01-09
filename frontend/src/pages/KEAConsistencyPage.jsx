import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { TrendingUp, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

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
        setMessage({ type: 'success', text: consistent ? 'Submission berhasil ditandai sebagai KONSISTEN!' : 'Submission ditandai untuk DISKUSI PANEL.' });
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
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 overflow-hidden">
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
                <TrendingUp className="w-8 h-8 text-purple-600" />
                Analisis Konsistensi
              </h1>
              <p className="text-gray-600 mt-1">Verifikasi konsistensi penilaian antar asesor</p>
            </div>
            <button
              onClick={loadData}
              className="p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </header>

          {/* List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Semua Konsisten</h3>
              <p className="text-gray-500">Tidak ada submission yang perlu dicek konsistensinya saat ini</p>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{item.programStudi}</h3>
                      <p className="text-gray-600">{item.institusi}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      item.isConsistent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.isConsistent ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                      <span className="font-semibold">
                        Selisih: {item.scoreDifference.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-sm text-gray-500 mb-1">Asesor 1</p>
                      <p className="font-bold text-gray-900 text-lg">{item.assessor1.name}</p>
                      <p className="text-blue-600 font-bold text-2xl mt-2">{item.assessor1.score.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <p className="text-sm text-gray-500 mb-1">Asesor 2</p>
                      <p className="font-bold text-gray-900 text-lg">{item.assessor2.name}</p>
                      <p className="text-purple-600 font-bold text-2xl mt-2">{item.assessor2.score.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/kea/consistency/${item.submissionId}`)}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Lihat Detail
                    </button>
                    <button
                      onClick={() => handleConsistencyCheck(item.submissionId, true)}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Nyatakan Konsisten
                    </button>
                    <button
                      onClick={() => handleConsistencyCheck(item.submissionId, false)}
                      className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Diskusi Panel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      {showResultModal && message && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            )}
            <h3 className={`text-xl font-bold mb-2 ${
              message.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {message.type === 'success' ? 'Berhasil!' : 'Error'}
            </h3>
            <p className="text-gray-600 mb-6">{message.text}</p>
            <button
              onClick={() => { setShowResultModal(false); setMessage(null); }}
              className={`px-8 py-3 rounded-xl font-semibold text-white transition-colors ${
                message.type === 'success' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
