import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, Award } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className="bg-white shadow-lg border-b-4 border-blue-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Sistem Akreditasi
              </h2>
              <p className="text-xs text-gray-600">Blockchain-Based Accreditation</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              to="/"
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
                isActive('/') 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                  : 'text-gray-700 hover:bg-blue-50 border-2 border-transparent hover:border-blue-200'
              }`}
            >
              Dashboard UPPS
            </Link>
            <Link
              to="/sekretariat"
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                isActive('/sekretariat') 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                  : 'text-gray-700 hover:bg-purple-50 border-2 border-transparent hover:border-purple-200'
              }`}
            >
              <Award className="w-4 h-4" />
              Dashboard Sekretariat
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
