import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Hide navbar on login and register pages to prevent viewport overflow and scrollbars
  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }
  
  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof onLogout === 'function') {
      onLogout();
    }
    navigate('/login');
  };
  
  return (
    <nav className="glass-panel-light border-b border-slate-200/60 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-4">
            {/* IPB University Logo */}
            <a 
              href="https://www.ipb.ac.id/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="cursor-pointer hover:opacity-90 transition-opacity"
            >
              <img 
                src="https://www.ipb.ac.id/wp-content/uploads/2023/12/Logo-IPB-University_Horizontal.png" 
                alt="IPB University" 
                className="h-10 object-contain"
              />
            </a>
            
            {/* UNIKOM Logo */}
            <a 
              href="https://www.unikom.ac.id/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="cursor-pointer hover:opacity-90 transition-opacity"
            >
              <img 
                src="/UNIKOM-LOGO-2025-High-Resolution-2048x2048.webp" 
                alt="UNIKOM" 
                className="h-10 object-contain"
              />
            </a>
            
            {/* BATAP PII Logo */}
            <a 
              href="#" 
              target="_blank" 
              rel="noopener noreferrer"
              className="cursor-pointer hover:opacity-90 transition-opacity"
            >
              <img 
                src="/batap.jpg" 
                alt="BATAP PII" 
                className="h-10 object-contain rounded-md shadow-sm border border-slate-100"
              />
            </a>
            
            {/* AkreChain Brand */}
            <div className="border-l border-slate-200/80 pl-4 ml-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">AkreChain</h2>
              <p className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase">Blockchain Accreditation</p>
            </div>
          </div>
          
          <div className="flex gap-3 items-center">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700 hidden sm:inline px-3 py-1.5 bg-slate-100/60 rounded-full border border-slate-200/50">
                  {user.fullName || user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200/60 hover:border-rose-600 transition-all duration-200 inline-flex items-center gap-2 cursor-pointer shadow-sm shadow-rose-100"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer shadow-sm ${
                    isActive('/login')
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 shadow-lg'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent'
                  }`}
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer shadow-sm border ${
                    isActive('/register')
                      ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-100 shadow-lg'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
