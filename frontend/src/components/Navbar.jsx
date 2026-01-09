import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Award, LogOut } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  
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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-4">
            {/* IPB University Logo */}
            <a href="https://www.ipb.ac.id/" target="_blank" rel="noopener noreferrer">
              <img 
                src="https://www.ipb.ac.id/wp-content/uploads/2023/12/Logo-IPB-University_Horizontal.png" 
                alt="IPB University" 
                className="h-12 object-contain"
              />
            </a>
            {/* UNIKOM Logo */}
            <a href="https://www.unikom.ac.id/" target="_blank" rel="noopener noreferrer">
              <img 
                src="/UNIKOM-LOGO-2025-High-Resolution-2048x2048.webp" 
                alt="UNIKOM" 
                className="h-12 object-contain"
              />
            </a>
            {/* BATAP PII Logo */}
            <a href="#" target="_blank" rel="noopener noreferrer">
              <img 
                src="/batap.jpg" 
                alt="BATAP PII" 
                className="h-12 object-contain"
              />
            </a>
            {/* AkreChain Brand */}
            <div className="border-l border-gray-200 pl-4 ml-2">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">AkreChain</h2>
              <p className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">Blockchain Accreditation</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            {user ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all inline-flex items-center gap-2 border border-transparent hover:border-gray-200"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/login')
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/register')
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
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
