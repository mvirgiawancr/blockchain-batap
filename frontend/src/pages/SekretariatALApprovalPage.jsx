import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, RefreshCw, FileText, User, Award, Info, AlertCircle } from 'lucide-react';
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

  const role = user?.role || 'sekretariat';
  const menuItems = getMenuForRole(role);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-64 w-72 h-72 bg-violet-100/20 rounded-full blur-3xl pointer-events-none" />

      {/* Sidebar */}
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={menuItems}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64 overflow-auto relative">
        <div className="p-8 max-w-6xl mx-auto space-y-6">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <Award className="w-8 h-8 text-indigo-600" />
                Verifikasi Jadwal Asesmen Lapangan (AL)
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Verifikasi kelayakan dan setujui usulan jadwal AL dari Komite KEA</p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-sm cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh Data
            </button>
          </header>

          {/* Message Alert */}
          {message && (
            <div className={`rounded-2xl p-4 border-2 animate-fade-in ${
              message.type === 'success' 
                ? 'bg-emerald-50 border-emerald-150 text-emerald-800' 
                : 'bg-rose-50 border-rose-150 text-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <p className="text-sm font-black leading-relaxed">{message.text}</p>
              </div>
            </div>
          )}

          {/* Tabs - Premium Glass Capsule */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200/50 w-full md:w-auto shadow-inner">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                    activeTab === tab.id
                      ? tab.id === 'pending'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                        : 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === tab.id 
                        ? tab.id === 'pending' ? 'bg-white text-amber-600' : 'bg-white text-emerald-600'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
              <p className="text-slate-500 font-bold text-sm">Memuat data verifikasi jadwal...</p>
            </div>
          ) : (
            <>
              {/* Tab: Pending */}
              {activeTab === 'pending' && (
                <div className="space-y-6">
                  {pendingSchedules.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-16 text-center shadow-sm max-w-2xl mx-auto my-6 animate-fade-in">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                        <Clock className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-black text-slate-800 mb-2">Tidak Ada Jadwal</h3>
                      <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                        Tidak ada pengajuan jadwal Asesmen Lapangan yang menunggu verifikasi saat ini.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {pendingSchedules.map(schedule => (
                        <div key={schedule.id} className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200 relative overflow-hidden shadow-sm hover:-translate-y-0.5 animate-fade-in">
                          {/* Top Border Status Line */}
                          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                          
                          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                            <div className="flex-1 space-y-4">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Menunggu Verifikasi
                                </span>
                                <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-slate-350" /> ID: {schedule.submission_id.substring(0, 18)}...
                                </span>
                              </div>

                              {/* Program Studi & Institusi */}
                              {schedule.programStudi && (
                                <div>
                                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{schedule.programStudi}</h3>
                                  <p className="text-slate-550 text-sm font-bold">{schedule.institusi}</p>
                                </div>
                              )}

                              {/* Assessors */}
                              {(schedule.assessor1Name || schedule.assessor2Name) && (
                                <div className="p-4.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl max-w-2xl">
                                  <p className="text-[10px] text-indigo-700 font-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Tim Asesor Ditugaskan
                                  </p>
                                  <div className="flex flex-col gap-1.5 text-slate-800 text-xs font-bold pl-1">
                                    {schedule.assessor1Name && <span>• {schedule.assessor1Name}</span>}
                                    {schedule.assessor2Name && <span>• {schedule.assessor2Name}</span>}
                                  </div>
                                </div>
                              )}

                              {/* Jadwal dan Detail Lokasi */}
                              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 max-w-3xl">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">Waktu Pelaksanaan</span>
                                  <div className="flex items-start gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-bold text-slate-800">{formatDate(schedule.proposed_date)}</p>
                                      {schedule.proposed_end_date && (
                                        <p className="text-xs text-slate-500 font-bold mt-1">s.d. {formatDate(schedule.proposed_end_date)}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">Tempat / Venue</span>
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm font-bold text-slate-700">{schedule.proposed_venue}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-slate-450 text-[10px] font-black uppercase tracking-wider pt-2">
                                <User className="w-3.5 h-3.5" />
                                <span>Diusulkan oleh: <strong className="text-indigo-650 font-black">{schedule.proposed_by_name || 'KEA'}</strong></span>
                              </div>
                            </div>

                            <button
                              onClick={() => { setSelectedSchedule(schedule); setShowModal(true); }}
                              className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-150 shadow-md shadow-indigo-100 hover:-translate-y-0.5 cursor-pointer active:scale-95"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Verifikasi Jadwal
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
                <div className="space-y-6">
                  {processedSchedules.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-16 text-center shadow-sm max-w-2xl mx-auto my-6 animate-fade-in">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                        <CheckCircle className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Data</h3>
                      <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                        Belum ada jadwal Asesmen Lapangan yang diproses/diverifikasi saat ini.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {processedSchedules.map(schedule => (
                        <div key={schedule.id} className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 hover:shadow-md hover:border-slate-350 transition-all duration-200 relative overflow-hidden shadow-sm hover:-translate-y-0.5 animate-fade-in">
                          {/* Top Border Status Line */}
                          <div className={`absolute top-0 left-0 w-full h-1 ${
                            schedule.status === 'approved' ? 'bg-emerald-600' : 'bg-rose-600'
                          }`} />

                          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                            <div className="flex-1 space-y-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                  schedule.status === 'approved' 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                    : 'bg-rose-50 border-rose-200 text-rose-800'
                                }`}>
                                  {schedule.status === 'approved' ? (
                                    <><CheckCircle className="w-3 h-3" /> Disetujui</>
                                  ) : (
                                    <><XCircle className="w-3 h-3" /> Ditolak</>
                                  )}
                                </span>
                                <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-slate-350" /> ID: {schedule.submission_id.substring(0, 18)}...
                                </span>
                              </div>

                              {/* Program Studi & Institusi */}
                              {schedule.programStudi && (
                                <div>
                                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{schedule.programStudi}</h3>
                                  <p className="text-slate-550 text-sm font-bold">{schedule.institusi}</p>
                                </div>
                              )}

                              {/* Jadwal dan Detail Lokasi */}
                              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 max-w-3xl">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">Waktu Pelaksanaan</span>
                                  <div className="flex items-start gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-bold text-slate-800">{formatDate(schedule.proposed_date)}</p>
                                      {schedule.proposed_end_date && (
                                        <p className="text-xs text-slate-500 font-bold mt-1">s.d. {formatDate(schedule.proposed_end_date)}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">Tempat / Venue</span>
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm font-bold text-slate-700">{schedule.proposed_venue}</p>
                                  </div>
                                </div>
                              </div>

                              {schedule.approval_notes && (
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-2xl">
                                  <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider mb-1">Catatan Verifikator</p>
                                  <p className="text-sm font-bold text-slate-750 leading-relaxed">{schedule.approval_notes}</p>
                                </div>
                              )}

                              {schedule.status === 'approved' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const token = localStorage.getItem('token');
                                      const res = await fetch(`${API_BASE_URL}/al-schedule/generate-letter/${schedule.submission_id}`, {
                                        method: 'POST',
                                        headers: { 
                                          Authorization: `Bearer ${token}`,
                                          'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ letterNumber: `ST/${schedule.submission_id.substring(0,8).toUpperCase()}` })
                                      });
                                      
                                      if (res.ok) {
                                        const blob = await res.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `Surat_Tugas_${schedule.submission_id}.pdf`;
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                      } else {
                                        alert('Gagal mendownload Surat Tugas');
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      alert('Error downloading file');
                                    }
                                  }}
                                  className="flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-850 transition-all uppercase tracking-wider pt-2 cursor-pointer hover:underline"
                                >
                                  <FileText className="w-4 h-4" />
                                  Download Surat Tugas (PDF)
                                </button>
                              )}
                            </div>

                            <div className="flex flex-col items-start lg:items-end justify-between gap-4 h-full lg:text-right border-l-0 lg:border-l border-slate-100 lg:pl-6 pt-4 lg:pt-0">
                              <div>
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Verifikator</span>
                                <span className="text-sm font-bold text-slate-800">{schedule.approved_by_name || 'Sekretariat'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Tanggal Proses</span>
                                <span className="text-xs font-semibold text-slate-500">{formatDate(schedule.approved_at)}</span>
                              </div>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-lg w-full p-8 flex flex-col">
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3 tracking-tight">
              <Calendar className="w-6 h-6 text-indigo-600" />
              Verifikasi Pengajuan Jadwal AL
            </h2>
            
            <div className="mb-6 p-5 bg-slate-50/70 border border-slate-200/50 rounded-xl space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">ID Pengajuan</span>
                <span className="font-bold text-slate-700 text-xs">{selectedSchedule.submission_id}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Waktu Rencana</span>
                  <div className="flex items-center gap-2 text-slate-800 mt-1">
                    <Calendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span className="font-bold text-sm">{formatDate(selectedSchedule.proposed_date)}</span>
                  </div>
                </div>
                
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Tempat</span>
                  <div className="flex items-center gap-2 text-slate-800 mt-1">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="font-bold text-sm">{selectedSchedule.proposed_venue}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                Catatan Verifikasi (Opsional)
              </label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Berikan catatan persetujuan atau penolakan jadwal..."
                rows={3}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-700 placeholder-slate-400 font-semibold text-sm outline-none transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleDecision(false)}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-white hover:bg-rose-50/50 border border-rose-200 text-rose-650 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Tolak Jadwal
              </button>
              <button
                onClick={() => handleDecision(true)}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-100 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {submitting ? 'Memproses...' : 'Setujui Jadwal'}
              </button>
            </div>
            
            <button
              onClick={() => { setShowModal(false); setSelectedSchedule(null); setDecisionNotes(''); }}
              className="mt-4 py-2 text-slate-450 hover:text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
