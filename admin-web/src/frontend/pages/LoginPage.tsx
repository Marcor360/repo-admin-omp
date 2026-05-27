import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const { user, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (!loading && user && isSuperAdmin) {
      navigate(redirectTo, { replace: true });
      return;
    }

    if (!loading && user && !isSuperAdmin) {
      navigate('/not-authorized', { replace: true });
    }
  }, [isSuperAdmin, loading, navigate, redirectTo, user]);

  if (!loading && user && isSuperAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-header">
          <span className="brand-mark large">OMP</span>
          <h1>OMP Admin Portal</h1>
          <p>Acceso exclusivo protegido por Google Cloud IAP.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          {loading ? (
            <p>Verificando identidad...</p>
          ) : (
            <p style={{ color: 'var(--error-color)' }}>
              Acceso denegado. No se detectó sesión de Identity-Aware Proxy.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
