import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Users, Search, Star, Award, BookOpen, Mail, Phone, MapPin, Calendar, X } from 'lucide-react';

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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('upps')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 mb-2 tracking-tight">
              <Users className="w-8 h-8 text-indigo-650" />
              Informasi Asesor
            </h1>
            <p className="text-slate-500 text-sm font-semibold mt-1">Daftar lengkap asesor LAM-TEK terdaftar dan kompetensi keahlian</p>
          </div>

          {/* Search Bar */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 mb-6 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari nama asesor, bidang keahlian, atau asal institusi universitas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-sm font-semibold transition-all duration-205 shadow-inner-sm"
              />
            </div>
          </div>

          {/* Assessors Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50">
              <Users className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
              <p className="text-slate-500 font-bold text-sm">Memuat data tim asesor...</p>
            </div>
          ) : filteredAssessors.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-12 text-center shadow-sm max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">
                {searchQuery ? 'Tidak ada hasil' : 'Belum ada asesor'}
              </h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                {searchQuery ? 'Coba kata kunci pencarian lain' : 'Belum ada asesor yang terdaftar dalam sistem akreditasi saat ini'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {filteredAssessors.map((assessor) => (
                <div
                  key={assessor.id}
                  onClick={() => setSelectedAssessor(assessor)}
                  className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 hover:border-indigo-350/80 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col relative overflow-hidden shadow-sm hover:-translate-y-0.5"
                >
                  {/* Left status color accent */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-blue-500" />
                  
                  <div className="pl-2">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm border border-indigo-200/20">
                        <Award className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 rounded-full shadow-sm">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-black text-amber-800">
                          {assessor.rating || '5.0'}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-black text-slate-900 mb-1 leading-snug tracking-tight truncate">
                      {assessor.name || assessor.fullName}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 truncate mb-3">{assessor.institution}</p>

                    <div className="flex items-center gap-2 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100/50">
                      <BookOpen className="w-4 h-4 text-indigo-650 flex-shrink-0" />
                      <span className="text-xs font-bold text-slate-700 truncate">{assessor.expertise}</span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                      <span>Akreditasi LAM-TEK</span>
                      <span className="text-indigo-650 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 font-black">
                        {assessor.totalAssignments || 0} Penugasan
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assessor Detail Modal */}
          {selectedAssessor && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-500" />
                <div className="p-7">
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center shadow-md border border-indigo-100/20">
                        <Award className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                          {selectedAssessor.name || selectedAssessor.fullName}
                        </h2>
                        <p className="text-xs font-semibold text-slate-500 mt-1">{selectedAssessor.institution}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedAssessor(null)}
                      className="p-1.5 hover:bg-slate-150 hover:text-slate-800 rounded-xl transition-colors text-slate-400 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3.5 p-4 bg-indigo-50/30 border border-indigo-100/50 rounded-xl">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Bidang Keahlian Asesor</p>
                        <p className="text-sm font-black text-indigo-950 mt-0.5">{selectedAssessor.expertise}</p>
                      </div>
                    </div>

                    {selectedAssessor.email && (
                      <div className="flex items-center gap-3.5 p-4 bg-slate-50/80 border border-slate-200/50 rounded-xl">
                        <Mail className="w-5 h-5 text-slate-450" />
                        <div>
                          <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Email Kontak</p>
                          <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedAssessor.email}</p>
                        </div>
                      </div>
                    )}

                    {selectedAssessor.phone && (
                      <div className="flex items-center gap-3.5 p-4 bg-slate-50/80 border border-slate-200/50 rounded-xl">
                        <Phone className="w-5 h-5 text-slate-450" />
                        <div>
                          <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Nomor Telepon</p>
                          <p className="text-sm font-bold text-slate-850 mt-0.5">{selectedAssessor.phone}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-3.5 p-4 bg-slate-50/85 border border-slate-200/50 rounded-xl">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <div>
                          <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Rating Asesor</p>
                          <p className="text-sm font-black text-slate-800 mt-0.5">{selectedAssessor.rating || '5.0'} / 5.0</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 p-4 bg-slate-50/85 border border-slate-200/50 rounded-xl">
                        <Calendar className="w-5 h-5 text-slate-450" />
                        <div>
                          <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Total Penugasan</p>
                          <p className="text-sm font-black text-indigo-650 font-heading mt-0.5">{selectedAssessor.totalAssignments || 0} Kali</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedAssessor(null)}
                    className="mt-6 w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer border border-slate-200/40"
                  >
                    Tutup Informasi
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
