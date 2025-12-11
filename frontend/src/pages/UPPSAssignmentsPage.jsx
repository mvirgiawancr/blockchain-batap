import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { ClipboardCheck, CheckCircle, XCircle, Clock, FileText, RefreshCw, Users, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function UPPSAssignmentsPage({ user }) {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ type: '', message: '' });

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
          if (s.assignedAssessors) {
            status = 'approved';
          } else if (s.currentOffer) {
            if (s.currentOffer.uppsResponse === 'pending') {
              status = 'pending_approval';
            } else {
              status = s.currentOffer.uppsResponse;
            }
          }

          return {
            id: s.submissionId,
            submissionId: s.submissionId,
            programStudi: s.programStudi,
            institusi: s.institusi,
            assessor1: s.currentOffer?.assessor1Name || s.assignedAssessors?.assessor1Name,
            assessor2: s.currentOffer?.assessor2Name || s.assignedAssessors?.assessor2Name,
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

  const handleResponse = async (submissionId, response) => {
    // Show processing modal
    setModalContent({
      type: 'processing',
      message: 'Sedang memproses persetujuan...'
    });
    setShowModal(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/submissions/${submissionId}/upps-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ response })
      });

      if (res.ok) {
        setModalContent({
          type: 'success',
          message: `Penugasan berhasil ${response === 'accepted' ? 'disetujui' : 'ditolak'}`
        });
        loadAssignments();
      } else {
        const err = await res.json();
        setModalContent({
          type: 'error',
          message: `Gagal memproses respons: ${err.message || 'Unknown error'}`
        });
      }
    } catch (error) {
      console.error('Error responding to assignment:', error);
      setModalContent({
        type: 'error',
        message: 'Terjadi kesalahan saat menghubungi server'
      });
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    if (filter === 'pending') return assignment.status === 'pending_approval';
    if (filter === 'approved') return assignment.status === 'approved' || assignment.status === 'accepted';
    if (filter === 'rejected') return assignment.status === 'rejected';
    return true;
  });

  const getStatusBadge = (status) => {
    const styles = {
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
        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in">
              {modalContent.type === 'processing' && (
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <Clock className="w-16 h-16 text-blue-600 animate-spin" />
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
                  <p className="text-gray-600 mb-4">{modalContent.message}</p>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
                  >
                    Tutup
                  </button>
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
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">Asesor 1</p>
                      <p className="font-semibold text-gray-900">{assignment.assessor1}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">Asesor 2</p>
                      <p className="font-semibold text-gray-900">{assignment.assessor2}</p>
                    </div>
                  </div>

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
                          onClick={() => handleResponse(assignment.submissionId, 'rejected')}
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
    </div>
  );
}
