import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { ClipboardCheck, CheckCircle, XCircle, Clock, FileText, RefreshCw } from 'lucide-react';

export default function AsesorAssignmentsPage({ user }) {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/assessor/assignments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssignments(Array.isArray(data) ? data : []);
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
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/v1/asesor/assignments/${submissionId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ response })
      });

      if (res.ok) {
        setResultModal({
          isOpen: true,
          type: 'success',
          title: response === 'accepted' ? 'Penugasan Diterima! 🎉' : 'Penugasan Ditolak',
          message: response === 'accepted' 
            ? 'Anda telah menerima penugasan ini. Silakan tunggu konfirmasi dari pihak lain sebelum memulai penilaian.'
            : 'Anda telah menolak penugasan ini. KEA akan menugaskan asesor lain.'
        });
        loadAssignments();
      } else {
        setResultModal({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memproses',
          message: 'Terjadi kesalahan saat memproses respons Anda. Silakan coba lagi.'
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
    }
  };

  const filteredAssignments = Array.isArray(assignments) ? assignments.filter(assignment => {
    if (filter === 'all') return true;
    if (filter === 'pending') return assignment.status === 'offered' || assignment.status === 'pending';
    if (filter === 'accepted') return assignment.status === 'accepted' || assignment.status === 'assigned';
    if (filter === 'completed') return assignment.status === 'completed' || assignment.status === 'ak_submitted';
    return true;
  }) : [];

  const getStatusBadge = (status) => {
    const styles = {
      'offered': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu Respons' },
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu Respons' },
      'accepted': { bg: 'bg-green-100', text: 'text-green-800', label: 'Diterima' },
      'assigned': { bg: 'bg-green-100', text: 'text-green-800', label: 'Diterima' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'Ditolak' },
      'completed': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Selesai' },
      'ak_submitted': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'AK Disubmit' }
    };
    const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('asesor')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ClipboardCheck className="w-8 h-8 text-indigo-600" />
                Penugasan Saya
              </h1>
              <p className="text-gray-600 mt-1">Daftar penugasan penilaian akreditasi</p>
            </div>
            <button
              onClick={loadAssignments}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex gap-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Menunggu Respons
              </button>
              <button
                onClick={() => setFilter('accepted')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'accepted' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Diterima
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'completed' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Selesai
              </button>
            </div>
          </div>

          {/* Assignments List */}
          {loading ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Memuat penugasan...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Tidak Ada Penugasan</h3>
              <p className="text-gray-500">Belum ada penugasan penilaian untuk Anda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                <div key={assignment.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {assignment.programStudi || 'Program Studi'}
                      </h3>
                      <p className="text-gray-600">{assignment.institusi || 'Institusi'}</p>
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Submission ID</p>
                      <p className="font-mono text-sm font-semibold">{assignment.submissionId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tanggal Penugasan</p>
                      <p className="font-semibold">
                        {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Partner Asesor</p>
                      <p className="font-semibold">{assignment.partnerAssessor || '-'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {(assignment.status === 'offered' || assignment.status === 'pending') && (
                      <>
                        <button
                          onClick={() => handleResponse(assignment.submissionId, 'accepted')}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Terima
                        </button>
                        <button
                          onClick={() => handleResponse(assignment.submissionId, 'rejected')}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Tolak
                        </button>
                      </>
                    )}
                    {(assignment.status === 'accepted' || assignment.status === 'assigned') && (
                      <button
                        onClick={() => navigate(`/asesor/assessment/${assignment.submissionId}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mulai Penilaian
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/asesor/detail/${assignment.submissionId}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Lihat Detail
                    </button>
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
    </div>
  );
}
