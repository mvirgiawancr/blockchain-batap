import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, Loader2, Briefcase } from 'lucide-react';
import { login } from '../services/auth';

const roleOptions = [
  { value: 'upps', label: 'UPPS (Program Studi)' },
  { value: 'sekretariat', label: 'Sekretariat Admin' },
  { value: 'kea', label: 'KEA (Koordinator Evaluasi)' },
  { value: 'asesor', label: 'Asesor' },
  { value: 'majelis', label: 'Majelis Akreditasi' },
  { value: 'admin', label: 'Administrator' }
];

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'upps'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ username: form.username, password: form.password });
      const { user, accessToken } = response.data || {};

      if (accessToken && user) {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        if (typeof onLogin === 'function') {
          onLogin(user);
        }
        const redirectMap = {
          upps: '/',
          admin: '/',
          sekretariat: '/sekretariat',
          assessor: '/assessor',
          kea: '/kea',
          asesor: '/asesor',
          majelis: '/majelis'
        };
        navigate(redirectMap[user.role] || '/', { replace: true });
      } else {
        setError('Gagal masuk. Periksa kembali kredensial Anda.');
      }
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-md">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">AkreChain</h1>
            <p className="text-gray-500 text-sm">Masuk ke Sistem Akreditasi LAM-TEK</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 ml-1">Nama Pengguna</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 text-sm transition-all"
                  placeholder="Masukkan nama pengguna"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 ml-1">Kata Sandi</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 ml-1">Peran</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm transition-all appearance-none"
                >
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Masuk
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Belum punya akun?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                Buat Akun
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
