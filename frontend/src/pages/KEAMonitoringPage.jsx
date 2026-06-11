import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  ClipboardCheck, Search, Eye, TrendingUp, Calendar, Award, 
  CheckCircle, RefreshCw, X, AlertCircle, Clock, GraduationCap
} from 'lucide-react';

const KEAMonitoringPage = ({ user }) => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    let filtered = assignments;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (a) =>
          a.programStudi.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.assessorName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAssignments(filtered);
  }, [searchQuery, statusFilter, assignments]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/kea/monitoring`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(Array.isArray(data) ? data : []);
        setFilteredAssignments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-50 text-amber-800 border-amber-250',
      in_progress: 'bg-blue-50 text-blue-800 border-blue-200',
      completed: 'bg-emerald-50 text-emerald-800 border-emerald-250',
    };
    return colors[status] || 'bg-slate-50 text-slate-800 border-slate-200';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Menunggu',
      in_progress: 'Sedang Dinilai',
      completed: 'Selesai',
    };
    return labels[status] || status;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[600px] h-[600px] bg-indigo-200/10 rounded-full blur-[150px] pointer-events-none" />

      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('kea')}
      />

      <div className="flex-1 ml-64 overflow-auto relative z-10">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shadow-blue-100/50">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                Monitoring Penilaian
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">
                Pantau progress instrumen penilaian akreditasi oleh tim asesor secara langsung
              </p>
            </div>
            <button
              onClick={loadAssignments}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-blue-600 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>

          {/* Filters - Glass Box */}
          <div className="glass-panel-light rounded-2xl p-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-4.5">
              <div className="relative">
                <Search className="absolute left-4.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan program studi atau nama asesor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 text-sm font-semibold transition-all duration-200 outline-none focus:shadow-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 text-sm font-semibold transition-all duration-200 outline-none shadow-sm cursor-pointer"
              >
                <option value="all">Semua Status Kemajuan</option>
                <option value="pending">Belum Dimulai (Pending)</option>
                <option value="in_progress">Sedang Berjalan (In Progress)</option>
                <option value="completed">Sudah Selesai (Completed)</option>
              </select>
            </div>
          </div>

          {/* Assignments Table Wrapper */}
          <div className="glass-panel-light rounded-2xl shadow-sm overflow-hidden border border-slate-200/60">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200/60">
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-450 uppercase tracking-wider">Program Studi</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-450 uppercase tracking-wider">Asesor Terkait</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-450 uppercase tracking-wider">Tanggal Penugasan</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-450 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-450 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-4 text-center text-xs font-black text-slate-450 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150/60 bg-white/40">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                          <p className="text-slate-500 font-bold text-sm">Menyelaraskan data monitoring...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <AlertCircle className="w-10 h-10 text-slate-350" />
                          <p className="text-slate-450 font-bold text-sm">Tidak ada data monitoring ditemukan</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                        <td className="px-6 py-4.5">
                          <div className="min-w-[220px]">
                            <p className="font-black text-sm text-slate-900 leading-snug">{assignment.programStudi}</p>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                              {assignment.institusi}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                              <Award className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[180px]">
                              {assignment.assessorName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-650">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>
                              {new Date(assignment.assignedAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border shadow-inner-sm ${getStatusColor(
                              assignment.status
                            )}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              assignment.status === 'completed' ? 'bg-emerald-500' :
                              assignment.status === 'in_progress' ? 'bg-blue-500' : 'bg-amber-500'
                            }`} />
                            {getStatusLabel(assignment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-3 min-w-[120px]">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 shadow-inner-sm">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full h-2 transition-all duration-300"
                                style={{ width: `${assignment.progress || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-black text-slate-700 min-w-[32px] text-right">
                              {assignment.progress || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-center">
                          <button
                            onClick={() => setSelectedAssignment(assignment)}
                            className="p-2 text-slate-450 hover:text-blue-600 hover:bg-blue-50/80 rounded-xl transition-all duration-200 mx-auto block cursor-pointer active:scale-90"
                            title="Lihat Detail Penilaian"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Modal */}
          {selectedAssignment && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-fade-in">
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-650" />
                <div className="p-7 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shadow-blue-100/50">
                        <ClipboardCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Detail Rincian Penilaian</h2>
                        <p className="text-slate-500 text-xs font-semibold">Tinjau instrumen asesmen kecukupan asesor secara terperinci</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedAssignment(null)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl shadow-inner-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Program Studi / Jurusan</p>
                      <p className="font-black text-slate-855 text-sm leading-snug">{selectedAssignment.programStudi}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        {selectedAssignment.institusi}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl shadow-inner-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Identitas Asesor</p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                          AS
                        </div>
                        <p className="font-bold text-slate-800 text-xs">{selectedAssignment.assessorName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl shadow-inner-sm flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Status Kemajuan</p>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase border w-fit ${getStatusColor(
                            selectedAssignment.status
                          )}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            selectedAssignment.status === 'completed' ? 'bg-emerald-500' :
                            selectedAssignment.status === 'in_progress' ? 'bg-blue-500' : 'bg-amber-500'
                          }`} />
                          {getStatusLabel(selectedAssignment.status)}
                        </span>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl shadow-inner-sm flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Waktu Penugasan</p>
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(selectedAssignment.assignedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="p-4.5 bg-blue-50/40 border border-blue-150/60 rounded-xl shadow-inner-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Progress Keterisian Berkas</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-slate-100 rounded-full h-3 shadow-inner-sm">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full h-3 transition-all duration-300"
                            style={{ width: `${selectedAssignment.progress || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-lg font-black text-blue-650 min-w-[40px] text-right">
                          {selectedAssignment.progress || 0}%
                        </span>
                      </div>
                    </div>

                    {selectedAssignment.score && (
                      <div className="p-4 bg-emerald-50/50 border border-emerald-150 rounded-xl flex items-center gap-3.5 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Skor Total Evaluasi Kecukupan</p>
                          <p className="text-2xl font-black text-emerald-700 mt-0.5">{selectedAssignment.score.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="w-full mt-4 px-6 py-3 bg-gradient-to-tr from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white border border-slate-950/20 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
                  >
                    Tutup Rincian
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

export default KEAMonitoringPage;
