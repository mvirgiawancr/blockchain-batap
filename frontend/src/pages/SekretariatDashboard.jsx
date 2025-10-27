import { useState, useEffect } from 'react';
import { getAllSubmissions, setDecision } from '../services/api';
import wsService from '../services/websocket';
import { CheckCircle, XCircle, Clock, RefreshCw, FileText, Award, TrendingUp, AlertCircle, FileCheck, Download, Star } from 'lucide-react';
import ScoringResultDisplay from '../components/ScoringResultDisplay';

export default function SekretariatDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('under_review');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ type: '', message: '' });

  useEffect(() => {
    loadSubmissions();
    
    // Connect to WebSocket
    wsService.connect('sekretariat');

    wsService.on('SubmissionCreated', () => {
      loadSubmissions();
    });

    wsService.on('SubmissionDecided', () => {
      loadSubmissions();
    });

    return () => {
      wsService.disconnect();
    };
  }, [filter]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const data = await getAllSubmissions({ status: filter });
      setSubmissions(data);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (submissionId, decision) => {
    if (!decisionNotes.trim()) {
      setModalContent({
        type: 'error',
        message: 'Mohon masukkan catatan keputusan terlebih dahulu'
      });
      setShowModal(true);
      return;
    }

    try {
      setSubmitting(true);
      setModalContent({
        type: 'processing',
        message: 'Menyimpan keputusan ke blockchain...'
      });
      setShowModal(true);
      
      await setDecision(submissionId, {
        decision,
        notes: decisionNotes,
        decidedBy: 'Sekretariat Admin'
      });
      
      setModalContent({
        type: 'success',
        message: `Submission berhasil ${decision === 'approved' ? 'disetujui' : 'ditolak'} dan tercatat di blockchain!`
      });
      
      setSelectedSubmission(null);
      setDecisionNotes('');
      
      setTimeout(() => {
        setShowModal(false);
        loadSubmissions();
      }, 2000);
    } catch (error) {
      setModalContent({
        type: 'error',
        message: 'Error: ' + (error.response?.data?.detail || error.message)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      under_review: { 
        bg: 'bg-gradient-to-r from-yellow-400 to-orange-500', 
        icon: Clock,
        text: 'Under Review' 
      },
      approved: { 
        bg: 'bg-gradient-to-r from-green-400 to-emerald-600', 
        icon: CheckCircle,
        text: 'Approved' 
      },
      rejected: { 
        bg: 'bg-gradient-to-r from-red-400 to-rose-600', 
        icon: XCircle,
        text: 'Rejected' 
      }
    };

    const config = styles[status] || styles.under_review;
    const Icon = config.icon;

    return (
      <span className={`${config.bg} text-white px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 shadow-md`}>
        <Icon size={16} />
        {config.text}
      </span>
    );
  };

  const getStatistics = () => {
    const total = submissions.length;
    const pending = submissions.filter(s => s.status === 'under_review').length;
    const approved = submissions.filter(s => s.status === 'approved').length;
    const rejected = submissions.filter(s => s.status === 'rejected').length;
    
    return { total, pending, approved, rejected };
  };

  const stats = getStatistics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in">
            {modalContent.type === 'processing' && (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <Clock className="w-16 h-16 text-purple-600 animate-spin" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Memproses</h3>
                <p className="text-gray-600">{modalContent.message}</p>
              </div>
            )}
            
            {modalContent.type === 'success' && (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-green-700 mb-2">Berhasil!</h3>
                <p className="text-gray-600">{modalContent.message}</p>
              </div>
            )}
            
            {modalContent.type === 'error' && (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-12 h-12 text-red-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-red-700 mb-2">Error</h3>
                <p className="text-gray-600 mb-4">{modalContent.message}</p>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-3">
            <Award className="w-10 h-10 text-purple-600" />
            Dashboard Sekretariat
          </h1>
          <p className="text-lg text-gray-600">Verifikasi dan Validasi Dokumen Akreditasi</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Submissions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pending Review</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Approved</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Rejected</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

      <div className="bg-white rounded-2xl shadow-xl p-8">

        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('under_review')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                filter === 'under_review'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Clock size={18} />
              Pending Review
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                filter === 'approved'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckCircle size={18} />
              Approved
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                filter === 'rejected'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <XCircle size={18} />
              Rejected
            </button>
          </div>
          
          <button
            onClick={loadSubmissions}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Tidak ada submission dengan status "{filter}"</p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map(sub => (
              <div key={sub.submissionId} className="bg-gradient-to-r from-white to-gray-50 rounded-2xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-all">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <FileCheck className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{sub.programStudi}</h3>
                        <p className="text-gray-600">{sub.institusi}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-3">
                      <span className="font-mono bg-gray-100 px-3 py-1 rounded-lg">
                        <strong>ID:</strong> {sub.submissionId}
                      </span>
                      <span className="bg-blue-50 px-3 py-1 rounded-lg text-blue-700">
                        <strong>Version:</strong> {sub.version}
                      </span>
                      <span className="bg-purple-50 px-3 py-1 rounded-lg text-purple-700">
                        <strong>Created:</strong> {new Date(sub.createdAt).toLocaleDateString('id-ID', { 
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(sub.status)}
                  </div>
                </div>

                {/* AI Analysis */}
                {sub.ai && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200 mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                      <h4 className="text-lg font-bold text-blue-900">AI Analysis - Validitas & Kelengkapan</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">LED Status</p>
                        <div className="flex items-center gap-2">
                          {sub.ai.hasLED ? (
                            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">✓ Valid</span>
                          ) : (
                            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold">✗ Tidak Ada</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">LKPS Status</p>
                        <div className="flex items-center gap-2">
                          {sub.ai.hasLKPS ? (
                            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">✓ Valid</span>
                          ) : (
                            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold">✗ Tidak Ada</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Scoring Results */}
                    {(sub.ai.scoring || sub.ai.scoringResults) && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="w-5 h-5 text-yellow-600" />
                          <h5 className="font-semibold text-yellow-800">Hasil Skoring Otomatis</h5>
                        </div>
                        <ScoringResultDisplay scoringResult={sub.ai.scoring || sub.ai.scoringResults} />
                      </div>
                    )}
                    
                    {sub.ai.flags && sub.ai.flags.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-blue-700 mb-2">📋 Temuan Analisis:</p>
                        <ul className="space-y-1">
                          {sub.ai.flags.map((flag, idx) => (
                            <li key={idx} className="text-sm text-blue-800 bg-blue-50 px-3 py-2 rounded-lg">• {flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sub.ai.recommendations && sub.ai.recommendations.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-green-700 mb-2">💡 Recommendations:</p>
                        <ul className="space-y-1">
                          {sub.ai.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Documents */}
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Documents
                  </h4>
                  <div className="space-y-3">
                    {sub.documents.map((doc, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileCheck className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">{doc.type}</p>
                            <p className="text-sm text-gray-600 truncate">{doc.filename || 'N/A'}</p>
                            <p className="text-xs text-gray-500 mt-1 font-mono truncate">CID: {doc.cid}</p>
                          </div>
                          <a
                            href={`https://ivory-fancy-junglefowl-107.mypinata.cloud/ipfs/${doc.cid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.filename}
                            className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-semibold text-sm"
                          >
                            <Download size={16} />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decision Section */}
                {sub.status === 'under_review' && (
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border-2 border-gray-300">
                    {selectedSubmission === sub.submissionId ? (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Catatan Keputusan <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={decisionNotes}
                          onChange={(e) => setDecisionNotes(e.target.value)}
                          placeholder="Masukkan alasan dan catatan keputusan..."
                          className="w-full min-h-[120px] px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mb-4"
                          required
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleDecision(sub.submissionId, 'approved')}
                            disabled={submitting}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={20} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleDecision(sub.submissionId, 'rejected')}
                            disabled={submitting}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                            <XCircle size={20} />
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSubmission(null);
                              setDecisionNotes('');
                            }}
                            className="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl hover:bg-gray-700 transition-all shadow-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedSubmission(sub.submissionId)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                      >
                        Make Decision
                      </button>
                    )}
                  </div>
                )}

                {/* Final Decision Display */}
                {sub.decision && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border-2 border-indigo-200">
                    <h4 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
                      <Award className="w-6 h-6" />
                      Final Decision
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">Result:</span>
                        <span className={`px-4 py-1 rounded-full text-sm font-semibold ${
                          sub.decision.result === 'approved' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {sub.decision.result.toUpperCase()}
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-sm text-gray-600 font-medium mb-1">Notes:</p>
                        <p className="text-gray-800">{sub.decision.notes}</p>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span><strong>Decided by:</strong> {sub.decision.decidedBy}</span>
                        <span><strong>Date:</strong> {new Date(sub.decision.decidedAt).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
