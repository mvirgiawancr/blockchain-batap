import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Lock, Building, GraduationCap, Briefcase, ArrowRight, Loader2 } from 'lucide-react';

const mspOrgOptions = [
  { value: 'UPPSMSP', label: 'UPPS MSP (Program Studi)' },
  { value: 'SekadminMSP', label: 'Sekretariat Admin MSP' },
  { value: 'SekkeuMSP', label: 'Sekretariat Keuangan MSP' },
  { value: 'KEAMSP', label: 'KEA MSP (Koordinator Evaluasi)' },
  { value: 'AsesorMSP', label: 'Asesor MSP' },
  { value: 'MajelisMSP', label: 'Majelis Akreditasi MSP' }
];

const roleOptions = [
  { value: 'upps', label: 'UPPS (Program Studi)' },
  { value: 'sekretariat', label: 'Sekretariat Admin' },
  { value: 'kea', label: 'KEA (Koordinator Evaluasi)' },
  { value: 'asesor', label: 'Asesor' },
  { value: 'majelis', label: 'Majelis Akreditasi' },
  { value: 'admin', label: 'Administrator' }
];

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'upps',
    institution: '',
    programStudi: '',
    mspOrg: 'UPPSMSP'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:3000/api/v1/auth/register', formData);
      if (response.data.success) {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-tr from-slate-50 via-indigo-50/20 to-slate-100 p-4 overflow-hidden select-none">
      
      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg glass-panel-light rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden relative z-10">
        <div className="p-6">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Buat Akun</h1>
            <p className="text-slate-500 text-xs font-semibold mt-0.5">Bergabung dengan Sistem Akreditasi LAM-TEK</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-semibold animate-fade-in">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Scrollable form fields wrapper to guarantee non-scrollable page viewport */}
            <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3.5 custom-scrollbar">
              
              {/* Row 1: Name and Username */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 ml-1">Nama Lengkap</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      required
                      className="block w-full pl-9 pr-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 placeholder-slate-400 text-sm transition-all outline-none"
                      placeholder="Nama Lengkap"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 ml-1">Nama Pengguna</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="username"
                      required
                      className="block w-full pl-9 pr-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 placeholder-slate-400 text-sm transition-all outline-none"
                      placeholder="username"
                      value={formData.username}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Password (Full Width) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 ml-1">Kata Sandi</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    className="block w-full pl-9 pr-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 placeholder-slate-400 text-sm transition-all outline-none"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Row 3: Role and MSP Org */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 ml-1">Peran</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Briefcase className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <select
                      name="role"
                      className="block w-full pl-9 pr-8 py-2.5 bg-white/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 text-sm transition-all outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_0.8rem_center] bg-no-repeat"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      {roleOptions.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 ml-1">Organisasi (MSP)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <select
                      name="mspOrg"
                      className="block w-full pl-9 pr-8 py-2.5 bg-white/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 text-sm transition-all outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_0.8rem_center] bg-no-repeat"
                      value={formData.mspOrg}
                      onChange={handleChange}
                    >
                      {mspOrgOptions.map((org) => (
                        <option key={org.value} value={org.value}>{org.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 4: Institution and Program Studi */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 ml-1">Institusi</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="institution"
                      className="block w-full pl-9 pr-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 placeholder-slate-400 text-sm transition-all outline-none"
                      placeholder="e.g. UNIKOM / IPB"
                      value={formData.institution}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 ml-1">Program Studi</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <GraduationCap className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="programStudi"
                      className="block w-full pl-9 pr-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 placeholder-slate-400 text-sm transition-all outline-none"
                      placeholder="e.g. Teknik Informatika"
                      value={formData.programStudi}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all duration-200 cursor-pointer shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Daftarkan Akun
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs font-semibold text-slate-500">
              Sudah punya akun?{' '}
              <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer">
                Masuk Disini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
