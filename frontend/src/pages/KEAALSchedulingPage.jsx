import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  Calendar, MapPin, Clock, Send, CheckCircle, XCircle, 
  RefreshCw, AlertTriangle, Award, GraduationCap, ArrowRight, HelpCircle
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const BATCH_SCHEDULES = [
  { 
    batch: 1, 
    label: 'Batch 1 (Januari - April)', 
    alStartMonth: 2, alStartDay: 15,
    alEndMonth: 4, alEndDay: 21
  },
  { 
    batch: 2, 
    label: 'Batch 2 (Mei - Agustus)', 
    alStartMonth: 6, alStartDay: 15,
    alEndMonth: 8, alEndDay: 21
  },
  { 
    batch: 3, 
    label: 'Batch 3 (September - Desember)', 
    alStartMonth: 10, alStartDay: 15,
    alEndMonth: 12, alEndDay: 21
  }
];

const getNearestBatch = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  for (const batch of BATCH_SCHEDULES) {
    const alStart = new Date(currentYear, batch.alStartMonth - 1, batch.alStartDay);
    const alEnd = new Date(currentYear, batch.alEndMonth - 1, batch.alEndDay, 23, 59, 59);
    
    if (now <= alEnd) {
      return batch.batch;
    }
  }
  return 1;
};

const getBatchDateRange = (batchNumber) => {
  const batch = BATCH_SCHEDULES.find(b => b.batch === batchNumber);
  if (!batch) return { min: '', max: '' };
  
  const now = new Date();
  let year = now.getFullYear();
  
  const alEnd = new Date(year, batch.alEndMonth - 1, batch.alEndDay);
  if (now > alEnd) {
    year += 1;
  }
  
  const minDate = `${year}-${String(batch.alStartMonth).padStart(2, '0')}-${String(batch.alStartDay).padStart(2, '0')}T08:00`;
  const maxDate = `${year}-${String(batch.alEndMonth).padStart(2, '0')}-${String(batch.alEndDay).padStart(2, '0')}T17:00`;
  
  return { min: minDate, max: maxDate, year };
};

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
  const [selectedBatch, setSelectedBatch] = useState(getNearestBatch());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setMessage(null);
    
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    let pendingData = [];
    let approvedData = [];
    let readyData = [];

    // Fetch pending schedules
    try {
      const pendingRes = await fetch(`${API_BASE_URL}/al-schedule/list/pending`, { headers });
      if (pendingRes.ok) {
        const data = await pendingRes.json();
        pendingData = Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error('Error fetching pending schedules:', error);
    }

    // Fetch approved schedules
    try {
      const approvedRes = await fetch(`${API_BASE_URL}/al-schedule/list/approved`, { headers });
      if (approvedRes.ok) {
        const data = await approvedRes.json();
        approvedData = Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error('Error fetching approved schedules:', error);
    }

    // Fetch ready for AL
    try {
      const readyRes = await fetch(`${API_BASE_URL}/al-schedule/list/ready-for-al`, { headers });
      if (readyRes.ok) {
        const data = await readyRes.json();
        readyData = Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error('Error fetching ready for AL:', error);
    }

    setPendingSchedules(pendingData);
    setApprovedSchedules(approvedData);
    setReadyForAL(readyData);

    const scheduledIds = new Set([
      ...pendingData.map(s => s.submission_id),
      ...approvedData.map(s => s.submission_id),
      ...readyData.map(s => s.submission_id)
    ]);

    // Fetch submissions and filter out those that already have a schedule
    try {
      const submissionsRes = await fetch(`${API_BASE_URL}/submissions`, { headers });
      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json();
        const dataArray = Array.isArray(submissionsData) ? submissionsData : 
                         (submissionsData?.data && Array.isArray(submissionsData.data) ? submissionsData.data : []);
        const completedStatuses = ['accredited', 'released', 'verified', 'completed'];
        const readySubmissions = dataArray.filter(s => 
          s.akConsistent === true && 
          !scheduledIds.has(s.submissionId) &&
          !completedStatuses.includes(s.status)
        );
        setSubmissions(readySubmissions);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }

    setLoading(false);
  };

  const handleProposeSchedule = async () => {
    if (!selectedSubmission || !formData.proposedDate) {
      setMessage({ type: 'error', text: 'Pilih tanggal asesmen lapangan' });
      setShowResultModal(true);
      return;
    }

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
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[600px] h-[600px] bg-indigo-200/10 rounded-full blur-[150px] pointer-events-none" />

      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('kea')}
      />

      <div className="flex-1 ml-64 overflow-auto relative z-10">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650 shadow-sm shadow-purple-100/50">
                  <Award className="w-5 h-5" />
                </div>
                Penjadwalan Asesmen Lapangan
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">
                Kelola dan usulkan penanggalan Asesmen Lapangan (AL) untuk alur sinkronisasi A dan B
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-purple-600 font-bold text-xs cursor-pointer active:scale-95"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
              Refresh Data
            </button>
          </header>

          {/* Message Alert Banner */}
          {message && (
            <div className={`rounded-xl p-4 border animate-fade-in ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
              message.type === 'error' ? 'bg-rose-50 border-rose-250 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <p className="text-xs font-black uppercase tracking-wider">{message.type === 'success' ? 'Sukses ✓' : message.type === 'error' ? 'Error ⚠' : 'Info'}</p>
              <p className="text-sm font-semibold mt-0.5">{message.text}</p>
            </div>
          )}

          {/* Tabs Container - Glass Box */}
          <div className="glass-panel-light rounded-2xl p-2.5 shadow-sm border border-slate-200/60 w-fit">
            <div className="flex gap-2 flex-wrap">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-purple-605 bg-gradient-to-tr from-purple-650 to-indigo-600 text-white shadow-md shadow-purple-100'
                      : 'text-slate-600 hover:bg-slate-100/80'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 glass-panel-light rounded-2xl shadow-sm animate-pulse">
              <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mb-3" />
              <p className="text-slate-500 font-bold text-sm">Menyelaraskan data penjadwalan...</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              {/* Tab: Propose Schedule */}
              {activeTab === 'propose' && (
                <div className="glass-panel-light rounded-2xl shadow-sm overflow-hidden border border-slate-200/60">
                  <div className="p-6 border-b border-slate-200/60 bg-slate-50/50">
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Pengajuan Siap untuk Dijadwalkan
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Daftar program studi dengan skor asesmen kecukupan konsisten yang belum memiliki jadwal AL
                    </p>
                  </div>
                  {submissions.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                        <AlertTriangle className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-base font-black text-slate-800 mb-1">Tidak Ada Pengajuan</h3>
                      <p className="text-slate-550 text-xs font-semibold max-w-md mx-auto leading-relaxed">
                        Seluruh pengajuan dengan skor konsisten telah diusulkan jadwal AL. Menunggu proses selanjutnya.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-150/60">
                      {submissions.map(sub => (
                        <div key={sub.submissionId} className="p-6 hover:bg-purple-50/40 transition-colors duration-150 group">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                                {sub.submissionId}
                              </span>
                              <h3 className="font-black text-slate-900 tracking-tight leading-snug group-hover:text-purple-650 transition-colors mt-0.5">
                                {sub.programStudi}
                              </h3>
                              <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                                {sub.institusi}
                              </p>
                            </div>
                            <button
                              onClick={() => { setSelectedSubmission(sub); setShowModal(true); }}
                              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-750 text-white rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg shadow-purple-100/80 transition-all duration-150 active:scale-95"
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
                <div className="glass-panel-light rounded-2xl shadow-sm overflow-hidden border border-slate-200/60">
                  <div className="p-6 border-b border-slate-200/60 bg-slate-50/50">
                    <h2 className="text-base font-black text-slate-900 tracking-tight">Menunggu Persetujuan Sekretariat</h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Jadwal AL yang diajukan oleh KEA dan sedang ditinjau oleh Sekretariat</p>
                  </div>
                  {pendingSchedules.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                        <Clock className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-xs font-semibold">Tidak ada jadwal yang menunggu persetujuan</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-150/60">
                      {pendingSchedules.map(schedule => (
                        <div key={schedule.id} className="p-6 hover:bg-slate-50/40 transition-colors duration-150">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">{schedule.submission_id}</span>
                              <div className="flex items-center gap-2 text-slate-800 text-sm font-bold">
                                <Calendar className="w-4 h-4 text-amber-500" />
                                <span>{formatDate(schedule.proposed_date)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <MapPin className="w-4 h-4 text-slate-450" />
                                <span>{schedule.proposed_venue}</span>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 border border-amber-250 text-amber-800 uppercase shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
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
                <div className="glass-panel-light rounded-2xl shadow-sm overflow-hidden border border-slate-200/60">
                  <div className="p-6 border-b border-slate-200/60 bg-slate-50/50">
                    <h2 className="text-base font-black text-slate-900 tracking-tight">Jadwal Disetujui</h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Jadwal AL yang disetujui Sekretariat. Periksa sinkronisasi untuk memicu alur AL.</p>
                  </div>
                  {approvedSchedules.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                        <CheckCircle className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-xs font-semibold">Belum ada jadwal yang disetujui</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-150/60">
                      {approvedSchedules.map(schedule => (
                        <div key={schedule.id} className="p-6 hover:bg-slate-50/40 transition-colors duration-150">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">{schedule.submission_id}</span>
                              <div className="flex items-center gap-2 text-slate-800 text-sm font-bold">
                                <Calendar className="w-4 h-4 text-emerald-500" />
                                <span>{formatDate(schedule.proposed_date)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <MapPin className="w-4 h-4 text-slate-450" />
                                <span>{schedule.proposed_venue}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-3.5">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 border border-emerald-250 text-emerald-800 uppercase shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Disetujui
                              </span>
                              <button
                                onClick={() => handleCheckSync(schedule.submission_id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-purple-650 hover:text-purple-750 transition-colors border border-purple-200 hover:border-purple-300 rounded-xl cursor-pointer bg-purple-50/30 active:scale-95"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
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
                <div className="glass-panel-light rounded-2xl shadow-sm overflow-hidden border border-slate-200/60">
                  <div className="p-6 border-b border-slate-200/60 bg-slate-50/50">
                    <h2 className="text-base font-black text-slate-900 tracking-tight">Siap untuk Asesmen Lapangan</h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Seluruh alur A (AK Konsisten) dan Alur B (Jadwal Disetujui) telah tersinkron penuh</p>
                  </div>
                  {readyForAL.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                        <Clock className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-xs font-semibold">Belum ada submission yang siap untuk AL</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-150/60 bg-white/30">
                      {readyForAL.map(schedule => (
                        <div key={schedule.id} className="p-6 bg-gradient-to-r from-emerald-50/30 to-teal-50/20 hover:from-emerald-50/50 transition-all duration-150">
                          <div className="flex items-center gap-2 mb-3 text-emerald-800 text-xs font-black uppercase tracking-wider">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            SIAP UNTUK ASESMEN LAPANGAN (SINKRON)
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">{schedule.submission_id}</span>
                          <div className="flex items-center gap-2 text-slate-800 text-sm font-bold mt-2">
                            <Calendar className="w-4 h-4 text-emerald-500" />
                            <span>{formatDate(schedule.proposed_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>{schedule.proposed_venue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Propose Schedule */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-fade-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 to-indigo-650" />
            <div className="p-7 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650 shadow-sm">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Usulkan Jadwal AL</h2>
                    <p className="text-slate-500 text-xs font-semibold">Tentukan periode Asesmen Lapangan untuk program studi</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowModal(false); setSelectedSubmission(null); }}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4.5 h-4.5" />
                </button>
              </div>
              
              <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-150/60 shadow-inner-sm">
                <p className="font-black text-purple-900 text-sm">{selectedSubmission?.programStudi}</p>
                <p className="text-xs font-semibold text-purple-700 flex items-center gap-1 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                  {selectedSubmission?.institusi}
                </p>
              </div>

              <div className="space-y-4">
                {/* Batch Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                    Batch Akreditasi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => {
                      setSelectedBatch(Number(e.target.value));
                      setFormData({ ...formData, proposedDate: '', proposedEndDate: '' });
                    }}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-700 text-sm font-semibold transition-all duration-200 outline-none shadow-sm cursor-pointer"
                  >
                    {BATCH_SCHEDULES.map(batch => (
                      <option key={batch.batch} value={batch.batch}>
                        {batch.label}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const range = getBatchDateRange(selectedBatch);
                    const batchInfo = BATCH_SCHEDULES.find(b => b.batch === selectedBatch);
                    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                    return (
                      <p className="text-[10px] text-purple-600 mt-1 font-bold bg-purple-50/50 px-2.5 py-1 rounded-lg border border-purple-100 w-fit flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Periode AL: {batchInfo?.alStartDay} {months[batchInfo?.alStartMonth]} - {batchInfo?.alEndDay} {months[batchInfo?.alEndMonth]} {range.year}
                      </p>
                    );
                  })()}
                </div>

                {/* Tanggal Mulai AL */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                    Tanggal Mulai AL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.proposedDate}
                    onChange={(e) => setFormData({ ...formData, proposedDate: e.target.value })}
                    min={getBatchDateRange(selectedBatch).min}
                    max={getBatchDateRange(selectedBatch).max}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-800 text-sm font-semibold outline-none shadow-sm cursor-text"
                  />
                </div>

                {/* Tanggal Selesai AL */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                    Tanggal Selesai AL (Opsional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.proposedEndDate}
                    onChange={(e) => setFormData({ ...formData, proposedEndDate: e.target.value })}
                    min={formData.proposedDate || getBatchDateRange(selectedBatch).min}
                    max={getBatchDateRange(selectedBatch).max}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-800 text-sm font-semibold outline-none shadow-sm cursor-text"
                  />
                </div>

                {/* Lokasi */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                    Tempat / Lokasi AL
                  </label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 text-xs font-bold flex items-center gap-2 shadow-inner-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {selectedSubmission?.institusi || 'Kampus Institusi'}
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-0.5">Lokasi otomatis dialokasikan di kampus utama program studi pengusul.</p>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100/60 pt-4">
                <button
                  onClick={handleProposeSchedule}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-tr from-purple-650 to-indigo-600 hover:from-purple-750 hover:to-indigo-700 text-white rounded-xl disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 disabled:shadow-none transition-all font-black text-xs uppercase tracking-wider cursor-pointer shadow-md disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Mengirim...' : 'Usulkan Jadwal'}
                </button>
                <button
                  onClick={() => { setShowModal(false); setSelectedSubmission(null); }}
                  disabled={submitting}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && message && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full p-6 text-center animate-fade-in">
            <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-650 rounded-t-2xl" />
            
            {message.type === 'success' ? (
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-sm">
                <XCircle className="w-8 h-8 text-rose-500" />
              </div>
            )}
            
            <h3 className={`text-lg font-black mb-2 tracking-tight ${
              message.type === 'success' ? 'text-emerald-800' : 'text-rose-800'
            }`}>
              {message.type === 'success' ? 'Pengusulan Sukses ✓' : 'Proses Gagal'}
            </h3>
            <p className="text-slate-550 text-xs font-semibold leading-relaxed mb-6">{message.text}</p>
            
            <button
              onClick={() => { setShowResultModal(false); setMessage(null); }}
              className={`w-full px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer text-white ${
                message.type === 'success' 
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-750 shadow-md' 
                  : 'bg-gradient-to-tr from-rose-600 to-red-650 hover:from-rose-700 hover:to-red-750 shadow-md'
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
