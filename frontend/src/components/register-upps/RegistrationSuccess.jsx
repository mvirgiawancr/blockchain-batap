import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RegistrationSuccess({ result }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-tr from-emerald-50 via-white to-slate-100 p-4 overflow-hidden select-none">
      {/* Decorative spheres */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel-light rounded-2xl shadow-xl shadow-emerald-200/50 border border-emerald-200/80 overflow-hidden relative z-10">
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 shadow-sm mb-4 animate-fade-in">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pendaftaran Diterima!</h1>
          <p className="text-slate-600 text-xs mt-2 leading-relaxed">
            Pendaftaran akun UPPS Anda telah diterima dan sedang menunggu approval dari Sekretariat LAM Teknik.
            Anda akan menerima email pemberitahuan setelah proses review selesai.
          </p>

          <div className="mt-5 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nomor Referensi</p>
            <p className="text-xs text-slate-800 font-mono mt-1 break-all">{result?.requestId || '-'}</p>
          </div>

          <Link to="/login"
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all duration-200 cursor-pointer shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}
