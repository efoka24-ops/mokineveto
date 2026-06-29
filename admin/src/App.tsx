import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAdminStore } from './store/useAdminStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VetQueuePage from './pages/VetQueuePage';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAdminStore();

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-green-700 text-white p-4 shadow">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">
            MokineVeto Admin
          </Link>
          <div className="flex gap-6 items-center">
            <Link to="/" className="hover:text-green-200">
              Dashboard
            </Link>
            <Link to="/vets/pending" className="hover:text-green-200">
              Verify Vets
            </Link>
            <span className="text-sm">{user.name}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}

export default function App() {
  const hydrate = useAdminStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}
