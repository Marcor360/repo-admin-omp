import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/Button';
import { useSystemAnnouncements } from '../hooks/useSystemAnnouncements';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { AnnouncementModal } from '../components/announcements/AnnouncementModal';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeAnnouncement, loading: announcementsLoading, markAsViewed } = useSystemAnnouncements();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cerrar el menú móvil al navegar a otra pantalla.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEscapeKey(() => setSidebarOpen(false), sidebarOpen);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={sidebarOpen}
        aria-controls="admin-sidebar"
        onClick={() => setSidebarOpen((open) => !open)}
      >
        <span aria-hidden="true">{sidebarOpen ? '✕' : '☰'}</span>
      </button>

      {sidebarOpen ? (
        <div
          className="sidebar-overlay"
          role="presentation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside id="admin-sidebar" className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
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
