import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Calendar, MapPin, Clock, Send, CheckCircle, XCircle, RefreshCw, AlertTriangle, Award } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

/**
 * KEA AL Scheduling Page
 * Step 18: KEA mengusulkan jadwal Asesmen Lapangan
 * Step 21: Melihat status sinkronisasi alur A dan B
 */
export default function KEAALSchedulingPage({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [pendingSchedules, setPendingSchedules] = useState([]);
  const [approvedSchedules, setApprovedSchedules] = useState([]);
  const [readyForAL, setReadyForAL] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('propose');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [formData, setFormData] = useState({
    proposedDate: '',
    proposedEndDate: '',
    proposedVenue: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setMessage(null);
    
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch submissions ready for scheduling (AK consistent)
    try {
      const submissionsRes = await fetch(`${API_BASE_URL}/submissions`, { headers });
      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json();
        const dataArray = Array.isArray(submissionsData) ? submissionsData : 
                         (submissionsData?.data && Array.isArray(submissionsData.data) ? submissionsData.data : []);
        // Filter submissions that have AK consistent but no AL schedule yet
        const readySubmissions = dataArray.filter(s => 
          s.akConsistent === true && !s.alSchedule
        );
        setSubmissions(readySubmissions);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }

    // Fetch pending schedules
    try {
      const pendingRes = await fetch(`${API_BASE_URL}/al-schedule/list/pending`, { headers });
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingSchedules(Array.isArray(pendingData) ? pendingData : []);
      }
    } catch (error) {
      console.error('Error fetching pending schedules:', error);
    }

    // Fetch approved schedules
    try {
      const approvedRes = await fetch(`${API_BASE_URL}/al-schedule/list/approved`, { headers });
      if (approvedRes.ok) {
        const approvedData = await approvedRes.json();
        setApprovedSchedules(Array.isArray(approvedData) ? approvedData : []);
      }
    } catch (error) {
      console.error('Error fetching approved schedules:', error);
    }

    // Fetch ready for AL
    try {
      const readyRes = await fetch(`${API_BASE_URL}/al-schedule/list/ready-for-al`, { headers });
      if (readyRes.ok) {
        const readyData = await readyRes.json();
        setReadyForAL(Array.isArray(readyData) ? readyData : []);
      }
    } catch (error) {
      console.error('Error fetching ready for AL:', error);
    }

    setLoading(false);
  };

  const handleProposeSchedule = async () => {
    if (!selectedSubmission || !formData.proposedDate) {
      setMessage({ type: 'error', text: 'Pilih tanggal asesmen lapangan' });
      setShowResultModal(true);
      return;
    }

    // Auto-set venue from institution
    const venue = selectedSubmission.institusi || 'Kampus Institusi';

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/al-schedule/propose/${selectedSubmission.submissionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            proposedDate: formData.proposedDate,
            proposedEndDate: formData.proposedEndDate,
            proposedVenue: venue
          })
        }
      );

      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: result.message || 'Jadwal AL berhasil diusulkan!' });
        setShowModal(false);
        setFormData({ proposedDate: '', proposedEndDate: '', proposedVenue: '' });
        setSelectedSubmission(null);
        fetchData();
      } else {
        setMessage({ type: 'error', text: result.message || result.error || 'Gagal mengusulkan jadwal' });
      }
      setShowResultModal(true);
    } catch (error) {
      console.error('Error proposing schedule:', error);
      setMessage({ type: 'error', text: 'Terjadi kesalahan koneksi' });
      setShowResultModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckSync = async (submissionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/al-schedule/check-sync/${submissionId}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.readyForAL) {
          setMessage({ type: 'success', text: 'Sinkronisasi selesai! Siap untuk Asesmen Lapangan.' });
        } else {
          setMessage({ type: 'info', text: 'Sinkronisasi belum lengkap. Menunggu persetujuan jadwal AL.' });
        }
        fetchData();
      }
    } catch (error) {
      console.error('Error checking sync:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'propose', label: 'Usulkan Jadwal', icon: Calendar },
    { id: 'pending', label: 'Menunggu Persetujuan', icon: Clock, count: pendingSchedules.length },
    { id: 'approved', label: 'Disetujui', icon: CheckCircle, count: approvedSchedules.length },
    { id: 'ready', label: 'Siap AL', icon: CheckCircle, count: readyForAL.length }
  ];

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
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Award className="w-8 h-8 text-purple-600" />
                Penjadwalan Asesmen Lapangan
              </h1>
              <p className="text-gray-600 mt-1">Step 18-21: Kelola jadwal AL dan sinkronisasi alur</p>
            </div>
            <button
              onClick={fetchData}
              className="p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </header>

          {/* Message */}
          {message && (
            <div className={`rounded-xl p-4 ${
              message.type === 'success' ? 'bg-green-50 border-2 border-green-200 text-green-800' :
              message.type === 'error' ? 'bg-red-50 border-2 border-red-200 text-red-800' :
              'bg-blue-50 border-2 border-blue-200 text-blue-800'
            }`}>
              <p className="font-medium">{message.text}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm p-2">
            <div className="flex gap-2 flex-wrap">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab.id ? 'bg-white text-purple-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : (
            <>
              {/* Tab: Propose Schedule */}
              {activeTab === 'propose' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Submission Siap untuk Dijadwalkan
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Submission dengan AK konsisten yang belum memiliki jadwal AL
                    </p>
                  </div>
                  {submissions.length === 0 ? (
                    <div className="p-12 text-center">
                      <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Tidak ada submission yang siap dijadwalkan</h3>
                      <p className="text-gray-500">Submission harus memiliki AK konsisten terlebih dahulu.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {submissions.map(sub => (
                        <div key={sub.submissionId} className="p-6 hover:bg-purple-50 transition-colors">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-semibold text-gray-900">{sub.programStudi}</h3>
                              <p className="text-gray-600 text-sm">{sub.institusi}</p>
                              <p className="text-gray-400 text-xs mt-1">{sub.submissionId}</p>
                            </div>
                            <button
                              onClick={() => { setSelectedSubmission(sub); setShowModal(true); }}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                            >
                              <Calendar className="w-4 h-4" />
                              Usulkan Jadwal
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Pending Schedules */}
              {activeTab === 'pending' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Menunggu Persetujuan Sekretariat</h2>
                  </div>
                  {pendingSchedules.length === 0 ? (
                    <div className="p-12 text-center">
                      <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Tidak ada jadwal yang menunggu persetujuan</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {pendingSchedules.map(schedule => (
                        <div key={schedule.id} className="p-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm text-gray-400 mb-2">{schedule.submission_id}</p>
                              <div className="flex items-center gap-2 text-gray-900">
                                <Calendar className="w-4 h-4 text-amber-500" />
                                <span className="font-medium">{formatDate(schedule.proposed_date)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600 mt-1">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>{schedule.proposed_venue}</span>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                              Menunggu Persetujuan
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Approved Schedules */}
              {activeTab === 'approved' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Jadwal Disetujui</h2>
                  </div>
                  {approvedSchedules.length === 0 ? (
                    <div className="p-12 text-center">
                      <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Belum ada jadwal yang disetujui</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {approvedSchedules.map(schedule => (
                        <div key={schedule.id} className="p-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm text-gray-400 mb-2">{schedule.submission_id}</p>
                              <div className="flex items-center gap-2 text-gray-900">
                                <Calendar className="w-4 h-4 text-green-500" />
                                <span className="font-medium">{formatDate(schedule.proposed_date)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600 mt-1">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>{schedule.proposed_venue}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                Disetujui
                              </span>
                              <button
                                onClick={() => handleCheckSync(schedule.submission_id)}
                                className="flex items-center gap-1 px-3 py-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Cek Sinkronisasi
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Ready for AL */}
              {activeTab === 'ready' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Siap untuk Asesmen Lapangan</h2>
                    <p className="text-sm text-gray-500">Alur A (AK Konsisten) dan Alur B (Jadwal Disetujui) sudah selesai</p>
                  </div>
                  {readyForAL.length === 0 ? (
                    <div className="p-12 text-center">
                      <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Belum ada submission yang siap untuk AL</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {readyForAL.map(schedule => (
                        <div key={schedule.id} className="p-6 bg-gradient-to-r from-green-50 to-emerald-50">
                          <div className="flex items-center gap-3 mb-3 text-green-700 font-semibold">
                            <CheckCircle className="w-5 h-5" />
                            SIAP UNTUK ASESMEN LAPANGAN
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{schedule.submission_id}</p>
                          <div className="flex items-center gap-2 text-gray-900">
                            <Calendar className="w-4 h-4 text-green-500" />
                            <span className="font-medium">{formatDate(schedule.proposed_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 mt-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{schedule.proposed_venue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Propose Schedule */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-purple-600" />
              Usulkan Jadwal AL
            </h2>
            
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm font-semibold text-purple-900">{selectedSubmission?.programStudi}</p>
              <p className="text-sm text-purple-700">{selectedSubmission?.institusi}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tanggal Mulai AL <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.proposedDate}
                  onChange={(e) => setFormData({ ...formData, proposedDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tanggal Selesai AL (Opsional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.proposedEndDate}
                  onChange={(e) => setFormData({ ...formData, proposedEndDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tempat/Lokasi AL
                </label>
                <div className="px-4 py-3 bg-gray-100 rounded-xl text-gray-700 border-2 border-gray-200">
                  {selectedSubmission?.institusi || 'Kampus Institusi'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Lokasi otomatis di kampus program studi</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleProposeSchedule}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Mengirim...' : 'Usulkan Jadwal'}
              </button>
              <button
                onClick={() => { setShowModal(false); setSelectedSubmission(null); }}
                disabled={submitting}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Result Modal */}
      {showResultModal && message && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            )}
            <h3 className={`text-xl font-bold mb-2 ${
              message.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {message.type === 'success' ? 'Berhasil!' : 'Error'}
            </h3>
            <p className="text-gray-600 mb-6">{message.text}</p>
            <button
              onClick={() => { setShowResultModal(false); setMessage(null); }}
              className={`px-8 py-3 rounded-xl font-semibold text-white transition-colors ${
                message.type === 'success' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
