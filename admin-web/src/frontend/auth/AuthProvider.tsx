import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthContextValue, IapUser } from '../types/auth.types';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<IapUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchMe() {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) {
            setUser({ email: data.email });
          }
        } else {
          if (!cancelled) setUser(null);
        }
      } catch (error) {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setAuthReady(true);
        }
      }
    }

    fetchMe();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isSuperAdmin: Boolean(user), // Si IAP lo dejó pasar, es super admin por definición
      loading,
      authReady,
      login: async () => {}, // No-op, IAP maneja el login
      loginWithGoogle: async () => {}, // No-op
      logout: async () => {
        window.location.href = '/_gcp_iap/clear_login_cookie';
      },
    }),
    [authReady, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
