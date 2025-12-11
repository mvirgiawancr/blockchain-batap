import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { ClipboardCheck, Search, Eye, TrendingUp, Calendar, Award, CheckCircle } from 'lucide-react';

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
      const token = localStorage.getItem('token');
      const response = await fetch(`/kea/monitoring', {
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
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('kea')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <ClipboardCheck className="w-8 h-8 text-blue-600" />
              Monitoring Penilaian
            </h1>
            <p className="text-gray-600">Pantau progress penilaian akreditasi oleh asesor</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan program studi atau nama asesor..."
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
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Assignments Table */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Program Studi</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Asesor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tanggal Ditugaskan</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Progress</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Memuat data...
                      </td>
                    </tr>
                  ) : filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{assignment.programStudi}</p>
                            <p className="text-sm text-gray-600">{assignment.institusi}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-700">{assignment.assessorName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-600" />
                            <span className="text-gray-700">
                              {new Date(assignment.assignedAt).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                              assignment.status
                            )}`}
                          >
                            {assignment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 rounded-full h-2"
                                style={{ width: `${assignment.progress || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                              {assignment.progress || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedAssignment(assignment)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mx-auto block"
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
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Detail Penilaian</h2>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">Program Studi</p>
                      <p className="font-semibold text-gray-900">{selectedAssignment.programStudi}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">Asesor</p>
                      <p className="font-semibold text-gray-900">{selectedAssignment.assessorName}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">Status</p>
                      <span
                        className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          selectedAssignment.status
                        )}`}
                      >
                        {selectedAssignment.status}
                      </span>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <p className="text-sm text-gray-600 mb-2">Progress Penilaian</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 rounded-full h-3"
                            style={{ width: `${selectedAssignment.progress || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xl font-bold text-blue-600">
                          {selectedAssignment.progress || 0}%
                        </span>
                      </div>
                    </div>
                    {selectedAssignment.score && (
                      <div className="p-4 bg-green-50 rounded-xl flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Skor Akhir</p>
                          <p className="text-2xl font-bold text-green-600">{selectedAssignment.score}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Tutup
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
