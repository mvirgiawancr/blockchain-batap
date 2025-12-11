import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  ClipboardCheck, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Award,
  Banknote,
  ShieldCheck,
  UserCircle,
  Bell,
  FileCheck,
  TrendingUp
} from 'lucide-react';

const Sidebar = ({ user, onLogout, menuItems }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const defaultMenuItems = menuItems || [];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white transition-all duration-300 flex flex-col h-screen fixed left-0 top-0 shadow-2xl z-50`}>
      
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                LAM-TEK 2025
              </h1>
              <p className="text-xs text-gray-400 mt-1">Blockchain Accreditation</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-300" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.fullName || user?.username || 'User'}
              </p>
              <p className="text-xs text-gray-400 capitalize truncate">
                {user?.role || 'Role'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {defaultMenuItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={index}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`} />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <button
          onClick={() => handleNavigation('/settings')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
          title={isCollapsed ? 'Settings' : ''}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Pengaturan</span>}
        </button>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all"
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Keluar</span>}
        </button>
      </div>
    </div>
  );
};

// Menu presets for different roles
export const getMenuForRole = (role) => {
  const menus = {
    upps: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: FileText, label: 'Submission Saya', path: '/submissions' },
      { icon: ClipboardCheck, label: 'Status Akreditasi', path: '/status' },
      { icon: Users, label: 'Persetujuan Asesor', path: '/upps/assignments' },
      { icon: Users, label: 'Info Asesor', path: '/assessors-info' },
      { icon: Bell, label: 'Notifikasi', path: '/notifications', badge: 0 },
    ],
    sekretariat: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/sekretariat' },
      { icon: FileCheck, label: 'Verifikasi Dokumen', path: '/sekretariat/verify' },
      { icon: Users, label: 'Manajemen UPPS', path: '/sekretariat/upps' },
      { icon: Banknote, label: 'Verifikasi Pembayaran', path: '/sekretariat/payment' },
      { icon: TrendingUp, label: 'Laporan', path: '/sekretariat/reports' },
    ],
    kea: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/kea' },
      { icon: Users, label: 'Penugasan Asesor', path: '/kea/assignments' },
      { icon: ClipboardCheck, label: 'Monitoring AK', path: '/kea/monitoring' },
      { icon: TrendingUp, label: 'Analisis Konsistensi', path: '/kea/consistency' },
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
  };

  return menus[role] || menus.upps;
};

export default Sidebar;
