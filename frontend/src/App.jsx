import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import UPPSDashboard from './pages/UPPSDashboard';
import SekretariatDashboard from './pages/SekretariatDashboard';
import AssessorDashboard from './pages/AssessorDashboard';
import KEADashboard from './pages/KEADashboard';
import AsesorDashboard from './pages/AsesorDashboard';
import SubmissionsPage from './pages/SubmissionsPage';
import StatusPage from './pages/StatusPage';
import AsesorAssignmentsPage from './pages/AsesorAssignmentsPage';
import UPPSAssignmentsPage from './pages/UPPSAssignmentsPage';
import AssessorsInfoPage from './pages/AssessorsInfoPage';
import NotificationsPage from './pages/NotificationsPage';
import SekretariatVerifyPage from './pages/SekretariatVerifyPage';
import SekretariatUPPSPage from './pages/SekretariatUPPSPage';
import SekretariatPaymentPage from './pages/SekretariatPaymentPage';
import SekretariatReportsPage from './pages/SekretariatReportsPage';
import SekretariatALApprovalPage from './pages/SekretariatALApprovalPage';
import KEAAssignmentsPage from './pages/KEAAssignmentsPage';
import KEAMonitoringPage from './pages/KEAMonitoringPage';
import KEAConsistencyPage from './pages/KEAConsistencyPage';
import KEAConsistencyDetailPage from './pages/KEAConsistencyDetailPage';
import KEAALSchedulingPage from './pages/KEAALSchedulingPage';
import KEARejectionReviewPage from './pages/KEARejectionReviewPage';
import AsesorAssessmentPage from './pages/AsesorAssessmentPage';
import ComingSoonPage from './pages/ComingSoonPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ALExecutionPage from './pages/ALExecutionPage';
import DashboardLayout from './components/DashboardLayout';
import ALResponsePage from './pages/ALResponsePage';
import VerificationPage from './pages/VerificationPage';
import MajelisPage from './pages/MajelisPage';
import ReleasePage from './pages/ReleasePage';
import UPPSALResponsePage from './pages/UPPSALResponsePage';
import VerificationListPage from './pages/VerificationListPage';
import MajelisDashboard from './pages/MajelisDashboard';
import ReleaseListPage from './pages/ReleaseListPage';
import TraceabilityPage from './pages/TraceabilityPage';


function ProtectedRoute({ children, roles }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  return (
    <Router>
      <div className="App">
        <Navbar user={currentUser} onLogout={() => setCurrentUser(null)} />
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute roles={['upps', 'admin']}>
                <UPPSDashboard user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sekretariat"
            element={
              <ProtectedRoute roles={['sekretariat', 'admin']}>
                <SekretariatDashboard user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessor"
            element={
              <ProtectedRoute roles={['assessor', 'admin']}>
                <AssessorDashboard user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kea"
            element={
              <ProtectedRoute roles={['kea', 'admin']}>
                <KEADashboard user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/asesor"
            element={
              <ProtectedRoute roles={['asesor', 'assessor', 'admin']}>
                <AsesorDashboard user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/submissions"
            element={
              <ProtectedRoute roles={['upps', 'admin']}>
                <SubmissionsPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/status"
            element={
              <ProtectedRoute roles={['upps', 'admin']}>
                <StatusPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/asesor/assignments"
            element={
              <ProtectedRoute roles={['asesor', 'assessor', 'admin']}>
                <AsesorAssignmentsPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          
          {/* UPPS Pages */}
          <Route
            path="/upps/assignments"
            element={
              <ProtectedRoute roles={['upps', 'admin']}>
                <UPPSAssignmentsPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upps/al-response"
            element={
              <ProtectedRoute roles={['upps', 'admin']}>
                <UPPSALResponsePage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessors-info"
            element={
              <ProtectedRoute roles={['upps', 'admin']}>
                <AssessorsInfoPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage user={currentUser} />
              </ProtectedRoute>
            }
          />

          {/* Sekretariat Pages */}
          <Route
            path="/sekretariat/verify"
            element={
              <ProtectedRoute roles={['sekretariat', 'admin']}>
                <SekretariatVerifyPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sekretariat/upps"
            element={
              <ProtectedRoute roles={['sekretariat', 'admin']}>
                <SekretariatUPPSPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sekretariat/payment"
            element={
              <ProtectedRoute roles={['sekretariat', 'admin']}>
                <SekretariatPaymentPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sekretariat/reports"
            element={
              <ProtectedRoute roles={['sekretariat', 'admin']}>
                <SekretariatReportsPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sekretariat/al-approval"
            element={
              <ProtectedRoute roles={['sekretariat', 'admin']}>
                <SekretariatALApprovalPage user={currentUser} />
              </ProtectedRoute>
            }
          />

          {/* KEA Pages */}
          <Route
            path="/kea/assignments"
            element={
              <ProtectedRoute roles={['kea', 'admin']}>
                <KEAAssignmentsPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kea/monitoring"
            element={
              <ProtectedRoute roles={['kea', 'admin']}>
                <KEAMonitoringPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kea/consistency"
            element={
              <ProtectedRoute roles={['kea', 'admin']}>
                <KEAConsistencyPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kea/consistency/:submissionId"
            element={
              <ProtectedRoute roles={['kea', 'admin']}>
                <KEAConsistencyDetailPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kea/assessors"
            element={
              <ProtectedRoute roles={['kea', 'admin']}>
                <ComingSoonPage user={currentUser} title="Data Asesor" role="kea" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kea/al-scheduling"
            element={
              <ProtectedRoute roles={['kea', 'admin']}>
                <KEAALSchedulingPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kea/rejection-review"
            element={
              <ProtectedRoute roles={['kea', 'admin']}>
                <KEARejectionReviewPage user={currentUser} />
              </ProtectedRoute>
            }
          />

          {/* Asesor Pages */}
          <Route
            path="/asesor/assessment/:id"
            element={
              <ProtectedRoute roles={['asesor', 'assessor', 'admin']}>
                <AsesorAssessmentPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/asesor/history"
            element={
              <ProtectedRoute roles={['asesor', 'assessor', 'admin']}>
                <ComingSoonPage user={currentUser} title="Riwayat Penilaian" role="asesor" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/asesor/notifications"
            element={
              <ProtectedRoute roles={['asesor', 'assessor', 'admin']}>
                <ComingSoonPage user={currentUser} title="Notifikasi Asesor" role="asesor" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <ComingSoonPage user={currentUser} title="Pengaturan" role={currentUser?.role || 'upps'} />
              </ProtectedRoute>
            }
          />
          
          {/* New Workflow Phases */}
          <Route
            path="/al-execution/:submissionId"
            element={
              <ProtectedRoute roles={['asesor', 'assessor', 'admin']}>
                <ALExecutionPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/al-response/:submissionId"
            element={
              <ProtectedRoute roles={['upps', 'admin']}>
                <ALResponsePage user={currentUser} />
              </ProtectedRoute>
            }
          />
           <Route
            path="/verification"
            element={
              <ProtectedRoute roles={['kea', 'sekretariat', 'admin']}>
                <DashboardLayout user={currentUser}>
                  <VerificationListPage user={currentUser} />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
           <Route
            path="/verification/:submissionId"
            element={
              <ProtectedRoute roles={['kea', 'sekretariat', 'admin']}>
                <DashboardLayout user={currentUser}>
                  <VerificationPage user={currentUser} />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
           <Route
            path="/majelis"
            element={
              <ProtectedRoute roles={['majelis', 'sekretariat', 'admin']}>
                <MajelisDashboard user={currentUser} />
              </ProtectedRoute>
            }
          />
           <Route
            path="/majelis/decisions"
            element={
              <ProtectedRoute roles={['majelis', 'sekretariat', 'admin']}>
                <MajelisDashboard user={currentUser} />
              </ProtectedRoute>
            }
          />
           <Route
            path="/majelis-decision/:submissionId"
            element={
              <ProtectedRoute roles={['majelis', 'sekretariat', 'admin']}>
                <DashboardLayout user={currentUser}>
                  <MajelisPage user={currentUser} />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
           <Route
            path="/release"
            element={
              <ProtectedRoute roles={['sekretariat', 'admin']}>
                <ReleaseListPage user={currentUser} />
              </ProtectedRoute>
            }
          />
           <Route
            path="/release/:submissionId"
            element={
              <ProtectedRoute>
                <ReleasePage user={currentUser} />
              </ProtectedRoute>
            }
          />

          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login onLogin={handleLoginSuccess} />} />
          <Route path="/traceability" element={<TraceabilityPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
