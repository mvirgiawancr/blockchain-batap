import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { ClipboardCheck, CheckCircle, XCircle, Clock, FileText, RefreshCw, Users, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function UPPSAssignmentsPage({ user }) {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [submitting, setSubmitting] = useState(false);
  // Result Modal state
  const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  // Rejection Modal state
  const [rejectModal, setRejectModal] = useState({ isOpen: false, submissionId: null, programStudi: '' });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Fetch all submissions for this UPPS
      const response = await fetch(`${API_BASE_URL}/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const data = result.data || [];
        
        // Filter for submissions with offers
        const offers = data.filter(s => s.currentOffer || s.assignedAssessors).map(s => {
          let status = 'pending';
          let assessor1Status = s.currentOffer?.assessor1Response || 'pending';
          let assessor2Status = s.currentOffer?.assessor2Response || 'pending';
          
          if (s.assignedAssessors) {
            status = 'approved';
          } else if (s.currentOffer) {
            // Check if UPPS already responded
            if (s.currentOffer.uppsResponse === 'accepted') {
              status = 'accepted';
            } else if (s.currentOffer.uppsResponse === 'rejected') {
              status = 'rejected';
            // Check if both assessors have accepted - only then UPPS can respond
            } else if (assessor1Status === 'accepted' && assessor2Status === 'accepted') {
              status = 'pending_approval'; // Ready for UPPS approval
            } else {
              status = 'waiting_assessors'; // Waiting for assessors to accept
            }
          }

          return {
            id: s.submissionId,
            submissionId: s.submissionId,
            programStudi: s.programStudi,
            institusi: s.institusi,
            assessor1: s.currentOffer?.assessor1Name || s.assignedAssessors?.assessor1Name,
            assessor2: s.currentOffer?.assessor2Name || s.assignedAssessors?.assessor2Name,
            assessor1Status,
            assessor2Status,
            offeredAt: s.currentOffer?.offeredAt,
            status: status
          };
        });

        setAssignments(offers);
      } else {
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (submissionId, response, notes = '') => {
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/submissions/${submissionId}/upps-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ response, notes })
      });

      if (res.ok) {
        setResultModal({
          isOpen: true,
          type: 'success',
          title: response === 'accepted' ? 'Penugasan Disetujui! 🎉' : 'Penugasan Ditolak',
          message: response === 'accepted' 
            ? 'Anda telah menyetujui penugasan asesor untuk submission ini. Asesor dapat segera memulai penilaian.'
            : 'Alasan penolakan Anda telah dikirim ke KEA untuk ditinjau.'
        });
        // Close reject modal if open
        setRejectModal({ isOpen: false, submissionId: null, programStudi: '' });
        setRejectReason('');
        loadAssignments();
      } else {
        const err = await res.json();
        setResultModal({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memproses',
          message: err.message || 'Terjadi kesalahan saat memproses respons. Silakan coba lagi.'
        });
      }
    } catch (error) {
      console.error('Error responding to assignment:', error);
      setResultModal({
        isOpen: true,
        type: 'error',
        title: 'Terjadi Kesalahan',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open rejection modal
  const openRejectModal = (submissionId, programStudi) => {
    setRejectModal({ isOpen: true, submissionId, programStudi });
    setRejectReason('');
  };

  // Handle rejection with reason
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setResultModal({
        isOpen: true,
        type: 'error',
        title: 'Alasan Diperlukan',
        message: 'Silakan berikan alasan mengapa Anda menolak penugasan asesor ini.'
      });
      return;
    }
    await handleResponse(rejectModal.submissionId, 'rejected', rejectReason.trim());
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    if (filter === 'pending') return assignment.status === 'pending_approval' || assignment.status === 'waiting_assessors';
    if (filter === 'approved') return assignment.status === 'approved' || assignment.status === 'accepted';
    if (filter === 'rejected') return assignment.status === 'rejected';
    return true;
  });

  const getStatusBadge = (status) => {
    const styles = {
      'waiting_assessors': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Menunggu Asesor' },
      'pending_approval': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu Persetujuan' },
      'approved': { bg: 'bg-green-100', text: 'text-green-800', label: 'Disetujui' },
      'accepted': { bg: 'bg-green-100', text: 'text-green-800', label: 'Disetujui' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'Ditolak' }
    };
    const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
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
                <Users className="w-8 h-8 text-blue-600" />
                Persetujuan Asesor
              </h1>
              <p className="text-gray-600 mt-1">Setujui atau tolak usulan asesor dari KEA</p>
            </div>
            <button
              onClick={loadAssignments}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex gap-3">
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Menunggu Persetujuan
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'approved' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Disetujui
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Semua
              </button>
            </div>
          </div>

          {/* Assignments List */}
          {loading ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Tidak Ada Usulan</h3>
              <p className="text-gray-500">Belum ada usulan asesor yang perlu disetujui</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                <div key={assignment.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {assignment.programStudi}
                      </h3>
                      <p className="text-gray-600">{assignment.institusi}</p>
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className={`p-4 rounded-xl border ${
                      assignment.assessor1Status === 'accepted' ? 'bg-green-50 border-green-200' : 
                      assignment.assessor1Status === 'rejected' ? 'bg-red-50 border-red-200' : 
                      'bg-gray-50 border-gray-100'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-gray-500">Asesor 1</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          assignment.assessor1Status === 'accepted' ? 'bg-green-100 text-green-700' : 
                          assignment.assessor1Status === 'rejected' ? 'bg-red-100 text-red-700' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {assignment.assessor1Status === 'accepted' ? '✓ ACC' : 
                           assignment.assessor1Status === 'rejected' ? '✗ Tolak' : '⏳ Pending'}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">{assignment.assessor1}</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${
                      assignment.assessor2Status === 'accepted' ? 'bg-green-50 border-green-200' : 
                      assignment.assessor2Status === 'rejected' ? 'bg-red-50 border-red-200' : 
                      'bg-gray-50 border-gray-100'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-gray-500">Asesor 2</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          assignment.assessor2Status === 'accepted' ? 'bg-green-100 text-green-700' : 
                          assignment.assessor2Status === 'rejected' ? 'bg-red-100 text-red-700' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {assignment.assessor2Status === 'accepted' ? '✓ ACC' : 
                           assignment.assessor2Status === 'rejected' ? '✗ Tolak' : '⏳ Pending'}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">{assignment.assessor2}</p>
                    </div>
                  </div>

                  {assignment.status === 'waiting_assessors' && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-700">
                        ⏳ Menunggu kedua asesor menerima penugasan. Anda dapat menyetujui/menolak setelah kedua asesor ACC.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Diupdate: {assignment.offeredAt ? new Date(assignment.offeredAt).toLocaleDateString('id-ID') : '-'}
                    </div>
                    
                    {assignment.status === 'pending_approval' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleResponse(assignment.submissionId, 'accepted')}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Setujui
                        </button>
                        <button
                          onClick={() => openRejectModal(assignment.submissionId, assignment.programStudi)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      <ResultModal
        isOpen={resultModal.isOpen}
        onClose={() => setResultModal({ ...resultModal, isOpen: false })}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
      />

      {/* Rejection Reason Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tolak Penugasan Asesor</h3>
                <p className="text-sm text-gray-500">{rejectModal.programStudi}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Jelaskan alasan mengapa Anda menolak penugasan asesor ini..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Alasan ini akan dikirim ke KEA untuk ditinjau. KEA dapat menerima atau menolak alasan Anda.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={submitting || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 font-medium"
              >
                {submitting ? 'Mengirim...' : 'Kirim Penolakan'}
              </button>
              <button
                onClick={() => setRejectModal({ isOpen: false, submissionId: null, programStudi: '' })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
