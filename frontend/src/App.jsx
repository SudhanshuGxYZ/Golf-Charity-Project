import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PricingPage from './pages/PricingPage';
import CharitiesPage from './pages/CharitiesPage';
import CharityDetailPage from './pages/CharityDetailPage';
import DrawsPage from './pages/DrawsPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

// Guards
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Layout
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function App() {
  const { initialize, initialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm font-body">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/charities" element={<CharitiesPage />} />
          <Route path="/charities/:id" element={<CharityDetailPage />} />
          <Route path="/draws" element={<DrawsPage />} />

          {/* Protected: Subscribers */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin/*" element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          } />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
