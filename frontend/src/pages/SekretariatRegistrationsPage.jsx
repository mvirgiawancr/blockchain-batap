import { useEffect, useState } from 'react';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import RegistrationDetailModal from '../components/sekretariat/RegistrationDetailModal';
import { listRegistrations, getRegistrationDetail } from '../services/registration';
import { UserPlus, Loader2, Clock, CheckCircle2, XCircle, FileText } from 'lucide-react';

const STATUS_TABS = [
  { value: 'pending', label: 'Menunggu', icon: Clock, color: 'amber' },
  { value: 'approved', label: 'Disetujui', icon: CheckCircle2, color: 'emerald' },
  { value: 'rejected', label: 'Ditolak', icon: XCircle, color: 'rose' },
];

export default function SekretariatRegistrationsPage({ user }) {
  const [status, setStatus] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      setRequests(await listRegistrations(status));
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat data');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const openDetail = async (id) => {
    try {
      setSelected({ loading: true });
      const detail = await getRegistrationDetail(id);
      setSelected(detail);
    } catch (err) {
      setError('Gagal memuat detail');
      setSelected(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar user={user} menuItems={getMenuForRole(user?.role || 'sekretariat')} />

      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <UserPlus className="w-8 h-8 text-indigo-600" />
                Pendaftaran UPPS
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Review dan approval pendaftaran akun UPPS baru</p>
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 bg-white p-1 rounded-xl w-fit border border-slate-200/60 shadow-sm mb-6">
            {STATUS_TABS.map((t) => {
              const Icon = t.icon;
              const isActive = status === t.value;
              return (
                <button key={t.value} onClick={() => setStatus(t.value)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all
                    ${isActive ? `bg-${t.color}-50 text-${t.color}-700` : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-semibold">Tidak ada pendaftaran dengan status ini.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-4 font-black uppercase tracking-wider text-[10px]">UPPS</th>
                    <th className="text-left p-4 font-black uppercase tracking-wider text-[10px]">Institusi</th>
                    <th className="text-left p-4 font-black uppercase tracking-wider text-[10px]">Username</th>
                    <th className="text-left p-4 font-black uppercase tracking-wider text-[10px]">Diajukan</th>
                    <th className="text-left p-4 font-black uppercase tracking-wider text-[10px]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{r.upps_name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{r.email}</div>
                      </td>
                      <td className="p-4 text-slate-700">{r.institution_name}</td>
                      <td className="p-4 text-slate-700 font-mono text-[11px]">{r.username}</td>
                      <td className="p-4 text-slate-500">{new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="p-4">
                        <button onClick={() => openDetail(r.id)}
                          className="px-3 py-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-[11px] font-bold rounded-lg transition-colors">
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selected && !selected.loading && (
        <RegistrationDetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onAction={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
