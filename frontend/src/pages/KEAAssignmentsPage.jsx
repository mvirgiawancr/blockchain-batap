import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Users, Search, UserPlus, Send, Calendar, Award, Star, Sparkles } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const KEAAssignmentsPage = ({ user }) => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssessors, setLoadingAssessors] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedAssessors, setSelectedAssessors] = useState([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Only load submissions initially, assessors will be loaded per submission
      const submissionsRes = await fetch(`${API_BASE_URL}/kea/submissions-approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (submissionsRes.ok) {
        const data = await submissionsRes.json();
        setSubmissions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load assessors with AI recommendation for specific submission
  const loadAssessorsForSubmission = async (submission) => {
    setSelectedSubmission(submission);
    setLoadingAssessors(true);
    setSelectedAssessors([]);
    
    try {
      const token = localStorage.getItem('token');
      const programStudi = encodeURIComponent(submission.programStudi);
      
      const response = await fetch(
        `${API_BASE_URL}/kea/assessors?programStudi=${programStudi}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Handle both {assessors: [...]} and direct array format
        const list = data.assessors || data.data || data;
        setAssessors(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error('Error loading assessors:', error);
    } finally {
      setLoadingAssessors(false);
    }
  };

  const handleAssignAssessors = async () => {
    if (selectedAssessors.length !== 2) {
      alert('Pilih tepat 2 asesor');
      return;
    }

    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const assessor1 = assessors.find(a => a.id === selectedAssessors[0]);
      const assessor2 = assessors.find(a => a.id === selectedAssessors[1]);

      const response = await fetch(
        `${API_BASE_URL}/kea/assign/${selectedSubmission.submissionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assessor1Id: assessor1.id,
            assessor1Name: assessor1.name,
            assessor2Id: assessor2.id,
            assessor2Name: assessor2.name
          }),
        }
      );

      if (response.ok) {
        alert('Asesor berhasil ditugaskan');
        setSelectedSubmission(null);
        setSelectedAssessors([]);
        loadData();
      } else {
        const err = await response.json();
        alert(`Gagal menugaskan asesor: ${err.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error assigning assessors:', error);
      alert('Terjadi kesalahan');
    } finally {
      setAssigning(false);
    }
  };

  const toggleAssessor = (assessorId) => {
    if (selectedAssessors.includes(assessorId)) {
      setSelectedAssessors(selectedAssessors.filter((id) => id !== assessorId));
    } else {
      setSelectedAssessors([...selectedAssessors, assessorId]);
    }
  };

  // Get badge color based on similarity score
  const getScoreBadge = (score) => {
    if (score >= 90) return { bg: 'bg-green-100', text: 'text-green-800', label: 'Sangat Cocok' };
    if (score >= 70) return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Cocok' };
    if (score >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Cukup' };
    return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Kurang Cocok' };
  };

  const filteredSubmissions = submissions.filter(
    (s) =>
      s.programStudi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.institusi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('kea')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              Penugasan Asesor
            </h1>
            <p className="text-gray-600">Tugaskan asesor untuk submission yang telah disetujui</p>
          </div>

          {/* Search */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari submission..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Submissions Grid */}
          {loading ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.submissionId}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {submission.programStudi}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">{submission.institusi}</p>
                  
                  {submission.assignedAssessors ? (
                    <div className="p-3 bg-green-50 rounded-lg mb-4">
                      <p className="text-xs text-green-800 font-semibold">
                        ✓ Asesor sudah ditugaskan
                      </p>
                    </div>
                  ) : submission.currentOffer && submission.currentOffer.status === 'force_assigned' ? (
                    <div className="p-3 bg-purple-50 rounded-lg mb-4">
                      <p className="text-xs text-purple-800 font-semibold">
                        ⤴ Force Assigned
                      </p>
                      <p className="text-[10px] text-purple-600 mt-1">
                        {submission.currentOffer.assessor1Name} & {submission.currentOffer.assessor2Name}
                      </p>
                    </div>
                  ) : submission.currentOffer && submission.currentOffer.status === 'pending_kea_review' ? (
                    <div className="p-3 bg-amber-50 rounded-lg mb-4">
                      <p className="text-xs text-amber-800 font-semibold">
                        ⚠️ UPPS Menolak - Perlu Review
                      </p>
                      <p className="text-[10px] text-amber-600 mt-1">
                        Lihat menu "Review Penolakan"
                      </p>
                    </div>
                  ) : submission.currentOffer && submission.currentOffer.status !== 'rejected' ? (
                    <div className="p-3 bg-yellow-50 rounded-lg mb-4">
                      <p className="text-xs text-yellow-800 font-semibold">
                        ⏳ Menunggu respon asesor/UPPS
                      </p>
                      <p className="text-[10px] text-yellow-600 mt-1">
                        {submission.currentOffer.assessor1Name} & {submission.currentOffer.assessor2Name}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => loadAssessorsForSubmission(submission)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Tugaskan Asesor
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Assignment Modal */}
          {selectedSubmission && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Tugaskan Asesor untuk {selectedSubmission.programStudi}
                  </h2>
                  <p className="text-gray-500 text-sm mb-6">{selectedSubmission.institusi}</p>

                  {/* AI Recommendation Header */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-purple-800">Rekomendasi AI</span>
                    </div>
                    <p className="text-sm text-purple-700">
                      Asesor diurutkan berdasarkan kesesuaian keahlian dengan program studi "{selectedSubmission.programStudi}"
                    </p>
                    <p className="text-sm text-blue-800 mt-2">
                      Pilih 2 asesor untuk ditugaskan. Dipilih: <strong>{selectedAssessors.length}</strong>
                    </p>
                  </div>

                  {/* Loading or Assessor Grid */}
                  {loadingAssessors ? (
                    <div className="text-center py-16 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border-2 border-dashed border-purple-200">
                      <div className="relative inline-block mb-6">
                        <Sparkles className="w-16 h-16 text-purple-500 animate-pulse" />
                        <div className="absolute inset-0 w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
                      </div>
                      <h3 className="text-xl font-bold text-purple-800 mb-2">AI Sedang Menganalisis...</h3>
                      <p className="text-purple-600 mb-4">Mencocokkan keahlian asesor dengan program studi</p>
                      <div className="flex items-center justify-center gap-2 text-sm text-purple-500">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      {assessors.map((assessor) => {
                        const badge = getScoreBadge(assessor.similarityScore || 50);
                        return (
                          <div
                            key={assessor.id}
                            onClick={() => toggleAssessor(assessor.id)}
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                              selectedAssessors.includes(assessor.id)
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Rank Badge */}
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                  <Award className="w-6 h-6 text-white" />
                                </div>
                                {assessor.rank && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-yellow-900">
                                    {assessor.rank}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-gray-900">{assessor.name}</h3>
                                <p className="text-sm text-gray-600">{assessor.expertise}</p>
                                
                                {/* AI Score Badge */}
                                {assessor.similarityScore !== undefined && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                      <Star className="w-3 h-3 inline mr-1" />
                                      {assessor.similarityScore}% - {badge.label}
                                    </span>
                                  </div>
                                )}
                                
                                {/* AI Recommendation Text */}
                                {assessor.aiRecommendation && (
                                  <p className="text-xs text-gray-500 mt-1 italic">
                                    "{assessor.aiRecommendation}"
                                  </p>
                                )}
                              </div>
                              {selectedAssessors.includes(assessor.id) && (
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                                  <span className="text-white text-sm">✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={handleAssignAssessors}
                      disabled={assigning || selectedAssessors.length < 2}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400"
                    >
                      <Send className="w-5 h-5" />
                      {assigning ? 'Menugaskan...' : 'Tugaskan Asesor'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSubmission(null);
                        setSelectedAssessors([]);
                      }}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KEAAssignmentsPage;
