import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { FileText, Save, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

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
      const response = await fetch(`http://localhost:3000/api/v1/submissions/${id}`, {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/v1/asesor/assignments/${id}/submit`, {
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
        alert('Penilaian AK berhasil disubmit!');
        navigate('/asesor/assignments');
      } else {
        const err = await response.json();
        alert(`Gagal submit penilaian: ${err.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Terjadi kesalahan saat submit penilaian');
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
            <div className="p-8 border-b border-gray-100">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Penilaian Asesmen Kecukupan (AK)
              </h1>
              <p className="text-gray-600">
                {submission.programStudi} - {submission.institusi}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="space-y-6 mb-8">
                {criteria.map((criterion) => {
                  const aiScore = getAiScore(criterion);
                  
                  return (
                    <div key={criterion.id} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{criterion.id}. {criterion.name}</h3>
                          <p className="text-sm text-gray-500">Bobot: {criterion.weight}%</p>
                          
                          {/* AI Recommendation Badge */}
                          {aiScore !== null && (
                            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm border border-purple-200">
                                <span className="font-semibold">🤖 Skor AI: {aiScore.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        <div className="w-32">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Skor (0-4)</label>
                          <input
                            type="number"
                            min="0"
                            max="4"
                            step="0.01"
                            value={scores[criterion.id]}
                            onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                            className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-right"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Catatan Penilaian
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Tambahkan catatan atau rekomendasi..."
                />
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                <div className="text-lg font-bold text-gray-900">
                  Rata-rata Skor: <span className="text-indigo-600">{calculateTotal().toFixed(2)}</span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold disabled:bg-gray-400"
                >
                  {submitting ? (
                    'Menyimpan...'
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Submit Penilaian (AK)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
