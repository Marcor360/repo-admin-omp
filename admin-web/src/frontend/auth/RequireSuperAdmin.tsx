import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './useAuth';
import { LoadingState } from '../components/ui/LoadingState';

export function RequireSuperAdmin() {
  const { user, isSuperAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState label="Validando acceso administrativo..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <Outlet />;
}
