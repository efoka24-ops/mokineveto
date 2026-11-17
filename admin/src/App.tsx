import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAdminStore } from './store/useAdminStore';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VetQueuePage from './pages/VetQueuePage';
import EpidemioMapPage from './pages/EpidemioMapPage';
import AlertsPage from './pages/AlertsPage';
import MarketplacePage from './pages/MarketplacePage';
import FichesPage from './pages/FichesPage';
import ChatbotRulesPage from './pages/ChatbotRulesPage';
import UsersPage from './pages/UsersPage';
import AppointmentsPage from './pages/AppointmentsPage';
import ReviewsPage from './pages/ReviewsPage';
import DisputesPage from './pages/DisputesPage';
import AuditLogPage from './pages/AuditLogPage';
import ConfigPage from './pages/ConfigPage';
import MobileMoneyPage from './pages/MobileMoneyPage';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = useAdminStore((s) => s.user);

  if (!user) return <Navigate to="/login" />;

  return <AdminLayout>{children}</AdminLayout>;
}

export default function App() {
  const hydrate = useAdminStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedLayout>
              <DashboardPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/vets/pending"
          element={
            <ProtectedLayout>
              <VetQueuePage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/fiches"
          element={
            <ProtectedLayout>
              <FichesPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedLayout>
              <AlertsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/epidemio"
          element={
            <ProtectedLayout>
              <EpidemioMapPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedLayout>
              <UsersPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedLayout>
              <AppointmentsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/reviews"
          element={
            <ProtectedLayout>
              <ReviewsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/chatbot"
          element={
            <ProtectedLayout>
              <ChatbotRulesPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/marketplace"
          element={
            <ProtectedLayout>
              <MarketplacePage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/disputes"
          element={
            <ProtectedLayout>
              <DisputesPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/audit-log"
          element={
            <ProtectedLayout>
              <AuditLogPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/config"
          element={
            <ProtectedLayout>
              <ConfigPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/mobile-money"
          element={
            <ProtectedLayout>
              <MobileMoneyPage />
            </ProtectedLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
