import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSubmissions } from '../services/api';
import wsService from '../services/websocket';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  Users, CheckSquare, XSquare, Clock, AlertTriangle, 
  TrendingUp, FileCheck, Award, Search, Filter, RefreshCw
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function KEADashboard({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Offer form state
  const [selectedAssessor1, setSelectedAssessor1] = useState('');
  const [selectedAssessor2, setSelectedAssessor2] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Stats
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pendingOffers: 0,
    assignedAssessors: 0,
    akPending: 0,
    akConsistent: 0,
    akInconsistent: 0
  });

  useEffect(() => {
    loadAssessors();
    loadSubmissions();
    
    const wsId = (user && (user.username || user.id)) || 'kea';
    wsService.connect(wsId);
    wsService.on('AssessorOfferCreated', loadSubmissions);
    wsService.on('AssessorResponded', loadSubmissions);
    wsService.on('UPPSResponded', loadSubmissions);
    wsService.on('AKAssessmentSubmitted', loadSubmissions);
    
    return () => wsService.disconnect();
  }, [user]);

  const loadAssessors = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('[KEA] Loading assessors from:', `${API_BASE_URL}/assessors`);
      
      const response = await fetch(`${API_BASE_URL}/assessors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      console.log('[KEA] Assessors response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[KEA] Assessors data:', data);
        const assessorList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        console.log('[KEA] Assessors count:', assessorList.length);
        setAssessors(assessorList);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[KEA] Failed to load assessors:', response.status, errorData);
        setAssessors([]);
      }
    } catch (err) {
      console.error('[KEA] Error loading assessors:', err);
      setAssessors([]);
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const res = await getAllSubmissions();
      const list = Array.isArray(res.data) ? res.data : [];
      
      // Calculate stats
      const pendingOffers = list.filter(s => s.currentOffer?.status === 'pending').length;
      const assigned = list.filter(s => s.assignedAssessors).length;
      const akPending = list.filter(s => s.assignedAssessors && (!s.akAssessments || s.akAssessments.length < 2)).length;
      const akConsistent = list.filter(s => s.akConsistent === true).length;
      const akInconsistent = list.filter(s => s.akAssessments?.length >= 2 && s.akConsistent === false).length;
      
      setStats({
        totalSubmissions: list.length,
        pendingOffers,
        assignedAssessors: assigned,
        akPending,
        akConsistent,
        akInconsistent
      });
      
      setSubmissions(list);
    } catch (err) {
      console.error('Error loading submissions:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOfferAssessors = async () => {
    if (!selectedSubmission || !selectedAssessor1 || !selectedAssessor2) {
      setMessage({ type: 'error', text: 'Pilih kedua asesor' });
      return;
    }

    if (selectedAssessor1 === selectedAssessor2) {
      setMessage({ type: 'error', text: 'Asesor 1 dan Asesor 2 harus berbeda' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const token = localStorage.getItem('token');
      const assessor1 = assessors.find(a => a.id === selectedAssessor1);
      const assessor2 = assessors.find(a => a.id === selectedAssessor2);

      const response = await fetch(`${API_BASE_URL}/kea/assign/${selectedSubmission.submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assessor1Id: assessor1.id,
          assessor1Name: assessor1.name,
          assessor2Id: assessor2.id,
          assessor2Name: assessor2.name,
          notes: offerNotes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal mengirim penawaran');
      }

      setMessage({ type: 'success', text: 'Penawaran asesor berhasil dikirim!' });
      setShowOfferModal(false);
      setSelectedAssessor1('');
      setSelectedAssessor2('');
      setOfferNotes('');
      await loadSubmissions();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckConsistency = async (submission) => {
    if (!submission.akAssessments || submission.akAssessments.length < 2) {
      setMessage({ type: 'error', text: 'Belum ada 2 penilaian AK' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Calculate consistency (simple example: check if scores are within threshold)
      const scores1 = submission.akAssessments[0].totalScore;
      const scores2 = submission.akAssessments[1].totalScore;
      const difference = Math.abs(scores1 - scores2);
      const consistent = difference <= 20; // 20 point threshold
      
      const response = await fetch(`${API_BASE_URL}/kea/consistency/${submission.submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          consistent,
          notes: `Selisih skor: ${difference} poin`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal memeriksa konsistensi');
      }

      setMessage({ 
        type: 'success', 
        text: consistent ? 'Skor konsisten ✓' : 'Skor tidak konsisten - perlu penilaian ulang' 
      });
      await loadSubmissions();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = sub.programStudi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.institusi?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending-offer') return sub.currentOffer?.status === 'pending';
    if (filterStatus === 'assigned') return sub.assignedAssessors && !sub.akConsistent;
    if (filterStatus === 'ak-complete') return sub.akConsistent === true;
    
    return true;
  });

  const openOfferModal = (submission) => {
    setSelectedSubmission(submission);
    setShowOfferModal(true);
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('kea')}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                KEA Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Komite Evaluasi dan Akreditasi</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadSubmissions}
                className="p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <Award className="w-10 h-10 text-purple-600" />
            </div>
          </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-500 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Submission</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalSubmissions}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 p-4">
            <p className="text-sm text-gray-600 mb-1">Penawaran Pending</p>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingOffers}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-green-500 p-4">
            <p className="text-sm text-gray-600 mb-1">Asesor Ditugaskan</p>
            <p className="text-3xl font-bold text-gray-900">{stats.assignedAssessors}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-orange-500 p-4">
            <p className="text-sm text-gray-600 mb-1">AK Pending</p>
            <p className="text-3xl font-bold text-gray-900">{stats.akPending}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 p-4">
            <p className="text-sm text-gray-600 mb-1">AK Konsisten</p>
            <p className="text-3xl font-bold text-gray-900">{stats.akConsistent}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-red-500 p-4">
            <p className="text-sm text-gray-600 mb-1">AK Perlu Review</p>
            <p className="text-3xl font-bold text-gray-900">{stats.akInconsistent}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari program studi atau institusi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === 'all'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterStatus('pending-offer')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === 'pending-offer'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Penawaran Pending
              </button>
              <button
                onClick={() => setFilterStatus('assigned')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === 'assigned'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Ditugaskan
              </button>
              <button
                onClick={() => setFilterStatus('ak-complete')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === 'ak-complete'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                AK Selesai
              </button>
            </div>
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

        {/* Submissions Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Program Studi</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Institusi</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status Penawaran</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Asesor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">AK Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      Tidak ada data submission
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub) => (
                    <tr key={sub.submissionId} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{sub.programStudi}</div>
                        <div className="text-sm text-gray-500">{sub.submissionId}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{sub.institusi}</td>
                      <td className="px-6 py-4">
                        {sub.currentOffer ? (
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            sub.currentOffer.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            sub.currentOffer.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {sub.currentOffer.status}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Belum ada penawaran</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {sub.assignedAssessors ? (
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <CheckSquare className="w-4 h-4 text-green-600" />
                              <span className="text-gray-700">{sub.assignedAssessors.assessor1Name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckSquare className="w-4 h-4 text-green-600" />
                              <span className="text-gray-700">{sub.assignedAssessors.assessor2Name}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {sub.akAssessments && sub.akAssessments.length > 0 ? (
                          <div className="space-y-1">
                            <div className="text-sm text-gray-600">
                              {sub.akAssessments.length} / 2 penilaian
                            </div>
                            {sub.akConsistent === true && (
                              <span className="inline-flex px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                ✓ Konsisten
                              </span>
                            )}
                            {sub.akConsistent === false && (
                              <span className="inline-flex px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                                ✗ Tidak Konsisten
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Belum ada penilaian</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {!sub.currentOffer && !sub.assignedAssessors && (
                            <button
                              onClick={() => openOfferModal(sub)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
                            >
                              <Users className="w-4 h-4" />
                              Tawarkan Asesor
                            </button>
                          )}
                          {sub.akAssessments && sub.akAssessments.length >= 2 && !sub.akConsistent && (
                            <button
                              onClick={() => handleCheckConsistency(sub)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                            >
                              <TrendingUp className="w-4 h-4" />
                              Cek Konsistensi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Offer Modal */}
        {showOfferModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Tawarkan Pasangan Asesor
              </h2>
              
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-semibold text-purple-900">{selectedSubmission?.programStudi}</p>
                <p className="text-sm text-purple-700">{selectedSubmission?.institusi}</p>
              </div>

              <div className="space-y-4 mb-6">
                {/* Debug info - hapus setelah fix */}
                <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                  Debug: {assessors.length} assessors loaded
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Asesor 1 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedAssessor1}
                    onChange={(e) => setSelectedAssessor1(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="">Pilih Asesor 1</option>
                    {assessors.length === 0 && (
                      <option disabled>Loading assessors...</option>
                    )}
                    {assessors.map(assessor => (
                      <option key={assessor.id} value={assessor.id}>
                        {assessor.name} {assessor.institution ? `- ${assessor.institution}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Asesor 2 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedAssessor2}
                    onChange={(e) => setSelectedAssessor2(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="">Pilih Asesor 2</option>
                    {assessors.length === 0 && (
                      <option disabled>Loading assessors...</option>
                    )}
                    {assessors.map(assessor => (
                      <option key={assessor.id} value={assessor.id}>
                        {assessor.name} {assessor.institution ? `- ${assessor.institution}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Catatan (Opsional)
                  </label>
                  <textarea
                    value={offerNotes}
                    onChange={(e) => setOfferNotes(e.target.value)}
                    placeholder="Catatan tambahan untuk penugasan..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleOfferAssessors}
                  disabled={submitting || !selectedAssessor1 || !selectedAssessor2}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Penawaran'}
                </button>
                <button
                  onClick={() => {
                    setShowOfferModal(false);
                    setSelectedAssessor1('');
                    setSelectedAssessor2('');
                    setOfferNotes('');
                  }}
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
