import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { FileText, Save, CheckCircle, AlertCircle, ArrowLeft, Download, File, FileSpreadsheet, ExternalLink } from 'lucide-react';

export default function AsesorAssessmentPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Initial scores for 7 criteria
  const [scores, setScores] = useState({
    '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0
  });
  const [notes, setNotes] = useState('');
  const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  // 7 Kriteria LAM-TEK 2025
  const criteria = [
    { id: '1', name: 'Diferensiasi Misi', weight: 2.05 },
    { id: '2', name: 'Akuntabilitas', weight: 7.06 },
    { id: '3', name: 'Relevansi Pendidikan, Penelitian, dan PkM', weight: 22.45 },
    { id: '4', name: 'Sumber Daya Manusia', weight: 13.44 },
    { id: '5', name: 'Sarana, Prasarana, dan K3L', weight: 7.51 },
    { id: '6', name: 'Mahasiswa dan Luaran Mahasiswa', weight: 26.87 },
    { id: '7', name: 'Sistem Penjaminan Mutu', weight: 15.35 },
  ];

  useEffect(() => {
    loadSubmission();
  }, [id]);

  const loadSubmission = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/submissions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setSubmission(result.data);
      }
    } catch (error) {
      console.error('Error loading submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (criterionId, value) => {
    setScores(prev => ({
      ...prev,
      [criterionId]: parseFloat(value) || 0
    }));
  };

  const calculateTotal = () => {
    // Weighted average
    let totalScore = 0;
    let totalWeight = 0;
    
    criteria.forEach(c => {
      totalScore += scores[c.id] * c.weight;
      totalWeight += c.weight;
    });
    
    return totalWeight > 0 ? (totalScore / totalWeight) : 0;
  };

  const getAiScore = (criterion) => {
    if (!submission?.ai?.scoring?.criteriaScores) return null;
    const aiData = submission.ai.scoring.criteriaScores[criterion.id];
    return aiData ? aiData.averageScore : null;
  };

  const handleDownloadLED = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/download/${id}/led`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LED_${submission.programStudi}_${submission.institusi}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Gagal mengunduh file LED');
      }
    } catch (error) {
      console.error('Error downloading LED:', error);
      alert('Terjadi kesalahan saat mengunduh LED');
    }
  };

  const handleDownloadLKPS = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/download/${id}/lkps`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LKPS_${submission.programStudi}_${submission.institusi}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Gagal mengunduh file LKPS');
      }
    } catch (error) {
      console.error('Error downloading LKPS:', error);
      alert('Terjadi kesalahan saat mengunduh LKPS');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/asesor/assignments/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scores,
          notes
        })
      });

      if (response.ok) {
        setResultModal({
          isOpen: true,
          type: 'success',
          title: 'Penilaian AK Berhasil! 🎉',
          message: 'Penilaian Asesmen Kecukupan Anda telah berhasil disubmit. KEA akan melakukan pengecekan konsistensi dengan penilaian asesor lainnya.'
        });
        // Navigate after modal is closed (handled in modal onClose)
      } else {
        const err = await response.json();
        setResultModal({
          isOpen: true,
          type: 'error',
          title: 'Gagal Submit Penilaian',
          message: err.message || 'Terjadi kesalahan saat submit penilaian. Silakan coba lagi.'
        });
      }
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setResultModal({
        isOpen: true,
        type: 'error',
        title: 'Terjadi Kesalahan',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!submission) {
    return <div className="flex items-center justify-center h-screen">Submission not found</div>;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('asesor')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-5xl mx-auto">
          <button 
            onClick={() => navigate('/asesor/assignments')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Kembali ke Penugasan
          </button>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-white">
              <h1 className="text-3xl font-bold mb-2">
                Penilaian Asesmen Kecukupan (AK)
              </h1>
              <p className="text-indigo-100 text-lg">
                {submission.programStudi} - {submission.institusi}
              </p>
              <p className="text-indigo-200 text-sm mt-1">
                ID Submission: {submission.id}
              </p>
            </div>

            {/* Document Section */}
            <div className="p-8 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-indigo-600" />
                Dokumen Akreditasi
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Unduh dan review dokumen LED-PS dan LKPS sebelum melakukan penilaian
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LED Card */}
                <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 p-6 transition-all hover:shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                        <File className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">LED-PS</h3>
                        <p className="text-sm text-gray-500">Laporan Evaluasi Diri</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Format:</span>
                      <span className="font-semibold text-gray-900">PDF</span>
                    </div>
                    {submission.ipfs?.ledHash && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">IPFS CID:</span>
                        <span className="font-mono text-xs text-gray-500 truncate ml-2" title={submission.ipfs.ledHash}>
                          {submission.ipfs.ledHash.substring(0, 12)}...
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleDownloadLED}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  >
                    <Download className="w-5 h-5" />
                    Download LED-PS
                  </button>
                </div>

                {/* LKPS Card */}
                <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 p-6 transition-all hover:shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">LKPS</h3>
                        <p className="text-sm text-gray-500">Laporan Kinerja Program Studi</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Format:</span>
                      <span className="font-semibold text-gray-900">Excel</span>
                    </div>
                    {submission.ipfs?.lkpsHash && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">IPFS CID:</span>
                        <span className="font-mono text-xs text-gray-500 truncate ml-2" title={submission.ipfs.lkpsHash}>
                          {submission.ipfs.lkpsHash.substring(0, 12)}...
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleDownloadLKPS}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    <Download className="w-5 h-5" />
                    Download LKPS
                  </button>
                </div>
              </div>

              {/* Info Alert */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Panduan Penilaian:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Download dan review kedua dokumen dengan seksama</li>
                    <li>Lihat skor AI sebagai referensi pembanding (bukan patokan)</li>
                    <li>Berikan penilaian objektif berdasarkan kriteria LAM-TEK 2025</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Assessment Form */}
            <form onSubmit={handleSubmit} className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <CheckCircle className="w-6 h-6 mr-2 text-indigo-600" />
                Penilaian 7 Kriteria LAM-TEK 2025
              </h2>

              <div className="space-y-4 mb-8">
                {criteria.map((criterion) => {
                  const aiScore = getAiScore(criterion);
                  
                  return (
                    <div key={criterion.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:border-indigo-300 transition-all">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                              {criterion.id}
                            </span>
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg">{criterion.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">Bobot: {criterion.weight}%</p>
                            </div>
                          </div>
                          
                          {/* AI Recommendation Badge */}
                          {aiScore !== null && (
                            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-lg text-sm border border-purple-200 shadow-sm">
                              <span className="text-lg">🤖</span>
                              <span className="font-semibold">Skor AI: {aiScore.toFixed(2)}</span>
                              <span className="text-purple-600 text-xs">(Referensi)</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0 lg:w-40">
                          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                            Skor Asesor
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="4"
                            step="0.01"
                            value={scores[criterion.id]}
                            onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                            className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-xl text-center text-indigo-600 bg-white"
                            required
                            placeholder="0.00"
                          />
                          <p className="text-xs text-gray-500 text-center mt-1">Skala 0.00 - 4.00</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notes Section */}
              <div className="mb-8 bg-amber-50 rounded-xl p-6 border border-amber-200">
                <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-amber-600" />
                  Catatan Penilaian & Rekomendasi
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="5"
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  placeholder="Tambahkan catatan penilaian, justifikasi skor, atau rekomendasi untuk perbaikan..."
                />
                <p className="text-xs text-gray-600 mt-2">Berikan penjelasan detail mengenai penilaian dan rekomendasi perbaikan</p>
              </div>

              {/* Summary and Submit */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border-2 border-indigo-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Rata-rata Skor (Weighted)</p>
                    <div className="text-3xl font-bold text-indigo-600">
                      {calculateTotal().toFixed(2)}
                      <span className="text-lg text-gray-500 ml-2">/ 4.00</span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all font-bold shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-lg"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-6 h-6" />
                        Submit Penilaian (AK)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Warning */}
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">Perhatian:</span> Setelah submit, penilaian akan dicatat secara permanen di blockchain dan tidak dapat diubah. Pastikan semua skor dan catatan sudah benar.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      <ResultModal
        isOpen={resultModal.isOpen}
        onClose={() => {
          setResultModal({ ...resultModal, isOpen: false });
          if (resultModal.type === 'success') {
            navigate('/asesor/assignments');
          }
        }}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        buttonText={resultModal.type === 'success' ? 'Kembali ke Daftar Penugasan' : 'Tutup'}
      />
    </div>
  );
}
