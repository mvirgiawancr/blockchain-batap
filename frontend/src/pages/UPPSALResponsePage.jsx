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
      return { label: 'Sudah Direspon', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
    }
    if (schedule.hasExecution) {
      return { label: 'Menunggu Respon UPPS', bg: 'bg-amber-100', text: 'text-amber-800', icon: Send };
    }
    if (schedule.status === 'approved') {
      return { label: 'Jadwal Disetujui', bg: 'bg-blue-100', text: 'text-blue-800', icon: Calendar };
    }
    return { label: schedule.status, bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock };
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('upps')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <MapPin className="w-8 h-8 text-amber-500" />
                Jadwal Asesmen Lapangan
              </h1>
              <p className="text-gray-600 mt-1">Lihat jadwal AL dan berikan tanggapan terhadap temuan asesor</p>
            </div>
            <button
              onClick={fetchSchedules}
              className="p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </header>

          {/* Content */}
          {loading ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Memuat data jadwal AL...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
              <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum Ada Jadwal AL</h3>
              <p className="text-gray-500">Belum ada jadwal Asesmen Lapangan yang disetujui untuk submission Anda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule, idx) => {
                const statusInfo = getStatusInfo(schedule);
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={idx} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {schedule.program_name || schedule.submission_id}
                        </h3>
                        <p className="text-gray-600 text-sm">{schedule.institution_name || ''}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${statusInfo.bg} ${statusInfo.text}`}>
                        <StatusIcon className="w-4 h-4" />
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Tanggal AL</p>
                        <p className="text-sm font-semibold">{formatDate(schedule.proposed_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">s.d</p>
                        <p className="text-sm font-semibold">{formatDate(schedule.proposed_end_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tempat</p>
                        <p className="text-sm font-semibold">{schedule.proposed_venue || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Submission ID</p>
                        <p className="text-sm font-mono">{schedule.submission_id?.substring(0, 8)}...</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {schedule.hasExecution && !schedule.hasResponse && (
                        <button
                          onClick={() => navigate(`/al-response/${schedule.submission_id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          <Send className="w-4 h-4" />
                          Respon Temuan AL
                        </button>
                      )}
                      {schedule.hasResponse && (
                        <button
                          onClick={() => navigate(`/al-response/${schedule.submission_id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          Lihat Tanggapan
                        </button>
                      )}
                      {!schedule.hasExecution && (
                        <span className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 italic">
                          <Clock className="w-4 h-4" />
                          Menunggu Asesor melaksanakan AL
                        </span>
                      )}
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
