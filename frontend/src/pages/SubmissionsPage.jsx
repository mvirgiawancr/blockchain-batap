import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { FileText, Clock, CheckCircle, XCircle, Download, RefreshCw, History, TrendingUp, Star, ChevronDown, ChevronRight } from 'lucide-react';
import SubmissionHistoryModal from '../components/SubmissionHistoryModal';
import ScoringResultDisplay from '../components/ScoringResultDisplay';
import ScoringDetailDropdown from '../components/ScoringDetailDropdown';

export default function SubmissionsPage({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistorySubmission, setSelectedHistorySubmission] = useState(null);
  const [expandedScoring, setExpandedScoring] = useState(new Set());

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        // Extract submissions array from response data
        const data = result.data || [];
        setSubmissions(Array.isArray(data) ? data : []);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleScoring = (submissionId) => {
    const newExpanded = new Set(expandedScoring);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedScoring(newExpanded);
  };

  const getStatusBadge = (status) => {
    const config = {
      'pending': { bg: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      'under_review': { bg: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Dalam Tinjauan' },
      'approved': { bg: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Disetujui' },
      'rejected': { bg: 'bg-red-100 text-red-800', icon: XCircle, label: 'Ditolak' }
    };
    const statusConfig = config[status] || config['pending'];
    const Icon = statusConfig.icon;
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 ${statusConfig.bg}`}>
        <Icon size={14} />
        {statusConfig.label}
      </span>
    );
  };

  const getScoreGradeColor = (score) => {
    if (score >= 3.5) return 'text-green-600';
    if (score >= 3.0) return 'text-blue-600';
    if (score >= 2.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('upps')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                Submission Saya
              </h1>
              <p className="text-gray-600 mt-1">Riwayat pengajuan akreditasi & hasil skoring</p>
            </div>
            <button
              onClick={loadSubmissions}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Submissions List */}
          {loading ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : !Array.isArray(submissions) || submissions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum Ada Submission</h3>
              <p className="text-gray-500 mb-6">Anda belum memiliki pengajuan akreditasi</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buat Submission Baru
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {submissions.map((submission) => {
                const scoring = submission.ai?.scoring || submission.ai?.scoringResults;
                const hasScoringData = !!scoring;
                const isExpanded = expandedScoring.has(submission.submissionId);

                return (
                  <div key={submission.submissionId} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                    {/* Submission Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {submission.programStudi}
                          </h3>
                          <p className="text-gray-600">{submission.institusi}</p>
                        </div>
                        {getStatusBadge(submission.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Submission ID</p>
                          <p className="font-mono text-sm font-semibold">{submission.submissionId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Jenjang</p>
                          <p className="font-semibold">{submission.jenjang || submission.programType || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Tanggal Submit</p>
                          <p className="font-semibold">
                            {new Date(submission.createdAt).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                        {hasScoringData && (
                          <div>
                            <p className="text-sm text-gray-500">Skor Keseluruhan</p>
                            <p className={`text-2xl font-bold ${getScoreGradeColor(scoring.overallScore || 0)}`}>
                              {(scoring.overallScore || 0).toFixed(2)} <span className="text-sm font-normal text-gray-500">/ 4.00</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 flex-wrap">
                        {/* Scoring Toggle Button */}
                        {hasScoringData && (
                          <button
                            onClick={() => toggleScoring(submission.submissionId)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                              isExpanded 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            <TrendingUp className="w-4 h-4" />
                            {isExpanded ? 'Tutup Skor' : 'Lihat Skor'}
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}

                        {/* History Button */}
                        <button
                          onClick={() => setSelectedHistorySubmission(submission)}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          <History className="w-4 h-4" />
                          Riwayat Blockchain
                        </button>
                        
                        {submission.ledHash && (
                          <a
                            href={`https://ipfs.io/ipfs/${submission.ledHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download LED
                          </a>
                        )}
                        {submission.lkpsHash && (
                          <a
                            href={`https://ipfs.io/ipfs/${submission.lkpsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download LKPS
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Scoring Detail Section - Expandable */}
                    {hasScoringData && isExpanded && (
                      <div className="border-t-2 border-blue-100 bg-gradient-to-b from-blue-50/50 to-white p-6 animate-fade-in">
                        {/* Overall Scoring Summary */}
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Star className="w-5 h-5 text-yellow-600" />
                            <h4 className="font-semibold text-yellow-800 text-lg">Hasil Skoring Otomatis LAM-TEK 2025</h4>
                          </div>
                          <ScoringResultDisplay scoringResult={scoring} />
                        </div>

                        {/* Detailed Breakdown */}
                        <div className="mt-4">
                          <ScoringDetailDropdown scoring={scoring} />
                        </div>

                        {/* AI Recommendations */}
                        {submission.ai?.recommendations && submission.ai.recommendations.length > 0 && (
                          <div className="mt-6 bg-blue-50 rounded-xl p-5 border border-blue-200">
                            <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                              💡 Rekomendasi AI
                            </h4>
                            <ul className="space-y-2">
                              {submission.ai.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-blue-800">
                                  <span className="text-blue-600 font-bold">•</span>
                                  <span className="text-sm">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* No Scoring Data Message */}
                    {!hasScoringData && (
                      <div className="border-t border-gray-100 px-6 py-3 bg-gray-50">
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Skor belum tersedia — menunggu proses analisis
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Submission History Modal */}
          {selectedHistorySubmission && (
            <SubmissionHistoryModal 
              submissionId={selectedHistorySubmission.submissionId}
              programStudi={selectedHistorySubmission.programStudi}
              onClose={() => setSelectedHistorySubmission(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
