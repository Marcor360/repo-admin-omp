import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/Button';
import { useSystemAnnouncements } from '../hooks/useSystemAnnouncements';
import { AnnouncementModal } from '../components/announcements/AnnouncementModal';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { activeAnnouncement, loading: announcementsLoading, markAsViewed } = useSystemAnnouncements();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">OMP</span>
          <div>
            <strong>Admin Portal</strong>
            <small>Gestión global</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Dashboard
          </NavLink>
          <NavLink to="/congregations" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Congregaciones
          </NavLink>
          <NavLink to="/announcements" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Avisos del Sistema
          </NavLink>
        </nav>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div>
            <strong>OMP Admin Portal</strong>
            <p>{user?.email || 'sistema@omp.com'}</p>
          </div>
          <Button type="button" variant="secondary" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {!announcementsLoading && activeAnnouncement && (
        <AnnouncementModal
          announcement={activeAnnouncement}
          onClose={markAsViewed}
        />
      )}
    </div>
  );
}
