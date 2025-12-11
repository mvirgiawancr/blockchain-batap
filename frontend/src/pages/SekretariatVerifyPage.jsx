import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { FileCheck, Search, CheckCircle, XCircle, Clock, Eye, Download } from 'lucide-react';

const SekretariatVerifyPage = ({ user }) => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    let filtered = submissions;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (s) =>
          s.programStudi.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.institusi.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.submissionId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredSubmissions(filtered);
  }, [searchQuery, statusFilter, submissions]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/sekretariat/submissions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(Array.isArray(data) ? data : []);
        setFilteredSubmissions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (submissionId, decision) => {
    setVerifying(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/v1/sekretariat/verify/${submissionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision,
            notes: verifyNotes,
          }),
        }
      );

      if (response.ok) {
        alert(`Submission berhasil ${decision === 'approve' ? 'disetujui' : 'ditolak'}`);
        setSelectedSubmission(null);
        setVerifyNotes('');
        loadSubmissions();
      } else {
        alert('Gagal memverifikasi submission');
      }
    } catch (error) {
      console.error('Error verifying submission:', error);
      alert('Terjadi kesalahan saat memverifikasi');
    } finally {
      setVerifying(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      under_review: 'bg-blue-100 text-blue-800 border-blue-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('sekretariat')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <FileCheck className="w-8 h-8 text-blue-600" />
              Verifikasi Dokumen
            </h1>
            <p className="text-gray-600">Verifikasi dokumen submission dari UPPS</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan program studi, institusi, atau ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Submissions List */}
          {loading ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.submissionId}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {submission.programStudi}
                      </h3>
                      <p className="text-sm text-gray-600">{submission.institusi}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        submission.status
                      )}`}
                    >
                      {submission.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600">
                      <strong>ID:</strong> {submission.submissionId}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Jenjang:</strong> {submission.jenjang}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Tanggal:</strong>{' '}
                      {new Date(submission.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedSubmission(submission)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Verifikasi
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Verification Modal */}
          {selectedSubmission && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Verifikasi Submission
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Program Studi</p>
                        <p className="font-semibold text-gray-900">
                          {selectedSubmission.programStudi}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Institusi</p>
                        <p className="font-semibold text-gray-900">
                          {selectedSubmission.institusi}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Jenjang</p>
                        <p className="font-semibold text-gray-900">
                          {selectedSubmission.jenjang}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            selectedSubmission.status
                          )}`}
                        >
                          {selectedSubmission.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Catatan Verifikasi
                      </label>
                      <textarea
                        value={verifyNotes}
                        onChange={(e) => setVerifyNotes(e.target.value)}
                        rows={4}
                        placeholder="Masukkan catatan untuk submission ini..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => handleVerify(selectedSubmission.submissionId, 'approve')}
                      disabled={verifying}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Setujui
                    </button>
                    <button
                      onClick={() => handleVerify(selectedSubmission.submissionId, 'reject')}
                      disabled={verifying}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Tolak
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSubmission(null);
                        setVerifyNotes('');
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

export default SekretariatVerifyPage;
