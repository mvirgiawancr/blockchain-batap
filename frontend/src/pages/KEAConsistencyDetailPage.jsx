import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { TrendingUp, ChevronLeft, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Nama kriteria sesuai LAM-TEK
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
    if (!confirm(`Apakah Anda yakin ingin menandai submission ini sebagai ${consistent ? 'KONSISTEN' : 'TIDAK KONSISTEN'}?`)) {
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
    if (diff <= 5) return 'text-green-600 bg-green-50';
    if (diff <= 10) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 overflow-hidden">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('kea')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {/* Back Button */}
          <button
            onClick={() => navigate('/kea/consistency')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Kembali ke Daftar Konsistensi
          </button>

          {/* Header */}
          <header className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                Detail Analisis Konsistensi
              </h1>
              <p className="text-gray-600 mt-1">
                Perbandingan nilai per kriteria antara dua asesor
              </p>
            </div>
            <button
              onClick={loadData}
              className="p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </header>

          {/* Message */}
          {message && (
            <div className={`rounded-xl p-4 ${
              message.type === 'success' ? 'bg-green-50 border-2 border-green-200 text-green-800' :
              'bg-red-50 border-2 border-red-200 text-red-800'
            }`}>
              <p className="font-medium">{message.text}</p>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : !data ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Data Tidak Ditemukan</h3>
              <p className="text-gray-500">Submission ini tidak memiliki data konsistensi</p>
            </div>
          ) : (
            <>
              {/* Submission Info */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{data.programStudi}</h2>
                <p className="text-gray-600">{data.institusi}</p>
                <p className="text-sm text-gray-400 mt-2">ID: {data.submissionId}</p>
              </div>

              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                  <p className="text-sm text-gray-500 mb-1">Total Asesor 1</p>
                  <p className="text-3xl font-bold text-gray-900">{data.assessor1.totalScore.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-1 truncate">{data.assessor1.name}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                  <p className="text-sm text-gray-500 mb-1">Total Asesor 2</p>
                  <p className="text-3xl font-bold text-gray-900">{data.assessor2.totalScore.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-1 truncate">{data.assessor2.name}</p>
                </div>
                <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${
                  data.scoreDifference <= 15 ? 'border-green-500' : 'border-red-500'
                }`}>
                  <p className="text-sm text-gray-500 mb-1">Selisih Total</p>
                  <p className="text-3xl font-bold text-gray-900">{data.scoreDifference.toFixed(2)}</p>
                  <p className={`text-sm mt-1 ${data.scoreDifference <= 15 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.scoreDifference <= 15 ? '✓ Dalam batas toleransi' : '⚠ Melebihi batas (15)'}
                  </p>
                </div>
              </div>

              {/* Per-Criteria Comparison Table */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">Perbandingan Per Kriteria</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Kriteria</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold">
                          <div>{data.assessor1.name.split(' ').slice(0, 2).join(' ')}</div>
                          <div className="text-xs font-normal opacity-80">Asesor 1</div>
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold">
                          <div>{data.assessor2.name.split(' ').slice(0, 2).join(' ')}</div>
                          <div className="text-xs font-normal opacity-80">Asesor 2</div>
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold">Selisih</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(CRITERIA_NAMES).map(([key, name]) => {
                        const score1 = data.assessor1.scores[key] || 0;
                        const score2 = data.assessor2.scores[key] || 0;
                        const diff = Math.abs(score1 - score2);
                        
                        return (
                          <tr key={key} className="hover:bg-purple-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{name}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-lg font-bold text-blue-600">{score1.toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-lg font-bold text-purple-600">{score2.toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifferenceColor(diff)}`}>
                                {diff.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {diff <= 5 ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : diff <= 10 ? (
                                <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">TOTAL</td>
                        <td className="px-6 py-4 text-center text-lg font-bold text-blue-700">
                          {data.assessor1.totalScore.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center text-lg font-bold text-purple-700">
                          {data.assessor2.totalScore.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center text-lg font-bold text-gray-900">
                          {data.scoreDifference.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {data.scoreDifference <= 15 ? (
                            <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Keputusan Konsistensi</h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleConsistencyCheck(true)}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 font-semibold"
                  >
                    <CheckCircle className="w-6 h-6" />
                    Nyatakan Konsisten
                  </button>
                  <button
                    onClick={() => handleConsistencyCheck(false)}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors disabled:opacity-50 font-semibold"
                  >
                    <AlertTriangle className="w-6 h-6" />
                    Perlu Diskusi Panel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
