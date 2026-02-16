import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { ClipboardList, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, User, FileText, Calendar } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function KEARejectionReviewPage({ user }) {
  const navigate = useNavigate();
  const [rejections, setRejections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [reviewModal, setReviewModal] = useState({ isOpen: false, rejection: null });
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadRejections();
  }, []);

  const loadRejections = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/kea/pending-rejections`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setRejections(result.data || []);
      } else {
        setRejections([]);
      }
    } catch (error) {
      console.error('Error loading rejections:', error);
      setRejections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submissionId, decision) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/kea/review-rejection/${submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ decision, notes: reviewNotes })
      });

      if (response.ok) {
        const result = await response.json();
        setResultModal({
          isOpen: true,
          type: 'success',
          title: decision === 'reason_accepted' ? 'Alasan Diterima' : 'Alasan Ditolak',
          message: result.message
        });
        setReviewModal({ isOpen: false, rejection: null });
        setReviewNotes('');
        loadRejections();
      } else {
        const err = await response.json();
        setResultModal({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memproses',
          message: err.message || 'Terjadi kesalahan saat memproses review.'
        });
      }
    } catch (error) {
      console.error('Error reviewing rejection:', error);
      setResultModal({
        isOpen: true,
        type: 'error',
        title: 'Terjadi Kesalahan',
        message: 'Tidak dapat terhubung ke server.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (rejection) => {
    setReviewModal({ isOpen: true, rejection });
    setReviewNotes('');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar menuItems={getMenuForRole(user?.role)} currentPath={window.location.pathname} userRole={user?.role} />
      
      <div className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-amber-600" />
                Review Penolakan UPPS
              </h1>
              <p className="text-gray-600 mt-1">
                Tinjau dan proses alasan penolakan asesor dari UPPS
              </p>
            </div>
            <button
              onClick={loadRejections}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100">Menunggu Review</p>
              <p className="text-4xl font-bold">{rejections.length}</p>
            </div>
            <AlertTriangle className="w-16 h-16 text-amber-200 opacity-50" />
          </div>
        </div>

        {/* Rejections List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : rejections.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Tidak Ada Penolakan</h3>
            <p className="text-gray-500">Semua penolakan UPPS sudah ditinjau.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rejections.map((rejection) => (
              <div key={rejection.submissionId} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                        Menunggu Review
                      </span>
                      <span className="text-sm text-gray-500">
                        {rejection.submissionId}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {rejection.programStudi}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">{rejection.institusi}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>Asesor 1: {rejection.assessor1Name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>Asesor 2: {rejection.assessor2Name}</span>
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-700 mb-1">Alasan Penolakan UPPS:</p>
                          <p className="text-sm text-red-600">{rejection.rejectionReason || rejection.uppsNotes || 'Tidak ada alasan diberikan'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      Ditolak pada: {formatDate(rejection.uppsResponseAt)}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => openReviewModal(rejection)}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal.isOpen && reviewModal.rejection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Review Penolakan</h3>
                <p className="text-sm text-gray-500">{reviewModal.rejection.programStudi}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Alasan Penolakan:</p>
              <p className="text-gray-600">{reviewModal.rejection.rejectionReason || reviewModal.rejection.uppsNotes}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-700">
                <strong>Terima Alasan:</strong> Asesor akan diganti dengan asesor baru.<br/>
                <strong>Tolak Alasan:</strong> Asesor akan tetap ditugaskan (force assign).
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan KEA (Opsional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Tambahkan catatan untuk keputusan ini..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleReview(reviewModal.rejection.submissionId, 'reason_accepted')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                {submitting ? 'Memproses...' : 'Terima Alasan'}
              </button>
              <button
                onClick={() => handleReview(reviewModal.rejection.submissionId, 'reason_rejected')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 font-medium"
              >
                <XCircle className="w-5 h-5" />
                {submitting ? 'Memproses...' : 'Tolak Alasan'}
              </button>
            </div>
            
            <button
              onClick={() => setReviewModal({ isOpen: false, rejection: null })}
              className="w-full mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Result Modal */}
      <ResultModal
        isOpen={resultModal.isOpen}
        onClose={() => setResultModal({ ...resultModal, isOpen: false })}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
      />
    </div>
  );
}
