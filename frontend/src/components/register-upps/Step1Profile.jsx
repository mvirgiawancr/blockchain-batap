import { useEffect, useState } from 'react';
import { User, Mail, Phone, Lock, Building, UserCog, Check, X, Loader2, ArrowRight } from 'lucide-react';
import { checkUsernameAvailable } from '../../services/registration';

export default function Step1Profile({ formData, setFormData, institutions, onNext }) {
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!formData.username || formData.username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const t = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(formData.username);
        setUsernameAvailable(ok);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [formData.username]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const validate = () => {
    const errs = {};
    if (!formData.uppsName?.trim()) errs.uppsName = 'Wajib diisi';
    if (!formData.highestLeaderName?.trim()) errs.highestLeaderName = 'Wajib diisi';
    if (!formData.accountPjName?.trim()) errs.accountPjName = 'Wajib diisi';
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(formData.email || '')) errs.email = 'Format email tidak valid';
    if (!formData.institutionId) errs.institutionId = 'Pilih institusi';
    if (!formData.username || formData.username.length < 3) errs.username = 'Minimal 3 karakter';
    else if (usernameAvailable === false) errs.username = 'Username sudah dipakai';
    if (formData.password?.length < 8) errs.password = 'Minimal 8 karakter';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Password tidak cocok';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  // Custom select arrow SVG (same as Login.jsx:140)
  const SELECT_ARROW_BG = "bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_1rem_center] bg-no-repeat";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nama UPPS" icon={Building} name="uppsName" value={formData.uppsName || ''}
        onChange={handleChange} error={errors.uppsName} placeholder="Fakultas Teknik Universitas X" />

      <Field label="Nama Pimpinan Tertinggi UPPS" icon={User} name="highestLeaderName"
        value={formData.highestLeaderName || ''} onChange={handleChange} error={errors.highestLeaderName}
        placeholder="Dekan / Ketua / Direktur" />

      <Field label="Penanggung Jawab Akun" icon={UserCog} name="accountPjName"
        value={formData.accountPjName || ''} onChange={handleChange} error={errors.accountPjName}
        placeholder="Nama Kaprodi / Sekretaris" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Email" icon={Mail} type="email" name="email" value={formData.email || ''}
          onChange={handleChange} error={errors.email} placeholder="upps@kampus.ac.id" />
        <Field label="Telepon" icon={Phone} name="phone" value={formData.phone || ''}
          onChange={handleChange} placeholder="08xx-xxxx-xxxx" required={false} />
      </div>

      {/* Institution select — native, per user preference */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-700 ml-1">Institusi</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Building className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <select
            name="institutionId"
            value={formData.institutionId || ''}
            onChange={handleChange}
            className={`block w-full pl-10 pr-10 py-2.5 bg-white/70 border rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 text-sm transition-all outline-none cursor-pointer appearance-none ${SELECT_ARROW_BG}
              ${errors.institutionId ? 'border-rose-300' : 'border-slate-200'}`}
          >
            <option value="">-- Pilih Institusi --</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        {errors.institutionId && <p className="text-rose-700 text-xs font-semibold ml-1">{errors.institutionId}</p>}
      </div>

      {/* Username with availability indicator */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-700 ml-1">Username</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <User className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <input
            type="text" name="username" value={formData.username || ''} onChange={handleChange}
            className={`block w-full pl-10 pr-10 py-2.5 bg-white/70 border rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 placeholder-slate-400 text-sm transition-all outline-none
              ${errors.username ? 'border-rose-300' : 'border-slate-200'}`}
            placeholder="username login"
          />
          {/* Right-side availability indicator */}
          {checkingUsername && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
            </div>
          )}
          {!checkingUsername && usernameAvailable === true && formData.username?.length >= 3 && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Check className="h-4 w-4 text-emerald-500" />
            </div>
          )}
          {!checkingUsername && usernameAvailable === false && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <X className="h-4 w-4 text-rose-500" />
            </div>
          )}
        </div>
        {errors.username && <p className="text-rose-700 text-xs font-semibold ml-1">{errors.username}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Kata Sandi" icon={Lock} type="password" name="password"
          value={formData.password || ''} onChange={handleChange} error={errors.password}
          placeholder="min 8 karakter" />
        <Field label="Konfirmasi Kata Sandi" icon={Lock} type="password" name="confirmPassword"
          value={formData.confirmPassword || ''} onChange={handleChange} error={errors.confirmPassword}
          placeholder="ulangi sandi" />
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit"
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all duration-200 cursor-pointer shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200">
          Lanjut
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

function Field({ label, icon: Icon, error, required = true, hint, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-700 ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Icon className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        </div>
        <input
          {...props}
          className={`block w-full pl-10 pr-3 py-2.5 bg-white/70 border rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 placeholder-slate-400 text-sm transition-all outline-none
            ${error ? 'border-rose-300' : 'border-slate-200'}`}
        />
      </div>
      {error && <p className="text-rose-700 text-xs font-semibold ml-1">{error}</p>}
      {hint && !error && <p className="text-slate-500 text-xs ml-1">{hint}</p>}
    </div>
  );
}
