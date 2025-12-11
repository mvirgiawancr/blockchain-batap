import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Users, Search, Star, Award, BookOpen, Mail, Phone, MapPin, Calendar } from 'lucide-react';

const AssessorsInfoPage = ({ user }) => {
  const navigate = useNavigate();
  const [assessors, setAssessors] = useState([]);
  const [filteredAssessors, setFilteredAssessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssessor, setSelectedAssessor] = useState(null);

  useEffect(() => {
    loadAssessors();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAssessors(assessors);
    } else {
      const filtered = assessors.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.expertise.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.institution.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAssessors(filtered);
    }
  }, [searchQuery, assessors]);

  const loadAssessors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/assessors`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssessors(Array.isArray(data) ? data : []);
        setFilteredAssessors(Array.isArray(data) ? data : []);
      } else {
        setAssessors([]);
        setFilteredAssessors([]);
      }
    } catch (error) {
      console.error('Error loading assessors:', error);
      setAssessors([]);
      setFilteredAssessors([]);
    } finally {
      setLoading(false);
    }
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              Informasi Asesor
            </h1>
            <p className="text-gray-600">Daftar asesor yang tersedia untuk proses akreditasi</p>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari asesor berdasarkan nama, keahlian, atau institusi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Assessors Grid */}
          {loading ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600">Memuat data asesor...</p>
            </div>
          ) : filteredAssessors.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchQuery ? 'Tidak ada hasil' : 'Belum ada asesor'}
              </h3>
              <p className="text-gray-500">
                {searchQuery ? 'Coba kata kunci lain' : 'Belum ada asesor terdaftar di sistem'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssessors.map((assessor) => (
                <div
                  key={assessor.id}
                  onClick={() => setSelectedAssessor(assessor)}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold text-gray-700">
                        {assessor.rating || '5.0'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {assessor.name || assessor.fullName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{assessor.institution}</p>

                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">{assessor.expertise}</span>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {assessor.totalAssignments || 0} Penugasan
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assessor Detail Modal */}
          {selectedAssessor && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Award className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {selectedAssessor.name || selectedAssessor.fullName}
                        </h2>
                        <p className="text-gray-600">{selectedAssessor.institution}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedAssessor(null)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Keahlian</p>
                        <p className="font-semibold text-gray-900">{selectedAssessor.expertise}</p>
                      </div>
                    </div>

                    {selectedAssessor.email && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                        <Mail className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-semibold text-gray-900">{selectedAssessor.email}</p>
                        </div>
                      </div>
                    )}

                    {selectedAssessor.phone && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                        <Phone className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600">Telepon</p>
                          <p className="font-semibold text-gray-900">{selectedAssessor.phone}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-sm text-gray-600">Rating</p>
                        <p className="font-semibold text-gray-900">{selectedAssessor.rating || '5.0'} / 5.0</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Penugasan</p>
                        <p className="font-semibold text-gray-900">{selectedAssessor.totalAssignments || 0} Penugasan</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedAssessor(null)}
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

export default AssessorsInfoPage;
