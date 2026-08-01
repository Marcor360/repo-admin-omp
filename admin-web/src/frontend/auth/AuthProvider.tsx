import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { apiFetch } from '../lib/apiClient';
import type { AuthContextValue, OwnerUser } from '../types/auth.types';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<OwnerUser | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        setIsSuperAdmin(false);
        setLoading(false);
        setAuthReady(true);
        return;
      }

      setUser({ email: firebaseUser.email ?? '' });

      // isSuperAdmin nunca se deriva de un claim leído en el cliente: solo cuenta
      // que el servidor haya aceptado el token (allowlist + claim + provider).
      try {
        const response = await apiFetch('/api/me');
        setIsSuperAdmin(response.ok);
      } catch {
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isSuperAdmin,
      loading,
      authReady,
      loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      },
      logout: async () => {
        await signOut(auth);
      },
    }),
    [authReady, isSuperAdmin, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
