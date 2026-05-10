import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { ClipboardCheck, FileText, Clock, CheckCircle, XCircle, TrendingUp, RefreshCw, MapPin, Award, Download, Shield, ExternalLink } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function StatusPage({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accreditationDetail, setAccreditationDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  // Load accreditation detail when submission is selected
  useEffect(() => {
    if (selectedSubmission?.submissionId) {
      loadAccreditationDetail(selectedSubmission.submissionId);
    } else {
      setAccreditationDetail(null);
    }
  }, [selectedSubmission]);

  const loadSubmissions = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || [];
        setSubmissions(Array.isArray(data) ? data : []);
      } else {
        setError('Gagal memuat data submission');
        setSubmissions([]);
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAccreditationDetail = async (submissionId) => {
    setDetailLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/traceability/detail/${submissionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        setAccreditationDetail(result.data);
      } else {
        setAccreditationDetail(null);
      }
    } catch (err) {
      setAccreditationDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusColor = (statusStr) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'under_review': 'bg-blue-100 text-blue-800 border-blue-300',
      'approved': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
      'SUBMITTED': 'bg-blue-100 text-blue-800 border-blue-300',
      'DESK_EVALUATION': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'AK_SCORED': 'bg-purple-100 text-purple-800 border-purple-300',
      'AL_PROPOSED': 'bg-amber-100 text-amber-800 border-amber-300',
      'AL_APPROVED': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'AL_IN_PROGRESS': 'bg-orange-100 text-orange-800 border-orange-300',
      'AL_SUBMITTED': 'bg-teal-100 text-teal-800 border-teal-300',
      'UPPS_RESPONDED': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'VERIFIED': 'bg-lime-100 text-lime-800 border-lime-300',
      'ACCREDITED': 'bg-green-100 text-green-800 border-green-300',
      'RELEASED': 'bg-emerald-100 text-emerald-900 border-emerald-400'
    };
    return colors[statusStr] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status) => {
    if (status === 'approved' || status === 'ACCREDITED' || status === 'RELEASED') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'rejected') return <XCircle className="w-5 h-5 text-red-600" />;
    if (status === 'under_review' || status === 'DESK_EVALUATION') return <Clock className="w-5 h-5 text-blue-600" />;
    return <Clock className="w-5 h-5 text-yellow-600" />;
  };

  const getRankBadgeColor = (rank) => {
    const colors = {
      'Unggul': 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
      'Baik Sekali': 'bg-gradient-to-r from-green-400 to-emerald-500 text-white',
      'Baik': 'bg-gradient-to-r from-blue-400 to-blue-500 text-white',
      'Tidak Terakreditasi': 'bg-gradient-to-r from-red-400 to-red-500 text-white'
    };
    return colors[rank] || 'bg-gray-200 text-gray-800';
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                <ClipboardCheck className="w-8 h-8 text-blue-600" />
                Status Akreditasi
              </h1>
              <p className="text-gray-600">Status pengajuan akreditasi Anda</p>
            </div>
            <button
              onClick={loadSubmissions}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Submissions List */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Daftar Submission</h2>
                
                {submissions.length === 0 ? (
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
                  submissions.map((submission) => (
                    <div
                      key={submission.submissionId}
                      onClick={() => setSelectedSubmission(submission)}
                      className={`bg-white rounded-xl shadow-lg p-5 cursor-pointer transition-all hover:shadow-xl ${
                        selectedSubmission?.submissionId === submission.submissionId
                          ? 'ring-2 ring-blue-500 border-blue-500'
                          : 'border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {submission.programStudi}
                          </h3>
                          <p className="text-sm text-gray-600">{submission.institusi}</p>
                        </div>
                        {getStatusIcon(submission.status)}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(submission.status)}`}>
                          {submission.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(submission.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right: Submission Detail + Certificate */}
              <div className="sticky top-6 space-y-4">
                {selectedSubmission ? (
                  <>
                    {/* Basic Info Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">Detail Submission</h2>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-4 border-b">
                          <span className="text-gray-600">Status</span>
                          <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(selectedSubmission.status)}`}>
                            {selectedSubmission.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pb-4 border-b">
                          <span className="text-gray-600">Submission ID</span>
                          <span className="font-mono text-sm font-semibold text-gray-900">{selectedSubmission.submissionId}</span>
                        </div>

                        <div className="flex items-center justify-between pb-4 border-b">
                          <span className="text-gray-600">Program Studi</span>
                          <span className="font-semibold text-gray-900">{selectedSubmission.programStudi}</span>
                        </div>

                        <div className="flex items-center justify-between pb-4 border-b">
                          <span className="text-gray-600">Institusi</span>
                          <span className="font-semibold text-gray-900">{selectedSubmission.institusi}</span>
                        </div>

                        <div className="flex items-center justify-between pb-4 border-b">
                          <span className="text-gray-600">Jenjang</span>
                          <span className="font-semibold text-gray-900">{selectedSubmission.jenjang}</span>
                        </div>

                        <div className="flex items-center justify-between pb-4 border-b">
                          <span className="text-gray-600">Tanggal Submit</span>
                          <span className="font-semibold text-gray-900">
                            {new Date(selectedSubmission.createdAt).toLocaleString('id-ID')}
                          </span>
                        </div>

                        {selectedSubmission.ai?.scoring?.finalScore && (
                          <div className="flex items-center justify-between pb-4 border-b">
                            <span className="text-gray-600 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Skor AI
                            </span>
                            <span className="text-2xl font-bold text-blue-600">
                              {selectedSubmission.ai.scoring.finalScore.toFixed(2)} / {selectedSubmission.ai.scoring.maxPossibleScore}
                            </span>
                          </div>
                        )}

                        {selectedSubmission.decision && (
                          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <CheckCircle className="w-5 h-5" />
                              Keputusan Sekretariat
                            </h3>
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600">
                                <strong>Hasil:</strong> {selectedSubmission.decision.result === 'approved' ? 'DISETUJUI' : 'DITOLAK'}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Catatan:</strong> {selectedSubmission.decision.notes}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Diputuskan oleh:</strong> {selectedSubmission.decision.decidedBy}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* AL Response Button */}
                        {(selectedSubmission.status === 'ak_submitted' || 
                          selectedSubmission.status === 'al_ready' || 
                          selectedSubmission.status === 'al_in_progress' ||
                          selectedSubmission.status === 'AL_SUBMITTED' ||
                          selectedSubmission.akConsistent === true) && (
                          <div className="mt-6">
                            <button
                              onClick={() => navigate(`/al-response/${selectedSubmission.submissionId}`)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-semibold"
                            >
                              <MapPin className="w-5 h-5" />
                              Respon Asesmen Lapangan
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Accreditation Decision & Certificate Card */}
                    {detailLoading ? (
                      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                        <p className="text-gray-500">Memuat detail akreditasi...</p>
                      </div>
                    ) : accreditationDetail ? (
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl shadow-lg p-6">
                        <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
                          <Award className="w-6 h-6 text-emerald-600" />
                          Keputusan Akreditasi
                        </h3>

                        {/* Rank Badge */}
                        {accreditationDetail.finalRank && (
                          <div className="text-center mb-6">
                            <span className={`inline-block px-6 py-3 rounded-full text-lg font-bold ${getRankBadgeColor(accreditationDetail.finalRank)}`}>
                              ⭐ {accreditationDetail.finalRank}
                            </span>
                            {accreditationDetail.finalScore && (
                              <p className="text-emerald-700 mt-2 text-sm">
                                Skor Akhir: <strong className="text-lg">{accreditationDetail.finalScore}</strong>
                              </p>
                            )}
                          </div>
                        )}

                        <div className="space-y-3 text-sm">
                          {accreditationDetail.skNumber && (
                            <div className="flex justify-between items-center bg-white/60 rounded-lg p-3">
                              <span className="text-emerald-700">Nomor SK</span>
                              <span className="font-mono font-bold text-emerald-900">{accreditationDetail.skNumber}</span>
                            </div>
                          )}
                          {accreditationDetail.skDate && (
                            <div className="flex justify-between items-center bg-white/60 rounded-lg p-3">
                              <span className="text-emerald-700">Tanggal SK</span>
                              <span className="font-semibold text-emerald-900">{formatDate(accreditationDetail.skDate)}</span>
                            </div>
                          )}
                          {accreditationDetail.validUntil && (
                            <div className="flex justify-between items-center bg-white/60 rounded-lg p-3">
                              <span className="text-emerald-700">Berlaku Sampai</span>
                              <span className="font-semibold text-emerald-900">{formatDate(accreditationDetail.validUntil)}</span>
                            </div>
                          )}
                          {accreditationDetail.decidedAt && (
                            <div className="flex justify-between items-center bg-white/60 rounded-lg p-3">
                              <span className="text-emerald-700">Diputuskan</span>
                              <span className="text-emerald-900">{formatDate(accreditationDetail.decidedAt)}</span>
                            </div>
                          )}
                        </div>

                        {/* Certificate Download */}
                        {accreditationDetail.certificateCid && (
                          <div className="mt-6 p-4 bg-white/80 rounded-xl border border-emerald-200">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-emerald-900">Sertifikat Akreditasi</p>
                                <p className="text-xs text-emerald-600 font-mono">CID: {accreditationDetail.certificateCid.substring(0, 20)}...</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <a
                                href={`https://gateway.pinata.cloud/ipfs/${accreditationDetail.certificateCid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
                              >
                                <Download className="w-4 h-4" />
                                Download Sertifikat
                              </a>
                              <button
                                onClick={() => navigate(`/traceability?q=${selectedSubmission.submissionId}&type=submission`)}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                              >
                                <Shield className="w-4 h-4" />
                                Trace
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Blockchain verification badge */}
                        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600">
                          <Shield className="w-4 h-4" />
                          Data tersimpan di blockchain Hyperledger Fabric
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Pilih submission untuk melihat detail</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
