import { Navigate, Route, Routes } from 'react-router';
import { RequireSuperAdmin } from './auth/RequireSuperAdmin';
import { AdminLayout } from './layouts/AdminLayout';
import { CongregationDetailPage } from './pages/CongregationDetailPage';
import { CongregationsPage } from './pages/CongregationsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotAuthorizedPage } from './pages/NotAuthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/not-authorized" element={<NotAuthorizedPage />} />

      <Route element={<RequireSuperAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/congregations" element={<CongregationsPage />} />
          <Route path="/congregations/:congregationId" element={<CongregationDetailPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
