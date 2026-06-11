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
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/sekretariat/submissions`, {
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
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/sekretariat/verify/${submissionId}`,
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
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-3xl border border-slate-200/85 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col p-7 animate-scale-up">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
                    <FileCheck className="w-6 h-6 text-indigo-650" />
                    Verifikasi Dokumen Submission
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedSubmission(null);
                      setVerifyNotes('');
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 border-0 bg-transparent cursor-pointer"
                  >
                    <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-650" />
                  </button>
                </div>

                <div className="space-y-5 flex-1">
                  <div className="grid md:grid-cols-2 gap-4 bg-slate-50/70 border border-slate-200/50 p-4.5 rounded-2xl shadow-inner-sm">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Program Studi</p>
                      <p className="text-sm font-black text-slate-800 leading-snug">
                        {selectedSubmission.programStudi}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Institusi</p>
                      <p className="text-sm font-bold text-slate-700">
                        {selectedSubmission.institusi}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Jenjang</p>
                      <span className="px-2.5 py-0.5 text-[10px] font-black bg-indigo-50 border border-indigo-200 text-indigo-850 rounded-lg w-fit inline-block">
                        {selectedSubmission.jenjang || 'S1'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Status Berkas</p>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusColor(
                          selectedSubmission.status
                        )}`}
                      >
                        {selectedSubmission.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Catatan Verifikasi Sekretariat
                    </label>
                    <textarea
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      rows={4}
                      placeholder="Masukkan catatan tinjauan kelayakan administratif untuk submission ini..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-xs font-semibold outline-none shadow-sm leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex gap-3 border-t border-slate-100/60 pt-5 mt-6">
                  <button
                    onClick={() => handleVerify(selectedSubmission.submissionId, 'approve')}
                    disabled={verifying}
                    className="flex-1 px-5 py-3 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Setujui Berkas
                  </button>
                  <button
                    onClick={() => handleVerify(selectedSubmission.submissionId, 'reject')}
                    disabled={verifying}
                    className="flex-1 px-5 py-3 bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                  >
                    <XCircle className="w-4 h-4" />
                    Tolak Berkas
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSubmission(null);
                      setVerifyNotes('');
                    }}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all text-center"
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
};

export default SekretariatVerifyPage;
