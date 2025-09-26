import React from 'react';
import { UppsDashboard } from './UppsDashboard';
import { AsesorDashboard } from './AsesorDashboard';
import type { User } from '../types/auth';

interface DashboardPageProps {
  user: User;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  // Route to appropriate dashboard based on user role
  switch (user.role) {
    case 'UniversityAdmin':
      return <UppsDashboard user={user} onLogout={onLogout} />;
    case 'Assessor':
      return <AsesorDashboard user={user} onLogout={onLogout} />;
    case 'SuperAdmin':
      // For now, admin uses UPPS dashboard - can be customized later
      return <UppsDashboard user={user} onLogout={onLogout} />;
    default:
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Dashboard Tidak Tersedia
            </h1>
            <p className="text-gray-600 mb-6">
              Role "{user.role}" belum memiliki dashboard yang sesuai.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Refresh Halaman
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      );
  }
};