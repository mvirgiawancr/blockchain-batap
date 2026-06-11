import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  Users, Search, RefreshCw, Award, GraduationCap, Star, BookOpen, 
  TrendingUp, Globe, Link2, CheckCircle, AlertCircle, Sparkles
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function KEAAssessorsPage({ user }) {
  const navigate = useNavigate();
  const [assessors, setAssessors] = useState([]);
  const [filteredAssessors, setFilteredAssessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingMap, setSyncingMap] = useState({});
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadAssessors();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAssessors(assessors);
      return;
    }

    const filtered = assessors.filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.institution && a.institution.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.programStudi && a.programStudi.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.expertise && a.expertise.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredAssessors(filtered);
  }, [searchQuery, assessors]);

  const loadAssessors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/assessors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (response.ok) {
        const result = await response.json();
        const list = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
        setAssessors(list);
        setFilteredAssessors(list);
      }
    } catch (error) {
      console.error('Error loading assessors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSingle = async (assessorId, assessorName) => {
    setSyncingMap(prev => ({ ...prev, [assessorId]: true }));
    setNotification(null);
    try {
      const token = localStorage.getItem('token');
      const response = await apiPost(`/assessors/${assessorId}/sync-scholar`, token);
      
      if (response.ok) {
        const result = await response.json();
        setNotification({
          type: 'success',
          text: `Data akademik ${assessorName} berhasil disinkronisasi live dari Semantic Scholar!`
        });
        loadAssessors(); // Reload the updated assessor list
      } else {
        const err = await response.json().catch(() => ({}));
        setNotification({
          type: 'error',
          text: `Gagal sinkronisasi: ${err.message || 'Asesor tidak ditemukan di Semantic Scholar'}`
        });
      }
    } catch (error) {
      console.error('Error syncing assessor:', error);
      setNotification({ type: 'error', text: 'Koneksi gagal atau server terputus' });
    } finally {
      setSyncingMap(prev => ({ ...prev, [assessorId]: false }));
    }
  };

  const handleSyncAll = async () => {
    setSyncAllLoading(true);
    setNotification(null);
    try {
      const token = localStorage.getItem('token');
      // Trigger background populate/sync
      const response = await apiPost('/assessors/populate-research-areas', token);
      
      if (response.ok) {
        setNotification({
          type: 'success',
          text: 'Berhasil melakukan sinkronisasi massal seluruh profil dan kepakaran penelitian asesor!'
        });
        loadAssessors();
      }
    } catch (error) {
      console.error('Error syncing all:', error);
      setNotification({ type: 'error', text: 'Koneksi gagal saat sinkronisasi massal' });
    } finally {
      setSyncAllLoading(false);
    }
  };

  const apiPost = async (path, token) => {
    return fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
  };

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
          <header className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-650 shadow-sm shadow-purple-100/50">
                  <Users className="w-5 h-5" />
                </div>
                Database Profil Asesor
              </h1>
              <p className="text-slate-550 text-sm font-semibold mt-1">
                Kelola profil kepakaran, h-index scholar, serta jumlah publikasi dari database tim asesor LAM-TEK
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleSyncAll}
                disabled={syncAllLoading || loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-750 text-white shadow-md hover:shadow-lg disabled:from-slate-200 disabled:to-slate-300 font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
              >
                <Sparkles className={`w-4 h-4 ${syncAllLoading ? 'animate-spin' : ''}`} />
                {syncAllLoading ? 'Sinkronisasi...' : 'Sinkronisasi Massal'}
              </button>
              <button
                onClick={loadAssessors}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-650 hover:text-purple-600 font-bold text-xs cursor-pointer active:scale-95"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </header>

          {/* Notification banner */}
          {notification && (
            <div className={`rounded-xl p-4 border animate-fade-in ${
              notification.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
              'bg-rose-50 border-rose-250 text-rose-800'
            }`}>
              <p className="text-xs font-black uppercase tracking-wider">{notification.type === 'success' ? 'Sukses ✓' : 'Gagal ⚠'}</p>
              <p className="text-sm font-semibold mt-0.5">{notification.text}</p>
            </div>
          )}

          {/* Search bar - Glass Box */}
          <div className="glass-panel-light rounded-2xl p-6 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, institusi universitas, prodi, atau bidang kepakaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-800 text-sm font-semibold transition-all duration-200 outline-none focus:shadow-sm"
              />
            </div>
          </div>

          {/* Content Listing */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 glass-panel-light rounded-2xl shadow-sm animate-pulse">
              <Users className="w-12 h-12 text-purple-500 animate-bounce mb-3" />
              <p className="text-slate-550 font-bold text-sm">Menyelaraskan profil data asesor...</p>
            </div>
          ) : filteredAssessors.length === 0 ? (
            <div className="glass-panel-light rounded-2xl p-16 text-center shadow-sm max-w-2xl mx-auto my-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Asesor Tidak Ditemukan</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Tidak ada data profil tim asesor yang cocok dengan pencarian Anda saat ini.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {filteredAssessors.map((assessor) => {
                const syncing = syncingMap[assessor.id] || false;
                return (
                  <div
                    key={assessor.id}
                    className="glass-panel-light glass-panel-light-hover rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[300px]"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-indigo-500" />

                    <div>
                      {/* Name & Title */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-900 tracking-tight leading-snug group-hover:text-purple-650 transition-colors truncate">
                            {assessor.name}
                          </h3>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                            {assessor.institution || '-'}
                          </p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-650 shadow-inner flex-shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Stats Indicators */}
                      <div className="grid grid-cols-2 gap-3.5 mb-5">
                        <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-150/60 shadow-inner-sm text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Publikasi</p>
                          <p className="text-lg font-black text-blue-650 mt-0.5">{assessor.publicationCount || 0}</p>
                        </div>
                        <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-150/60 shadow-inner-sm text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">H-Index Scholar</p>
                          <p className="text-lg font-black text-indigo-650 mt-0.5">{assessor.hIndex || 0}</p>
                        </div>
                      </div>

                      {/* Expertise areas */}
                      <div className="space-y-1.5 mb-6">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Bidang Kepakaran Penelitian</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(assessor.researchAreas) && assessor.researchAreas.length > 0 ? (
                            assessor.researchAreas.slice(0, 3).map((area, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-purple-50 border border-purple-100 text-purple-750 uppercase"
                              >
                                {area}
                              </span>
                            ))
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-slate-50 border border-slate-200 text-slate-500 uppercase">
                              {assessor.programStudi || 'Umum'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-100/60 flex items-center justify-between mt-auto">
                      {/* Scholar Links */}
                      <div className="flex gap-2">
                        {assessor.googleScholarUrl && (
                          <a 
                            href={assessor.googleScholarUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-100 hover:bg-amber-50 text-slate-500 hover:text-amber-700 border border-slate-200/50 rounded-lg hover:border-amber-200 transition-all active:scale-90 flex items-center justify-center cursor-pointer"
                            title="Buka Google Scholar"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {assessor.scopusUrl && (
                          <a 
                            href={assessor.scopusUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-700 border border-slate-200/50 rounded-lg hover:border-blue-200 transition-all active:scale-90 flex items-center justify-center cursor-pointer"
                            title="Buka Scopus"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Sync Button */}
                      <button
                        onClick={() => handleSyncSingle(assessor.id, assessor.name)}
                        disabled={syncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase text-purple-650 hover:text-purple-750 transition-colors border border-purple-200 hover:border-purple-300 rounded-xl cursor-pointer bg-purple-50/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Scholar'}
                      </button>
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
