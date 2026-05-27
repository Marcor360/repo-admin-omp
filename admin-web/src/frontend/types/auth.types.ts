export interface IapUser {
  email: string;
}

export interface AuthContextValue {
  user: IapUser | null;
  isSuperAdmin: boolean;
  loading: boolean;
  authReady: boolean;
  login: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}
