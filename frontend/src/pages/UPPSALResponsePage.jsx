import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { MapPin, Calendar, Clock, CheckCircle, Send, RefreshCw, FileText, AlertTriangle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function UPPSALResponsePage({ user }) {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch approved and completed AL schedules
      const res = await fetch(`${API_BASE_URL}/al-schedule/list/approved`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let allSchedules = [];
      if (res.ok) {
        const data = await res.json();
        allSchedules = Array.isArray(data) ? data : (data.data || []);
      }

      // Check each schedule's execution status
      const schedulesWithStatus = await Promise.all(
        allSchedules.map(async (schedule) => {
          try {
            const execRes = await fetch(`${API_BASE_URL}/al-execution/${schedule.submission_id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (execRes.ok) {
              const execData = await execRes.json();
              return {
                ...schedule,
                hasExecution: !!execData.data?.alExecution,
                hasResponse: !!execData.data?.alResponse
              };
            }
          } catch (e) { /* ignore */ }
          return { ...schedule, hasExecution: false, hasResponse: false };
        })
      );

      setSchedules(schedulesWithStatus);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
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

  const getStatusInfo = (schedule) => {
    if (schedule.hasResponse) {
      return { label: 'Tanggapan Terkirim', bg: 'bg-emerald-50 text-emerald-800 border-emerald-250', icon: CheckCircle };
    }
    if (schedule.hasExecution) {
      return { label: 'Menunggu Tanggapan Anda', bg: 'bg-amber-50 text-amber-800 border-amber-250', icon: Send };
    }
    if (schedule.status === 'approved') {
      return { label: 'Jadwal Terjadwal Sah', bg: 'bg-indigo-50 text-indigo-800 border-indigo-250', icon: Calendar };
    }
    return { label: schedule.status, bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock };
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('upps')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <MapPin className="w-8 h-8 text-indigo-650" />
                Jadwal Asesmen Lapangan
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Pantau jadwal AL dari KEA dan tanggapi berita acara temuan lapangan</p>
            </div>
            <button
              onClick={fetchSchedules}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-600 hover:text-indigo-600 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </header>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50">
              <Clock className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
              <p className="text-slate-500 font-bold text-sm">Memuat data jadwal AL...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-12 text-center shadow-sm max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                <AlertTriangle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Jadwal AL</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Belum ada jadwal Asesmen Lapangan yang disetujui oleh KEA untuk pengajuan akreditasi Anda saat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {schedules.map((schedule, idx) => {
                const statusInfo = getStatusInfo(schedule);
                const StatusIcon = statusInfo.icon;

                return (
                  <div 
                    key={idx} 
                    className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col relative animate-fade-in"
                  >
                    {/* Top Status Accent Border */}
                    <div className={`h-1.5 w-full ${
                      schedule.hasResponse ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                      schedule.hasExecution ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                      schedule.status === 'approved' ? 'bg-gradient-to-r from-indigo-500 to-blue-500' :
                      'bg-gradient-to-r from-slate-400 to-slate-500'
                    }`} />

                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5 border-b border-slate-100 pb-4">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                            {schedule.program_name || schedule.submission_id}
                          </h3>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">{schedule.institution_name || ''}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wide border uppercase shadow-sm inline-flex items-center gap-1.5 ${statusInfo.bg} ${statusInfo.text}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 mb-5">
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">Mulai Kunjungan</p>
                          <p className="text-xs font-bold text-slate-850">{formatDate(schedule.proposed_date)}</p>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">Selesai Kunjungan</p>
                          <p className="text-xs font-bold text-slate-850">{formatDate(schedule.proposed_end_date)}</p>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">Tempat Pelaksanaan</p>
                          <p className="text-xs font-bold text-slate-800 truncate">{schedule.proposed_venue || 'Daring / Online'}</p>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">ID Pengajuan</p>
                          <p className="text-xs font-black text-slate-700 font-mono bg-white px-2 py-0.5 border border-slate-205 rounded inline-block shadow-sm">
                            {schedule.submission_id?.substring(0, 8)}...
                          </p>
                        </div>
                      </div>

                      {/* Card Action Row */}
                      <div className="flex gap-3 border-t border-slate-100 pt-4 mt-3">
                        {schedule.hasExecution && !schedule.hasResponse && (
                          <button
                            onClick={() => navigate(`/al-response/${schedule.submission_id}`)}
                            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-tr from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition-all duration-150 font-black text-xs cursor-pointer shadow-md shadow-emerald-100/60 active:scale-95"
                          >
                            <Send className="w-4 h-4" />
                            RESPON TEMUAN ASESMEN LAPANGAN
                          </button>
                        )}
                        {schedule.hasResponse && (
                          <button
                            onClick={() => navigate(`/al-response/${schedule.submission_id}`)}
                            className="flex items-center gap-1.5 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all duration-150 font-bold text-xs cursor-pointer active:scale-95 shadow-sm"
                          >
                            <FileText className="w-4 h-4 text-slate-500" />
                            LIHAT TANGGAPAN ANDA
                          </button>
                        )}
                        {!schedule.hasExecution && (
                          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200/40 rounded-xl text-xs font-semibold text-slate-450 shadow-inner w-full">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>Menunggu Asesor melaksanakan kunjungan lapangan & mengunggah berita acara asesmen</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
