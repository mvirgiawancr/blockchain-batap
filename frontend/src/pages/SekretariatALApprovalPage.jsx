import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, RefreshCw, FileText, User, Award } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

/**
 * Sekretariat AL Approval Page
 * Step 19: Sekretariat Admin memverifikasi jadwal AL
 * Step 20: Sekretariat Admin menyetujui/menolak jadwal AL
 */
export default function SekretariatALApprovalPage({ user }) {
  const navigate = useNavigate();
  const [pendingSchedules, setPendingSchedules] = useState([]);
  const [processedSchedules, setProcessedSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch pending schedules
      const pendingRes = await fetch(`${API_BASE_URL}/al-schedule/list/pending`, { headers });
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingSchedules(pendingData || []);
      }

      // Fetch approved + rejected schedules
      const approvedRes = await fetch(`${API_BASE_URL}/al-schedule/list/approved`, { headers });
      if (approvedRes.ok) {
        const approvedData = await approvedRes.json();
        setProcessedSchedules(approvedData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Gagal mengambil data' });
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (approved) => {
    if (!selectedSchedule) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/al-schedule/approve/${selectedSchedule.submission_id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            approved,
            notes: decisionNotes
          })
        }
      );

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: approved ? 'Jadwal AL berhasil disetujui!' : 'Jadwal AL ditolak.'
        });
        setShowModal(false);
        setDecisionNotes('');
        setSelectedSchedule(null);
        fetchData();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Gagal memproses keputusan' });
      }
    } catch (error) {
      console.error('Error processing decision:', error);
      setMessage({ type: 'error', text: 'Terjadi kesalahan' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const tabs = [
    { id: 'pending', label: 'Menunggu Verifikasi', icon: Clock, count: pendingSchedules.length },
    { id: 'processed', label: 'Sudah Diproses', icon: CheckCircle, count: processedSchedules.length }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('sekretariat')}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Award className="w-8 h-8 text-amber-500" />
                Verifikasi Jadwal Asesmen Lapangan
              </h1>
              <p className="text-gray-600 mt-1">Step 19-20: Verifikasi dan setujui jadwal AL dari KEA</p>
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
              'bg-red-50 border-2 border-red-200 text-red-800'
            }`}>
              <p className="font-medium">{message.text}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm p-2">
            <div className="flex gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab.id ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-600'
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
              {/* Tab: Pending */}
              {activeTab === 'pending' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Jadwal Menunggu Verifikasi</h2>
                  </div>
                  {pendingSchedules.length === 0 ? (
                    <div className="p-12 text-center">
                      <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Tidak ada jadwal yang perlu diverifikasi</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {pendingSchedules.map(schedule => (
                        <div key={schedule.id} className="p-6 hover:bg-amber-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <span className="inline-flex px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold mb-3">
                                Menunggu Verifikasi
                              </span>
                              
                              {/* Program Studi & Institusi */}
                              {schedule.programStudi && (
                                <div className="mb-3">
                                  <h3 className="font-bold text-gray-900 text-lg">{schedule.programStudi}</h3>
                                  <p className="text-gray-600">{schedule.institusi}</p>
                                </div>
                              )}

                              {/* Submission ID */}
                              <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                                <FileText className="w-3 h-3" />
                                <span>{schedule.submission_id}</span>
                              </div>

                              {/* Assessors */}
                              {(schedule.assessor1Name || schedule.assessor2Name) && (
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                  <p className="text-sm text-blue-700 font-semibold mb-2">Tim Asesor:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {schedule.assessor1Name && (
                                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                        {schedule.assessor1Name}
                                      </span>
                                    )}
                                    {schedule.assessor2Name && (
                                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                                        {schedule.assessor2Name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-gray-900 mb-2">
                                <Calendar className="w-5 h-5 text-amber-500" />
                                <span className="font-semibold">{formatDate(schedule.proposed_date)}</span>
                              </div>

                              {schedule.proposed_end_date && (
                                <div className="text-gray-600 text-sm ml-7 mb-2">
                                  s/d {formatDate(schedule.proposed_end_date)}
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-gray-700">
                                <MapPin className="w-5 h-5 text-gray-400" />
                                <span>{schedule.proposed_venue}</span>
                              </div>

                              <div className="flex items-center gap-2 mt-3 text-gray-500 text-sm">
                                <User className="w-4 h-4" />
                                <span>Diusulkan oleh: {schedule.proposed_by_name || 'KEA'}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => { setSelectedSchedule(schedule); setShowModal(true); }}
                              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Verifikasi
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Processed */}
              {activeTab === 'processed' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Jadwal Sudah Diproses</h2>
                  </div>
                  {processedSchedules.length === 0 ? (
                    <div className="p-12 text-center">
                      <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Belum ada jadwal yang diproses</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {processedSchedules.map(schedule => (
                        <div key={schedule.id} className="p-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                                schedule.status === 'approved' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {schedule.status === 'approved' ? (
                                  <><CheckCircle className="w-3 h-3" /> Disetujui</>
                                ) : (
                                  <><XCircle className="w-3 h-3" /> Ditolak</>
                                )}
                              </span>

                              <div className="text-gray-400 text-xs mb-2">{schedule.submission_id}</div>
                              
                              <div className="flex items-center gap-2 text-gray-900 mb-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{formatDate(schedule.proposed_date)}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>{schedule.proposed_venue}</span>
                              </div>

                              {schedule.approval_notes && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                                  <strong>Catatan:</strong> {schedule.approval_notes}
                                </div>
                              )}
                            </div>

                            <div className="text-right text-sm text-gray-500">
                              <div>Diverifikasi oleh:</div>
                              <div className="text-gray-700">{schedule.approved_by_name || 'Sekretariat'}</div>
                              <div className="text-xs mt-1">{formatDate(schedule.approved_at)}</div>
                            </div>
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

      {/* Modal Verification */}
      {showModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-amber-500" />
              Verifikasi Jadwal AL
            </h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-400 mb-2">Submission ID:</div>
              <div className="font-semibold text-gray-900 mb-4">{selectedSchedule.submission_id}</div>
              
              <div className="flex items-center gap-2 text-gray-900 mb-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <span className="font-medium">{formatDate(selectedSchedule.proposed_date)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span>{selectedSchedule.proposed_venue}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Catatan Verifikasi (Opsional)
              </label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Tambahkan catatan untuk keputusan Anda..."
                rows={3}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleDecision(false)}
                disabled={submitting}
                className="flex-1 px-4 py-3 border-2 border-red-500 text-red-600 rounded-xl font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Tolak
              </button>
              <button
                onClick={() => handleDecision(true)}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {submitting ? 'Memproses...' : 'Setujui'}
              </button>
            </div>
            
            <button
              onClick={() => { setShowModal(false); setSelectedSchedule(null); setDecisionNotes(''); }}
              className="w-full mt-3 px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
