import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSubmissions } from '../services/api';
import wsService from '../services/websocket';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  ClipboardCheck, CheckCircle, XCircle, Clock, 
  Download, FileText, AlertCircle, Award, Send, RefreshCw
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function AsesorDashboard({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showAKModal, setShowAKModal] = useState(false);
  const [responseType, setResponseType] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [downloading, setDownloading] = useState(false);

  // AK Assessment State
  const [akScores, setAkScores] = useState({
    kriteria1: '',
    kriteria2: '',
    kriteria3: '',
    kriteria4: '',
    kriteria5: '',
    kriteria6: '',
    kriteria7: ''
  });
  const [akNotes, setAkNotes] = useState('');

  const [stats, setStats] = useState({
    pendingOffers: 0,
    acceptedOffers: 0,
    akPending: 0,
    akSubmitted: 0
  });

  useEffect(() => {
    loadSubmissions();
    
    const wsId = (user && (user.username || user.id)) || 'asesor';
    wsService.connect(wsId);
    wsService.on('AssessorOfferCreated', loadSubmissions);
    wsService.on('AssessorResponded', loadSubmissions);
    wsService.on('UPPSResponded', loadSubmissions);
    wsService.on('AKAssessmentSubmitted', loadSubmissions);
    
    return () => wsService.disconnect();
  }, [user]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const res = await getAllSubmissions();
      const list = Array.isArray(res.data) ? res.data : [];
      
      // Filter submissions where user is offered or assigned as assessor
      const mySubmissions = list.filter(s => 
        (s.currentOffer?.assessor1Id === user?.id || s.currentOffer?.assessor2Id === user?.id) ||
        (s.assignedAssessors?.assessor1Id === user?.id || s.assignedAssessors?.assessor2Id === user?.id)
      );
      
      // Calculate stats
      const pending = mySubmissions.filter(s => {
        if (s.currentOffer?.assessor1Id === user?.id && s.currentOffer?.assessor1Response === 'pending') return true;
        if (s.currentOffer?.assessor2Id === user?.id && s.currentOffer?.assessor2Response === 'pending') return true;
        return false;
      }).length;

      const accepted = mySubmissions.filter(s => s.assignedAssessors).length;
      
      const akPending = mySubmissions.filter(s => {
        if (!s.assignedAssessors) return false;
        const hasMyAssessment = s.akAssessments?.some(ak => ak.assessorId === user?.id);
        return !hasMyAssessment;
      }).length;

      const akSubmitted = mySubmissions.filter(s => {
        return s.akAssessments?.some(ak => ak.assessorId === user?.id);
      }).length;
      
      setStats({ pendingOffers: pending, acceptedOffers: accepted, akPending, akSubmitted });
      setSubmissions(mySubmissions);
    } catch (err) {
      console.error('Error loading submissions:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    if (!selectedSubmission) return;
    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/download/${selectedSubmission.submissionId}/${doc.type}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Download failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename || `${doc.type}.file`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDownloading(false);
    }
  };

  const openResponseModal = (submission, type) => {
    setSelectedSubmission(submission);
    setResponseType(type);
    setShowResponseModal(true);
    setResponseNotes('');
    setMessage({ type: '', text: '' });
  };

  const handleRespondToOffer = async () => {
    if (!selectedSubmission || !responseType) return;

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/assessor/respond-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submissionId: selectedSubmission.submissionId,
          assessorId: user?.id,
          response: responseType,
          notes: responseNotes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal merespons penawaran');
      }

      setMessage({ 
        type: 'success', 
        text: responseType === 'accepted' ? 'Penawaran diterima!' : 'Penawaran ditolak' 
      });
      setShowResponseModal(false);
      await loadSubmissions();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openAKModal = (submission) => {
    setSelectedSubmission(submission);
    setShowAKModal(true);
    setAkScores({
      kriteria1: '',
      kriteria2: '',
      kriteria3: '',
      kriteria4: '',
      kriteria5: '',
      kriteria6: '',
      kriteria7: ''
    });
    setAkNotes('');
    setMessage({ type: '', text: '' });
  };

  const handleSubmitAK = async () => {
    if (!selectedSubmission) return;

    // Validate all scores are filled
    const allFilled = Object.values(akScores).every(score => score !== '');
    if (!allFilled) {
      setMessage({ type: 'error', text: 'Harap isi semua kriteria penilaian' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/assessor/submit-ak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submissionId: selectedSubmission.submissionId,
          assessorId: user?.id,
          assessorName: user?.fullName || user?.username || 'Asesor',
          scores: akScores,
          notes: akNotes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal menyimpan penilaian AK');
      }

      setMessage({ type: 'success', text: 'Penilaian AK berhasil disimpan!' });
      setShowAKModal(false);
      await loadSubmissions();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const getMyResponse = (submission) => {
    if (!submission.currentOffer) return null;
    
    if (submission.currentOffer.assessor1Id === user?.id) {
      return {
        status: submission.currentOffer.assessor1Response,
        notes: submission.currentOffer.assessor1Notes
      };
    }
    if (submission.currentOffer.assessor2Id === user?.id) {
      return {
        status: submission.currentOffer.assessor2Response,
        notes: submission.currentOffer.assessor2Notes
      };
    }
    return null;
  };

  const hasSubmittedAK = (submission) => {
    return submission.akAssessments?.some(ak => ak.assessorId === user?.id);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('asesor')}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard Asesor
              </h1>
              <p className="text-gray-600 mt-1">Penilaian Kecukupan (AK) Akreditasi</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadSubmissions}
                className="p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <Award className="w-10 h-10 text-indigo-600" />
            </div>
          </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 p-4">
            <p className="text-sm text-gray-600 mb-1">Penawaran Pending</p>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingOffers}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-green-500 p-4">
            <p className="text-sm text-gray-600 mb-1">Penugasan Diterima</p>
            <p className="text-3xl font-bold text-gray-900">{stats.acceptedOffers}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-orange-500 p-4">
            <p className="text-sm text-gray-600 mb-1">AK Pending</p>
            <p className="text-3xl font-bold text-gray-900">{stats.akPending}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 p-4">
            <p className="text-sm text-gray-600 mb-1">AK Terkirim</p>
            <p className="text-3xl font-bold text-gray-900">{stats.akSubmitted}</p>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`rounded-xl p-4 ${
            message.type === 'success' ? 'bg-green-50 border-2 border-green-200 text-green-800' :
            'bg-red-50 border-2 border-red-200 text-red-800'
          }`}>
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Submissions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">Belum ada penugasan</p>
            </div>
          ) : (
            submissions.map((sub) => {
              const myResponse = getMyResponse(sub);
              const isAssigned = sub.assignedAssessors && 
                (sub.assignedAssessors.assessor1Id === user?.id || sub.assignedAssessors.assessor2Id === user?.id);
              const akSubmitted = hasSubmittedAK(sub);

              return (
                <div key={sub.submissionId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="grid md:grid-cols-4 gap-4">
                    
                    {/* Info Column */}
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{sub.programStudi}</h3>
                      <p className="text-sm text-gray-600 mb-2">{sub.institusi}</p>
                      <p className="text-xs text-gray-500 font-mono">{sub.submissionId}</p>
                      
                      {sub.assignedAssessors && (
                        <div className="mt-3 space-y-1 text-sm">
                          <p className="font-semibold text-gray-700">Pasangan Asesor:</p>
                          <p className="text-gray-600">• {sub.assignedAssessors.assessor1Name}</p>
                          <p className="text-gray-600">• {sub.assignedAssessors.assessor2Name}</p>
                        </div>
                      )}
                    </div>

                    {/* Status Column */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Status Penawaran</p>
                      {myResponse && (
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          myResponse.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          myResponse.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {myResponse.status === 'accepted' ? '✓ Diterima' :
                           myResponse.status === 'rejected' ? '✗ Ditolak' :
                           '⏳ Pending'}
                        </span>
                      )}

                      {akSubmitted && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Status AK</p>
                          <span className="inline-flex px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                            ✓ Sudah Dinilai
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions Column */}
                    <div className="flex flex-col gap-2">
                      {myResponse?.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openResponseModal(sub, 'accepted')}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Terima
                          </button>
                          <button
                            onClick={() => openResponseModal(sub, 'rejected')}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Tolak
                          </button>
                        </>
                      )}

                      {isAssigned && !akSubmitted && (
                        <button
                          onClick={() => openAKModal(sub)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                          Isi Penilaian AK
                        </button>
                      )}

                      {isAssigned && sub.documents && sub.documents.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Dokumen:</p>
                          {sub.documents.map((doc) => (
                            <button
                              key={doc.type}
                              onClick={() => { setSelectedSubmission(sub); handleDownload(doc); }}
                              disabled={downloading}
                              className="w-full inline-flex items-center justify-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium transition-colors mb-1"
                            >
                              <Download className="w-3 h-3" />
                              {doc.type}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Response Modal */}
        {showResponseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {responseType === 'accepted' ? 'Terima Penugasan' : 'Tolak Penugasan'}
              </h2>
              
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900">{selectedSubmission?.programStudi}</p>
                <p className="text-sm text-blue-700">{selectedSubmission?.institusi}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Catatan {responseType === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder={responseType === 'accepted' ? 'Catatan opsional...' : 'Alasan penolakan...'}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={4}
                  required={responseType === 'rejected'}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRespondToOffer}
                  disabled={submitting || (responseType === 'rejected' && !responseNotes)}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-colors ${
                    responseType === 'accepted'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                >
                  {submitting ? 'Memproses...' : 'Konfirmasi'}
                </button>
                <button
                  onClick={() => setShowResponseModal(false)}
                  disabled={submitting}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AK Assessment Modal */}
        {showAKModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 my-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Penilaian Asesmen Kecukupan (AK)
              </h2>
              
              <div className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <p className="text-sm font-semibold text-indigo-900">{selectedSubmission?.programStudi}</p>
                <p className="text-sm text-indigo-700">{selectedSubmission?.institusi}</p>
              </div>

              <div className="space-y-4 mb-6">
                <p className="text-sm text-gray-600">
                  Berikan penilaian untuk setiap kriteria (skala 0-4)
                </p>
                
                {Object.keys(akScores).map((key, index) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Kriteria {index + 1} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      step="0.01"
                      value={akScores[key]}
                      onChange={(e) => setAkScores({ ...akScores, [key]: e.target.value })}
                      placeholder="0.00 - 4.00"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Catatan Penilaian
                  </label>
                  <textarea
                    value={akNotes}
                    onChange={(e) => setAkNotes(e.target.value)}
                    placeholder="Catatan dan rekomendasi penilaian..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitAK}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? 'Menyimpan...' : 'Kirim Penilaian'}
                </button>
                <button
                  onClick={() => setShowAKModal(false)}
                  disabled={submitting}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
