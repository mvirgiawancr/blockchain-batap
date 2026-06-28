import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  ClipboardCheck,
  Settings,
  Award,
  Banknote,
  ShieldCheck,
  Bell,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Search,
  UserPlus
} from 'lucide-react';

const Sidebar = ({ user, onLogout, menuItems }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const defaultMenuItems = menuItems || [];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200/60 text-slate-800 flex flex-col h-[calc(100vh-5rem)] fixed left-0 top-20 z-40 transition-all duration-300">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/20">
        <div>
          <h1 className="text-xl font-black text-indigo-600 tracking-tight">
            AkreChain
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase mt-0.5">Accreditation Portal</p>
        </div>
      </div>


      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {defaultMenuItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={index}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-indigo-50/80 text-indigo-600 font-bold border-r-4 border-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-r-4 border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="text-sm">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-extrabold bg-indigo-600 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

// Menu presets for different roles
export const getMenuForRole = (role) => {
  const menus = {
    upps: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Banknote, label: 'Pembayaran', path: '/upps/payment' },
      { icon: FileText, label: 'Submission Saya', path: '/submissions' },
      { icon: ClipboardCheck, label: 'Status Akreditasi', path: '/status' },
      { icon: Users, label: 'Persetujuan Asesor', path: '/upps/assignments' },
      { icon: MapPin, label: 'Jadwal AL', path: '/upps/al-response' },
      { icon: Users, label: 'Info Asesor', path: '/assessors-info' },
      { icon: Bell, label: 'Notifikasi', path: '/notifications', badge: 0 },
      { icon: Search, label: 'Traceability Sertifikat', path: '/traceability' },
    ],
    sekretariat: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/sekretariat' },
      { icon: UserPlus, label: 'Pendaftaran UPPS', path: '/sekretariat/registrations' },
      { icon: Banknote, label: 'Verifikasi Pembayaran', path: '/sekretariat/payment' },
      { icon: Award, label: 'Verifikasi Jadwal AL', path: '/sekretariat/al-approval' },
      { icon: TrendingUp, label: 'Laporan', path: '/sekretariat/reports' },
      { icon: Award, label: 'Rilis Sertifikat', path: '/release' },
    ],
    kea: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/kea' },
      { icon: Users, label: 'Penugasan Asesor', path: '/kea/assignments' },
      { icon: AlertTriangle, label: 'Review Penolakan', path: '/kea/rejection-review' },
      { icon: ClipboardCheck, label: 'Monitoring AK', path: '/kea/monitoring' },
      { icon: TrendingUp, label: 'Analisis Konsistensi', path: '/kea/consistency' },
      { icon: Award, label: 'Penjadwalan AL', path: '/kea/al-scheduling' },
      { icon: FileText, label: 'Data Asesor', path: '/kea/assessors' },
    ],
    asesor: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/asesor' },
      { icon: ClipboardCheck, label: 'Penugasan Saya', path: '/asesor/assignments' },
      { icon: FileText, label: 'Riwayat Penilaian', path: '/asesor/history' },
      { icon: Bell, label: 'Notifikasi', path: '/asesor/notifications', badge: 0 },
    ],
    assessor: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/assessor' },
      { icon: ClipboardCheck, label: 'Penilaian', path: '/assessor/scoring' },
      { icon: FileText, label: 'Riwayat', path: '/assessor/history' },
    ],
    admin: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Users, label: 'Manajemen User', path: '/admin/users' },
      { icon: ShieldCheck, label: 'Batch Akreditasi', path: '/admin/batches' },
      { icon: TrendingUp, label: 'Analytics', path: '/admin/analytics' },
      { icon: Settings, label: 'Sistem', path: '/admin/system' },
    ],
    majelis: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/majelis' },
      { icon: Award, label: 'Keputusan Akreditasi', path: '/majelis/decisions' },
    ],
  };

  // Update KEA menu to include Verification
  if (menus.kea) {
     const hasVerification = menus.kea.find(m => m.path === '/verification');
     if (!hasVerification) {
        // Insert after AL Scheduling
        const alIndex = menus.kea.findIndex(m => m.path === '/kea/al-scheduling');
        if (alIndex !== -1) {
            menus.kea.splice(alIndex + 1, 0, { icon: FileCheck, label: 'Verifikasi Hasil AL', path: '/verification' });
        } else {
            menus.kea.push({ icon: FileCheck, label: 'Verifikasi Hasil AL', path: '/verification' });
        }
     }
  }

  return menus[role] || menus.upps;
};

export default Sidebar;
