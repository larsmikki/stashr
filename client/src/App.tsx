import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import FrontPage from '@/pages/FrontPage';
import AlbumPage from '@/pages/AlbumPage';
import SettingsPage from '@/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';
import FavoritesPage from '@/pages/FavoritesPage';
import LoginPage from '@/pages/LoginPage';
import DonatePage from '@/pages/DonatePage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

function AppRoutes() {
  const { loading, passwordSet, authenticated } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ color: '#9ca3af' }}>Loading...</div>;
  }

  if (passwordSet && !authenticated) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<FrontPage />} />
        <Route path="/albums/:id" element={<AlbumPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/donate" element={<DonatePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
