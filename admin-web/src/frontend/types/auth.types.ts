export interface OwnerUser {
  email: string;
}

export interface AuthContextValue {
  user: OwnerUser | null;
  isSuperAdmin: boolean;
  loading: boolean;
  authReady: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}
