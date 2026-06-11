import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Users, Search, UserPlus, Edit, Trash2, Eye, Building, Mail, Phone, XCircle } from 'lucide-react';

const SekretariatUPPSPage = ({ user }) => {
  const navigate = useNavigate();
  const [upps, setUpps] = useState([]);
  const [filteredUpps, setFilteredUpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUpps, setSelectedUpps] = useState(null);

  useEffect(() => {
    loadUpps();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUpps(upps);
    } else {
      const filtered = upps.filter(
        (u) =>
          u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.institution?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUpps(filtered);
    }
  }, [searchQuery, upps]);

  const loadUpps = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/sekretariat/upps`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUpps(Array.isArray(data) ? data : []);
        setFilteredUpps(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading UPPS:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('sekretariat')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                <Users className="w-8 h-8 text-blue-600" />
                Manajemen UPPS
              </h1>
              <p className="text-gray-600">Kelola data Unit Pengelola Program Studi</p>
            </div>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold">
              <UserPlus className="w-5 h-5" />
              Tambah UPPS
            </button>
          </div>

          {/* Search */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari UPPS berdasarkan username, nama, atau institusi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* UPPS Table */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Username</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nama Lengkap</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Institusi</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total Submission</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Memuat data...
                      </td>
                    </tr>
                  ) : filteredUpps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        {searchQuery ? 'Tidak ada hasil' : 'Belum ada UPPS terdaftar'}
                      </td>
                    </tr>
                  ) : (
                    filteredUpps.map((upps) => (
                      <tr key={upps.username} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">{upps.username}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{upps.fullName || '-'}</td>
                        <td className="px-6 py-4 text-gray-700">{upps.institution || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                            {upps.totalSubmissions || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedUpps(upps)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit">
                              <Edit className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Modal */}
          {selectedUpps && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-3xl border border-slate-200/85 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col p-7 animate-scale-up">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
                    <Users className="w-6 h-6 text-indigo-655" />
                    Detail Pihak UPPS
                  </h2>
                  <button
                    onClick={() => setSelectedUpps(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 border-0 bg-transparent cursor-pointer"
                  >
                    <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-650" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50/70 border border-slate-200/50 rounded-xl shadow-inner-sm">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Username Akun</p>
                      <p className="text-sm font-black text-slate-800">{selectedUpps.username}</p>
                    </div>
                    <div className="p-4 bg-slate-50/70 border border-slate-200/50 rounded-xl shadow-inner-sm">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Nama Lengkap</p>
                      <p className="text-sm font-bold text-slate-700">{selectedUpps.fullName || '-'}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/70 border border-slate-200/50 rounded-xl flex items-center gap-3.5 shadow-inner-sm">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                      <Building className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Universitas / Institusi</p>
                      <p className="text-sm font-bold text-slate-700">{selectedUpps.institution || '-'}</p>
                    </div>
                  </div>

                  {selectedUpps.email && (
                    <div className="p-4 bg-slate-50/70 border border-slate-200/50 rounded-xl flex items-center gap-3.5 shadow-inner-sm">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <Mail className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Alamat Email Resmi</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedUpps.email}</p>
                      </div>
                    </div>
                  )}

                  {selectedUpps.phone && (
                    <div className="p-4 bg-slate-50/70 border border-slate-200/50 rounded-xl flex items-center gap-3.5 shadow-inner-sm">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <Phone className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Nomor Telepon Kontak</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedUpps.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-gradient-to-tr from-indigo-50 to-purple-50 border border-indigo-150 rounded-xl flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-[10px] text-indigo-950 font-black uppercase tracking-wider">Akreditasi Diajukan (Total Submission)</p>
                      <p className="text-xs font-semibold text-indigo-700/80 mt-0.5">Jumlah berkas pengajuan program studi pada blockchain</p>
                    </div>
                    <span className="px-3.5 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-base font-black rounded-lg shadow-sm">
                      {selectedUpps.totalSubmissions || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => setSelectedUpps(null)}
                    className="w-full py-3 px-4 bg-gradient-to-tr from-indigo-600 to-purple-650 hover:from-indigo-700 hover:to-purple-750 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer border-0 text-center"
                  >
                    Tutup Detail
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

export default SekretariatUPPSPage;
