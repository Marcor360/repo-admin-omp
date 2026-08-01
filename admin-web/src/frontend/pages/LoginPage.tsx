import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/Button';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const { user, isSuperAdmin, loading, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname || '/dashboard';
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleLogin() {
    setError(null);
    setSigningIn(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Error en signInWithPopup:', err);
      const code = (err as { code?: string })?.code;
      setError(
        code
          ? `No se pudo iniciar sesión con Google (${code}).`
          : 'No se pudo iniciar sesión con Google. Intenta de nuevo.',
      );
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-header">
          <span className="brand-mark large">OMP</span>
          <h1>OMP Admin Portal</h1>
          <p>Acceso exclusivo para el propietario del sistema.</p>
        </div>
        <div className="login-body">
          {loading ? (
            <p>Verificando identidad...</p>
          ) : (
            <>
              <Button type="button" onClick={handleLogin} disabled={signingIn}>
                {signingIn ? 'Conectando...' : 'Iniciar sesión con Google'}
              </Button>
              {error && <p className="form-error login-error">{error}</p>}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
