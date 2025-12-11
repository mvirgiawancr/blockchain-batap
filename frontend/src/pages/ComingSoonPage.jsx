import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Construction } from 'lucide-react';

export default function ComingSoonPage({ user, title = "Halaman Ini", role = "upps" }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole(role)}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Construction className="w-24 h-24 text-blue-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
            <p className="text-xl text-gray-600 mb-8">Sedang Dalam Pengembangan</p>
            <p className="text-gray-500 mb-8">
              Fitur ini akan segera tersedia. Terima kasih atas kesabaran Anda.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
