import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, type User } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const t = localStorage.getItem('hc_token');
      const u = localStorage.getItem('hc_user');
      if (t) setToken(t);
      if (u) setUser(JSON.parse(u));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const persist = (t: string, u: User) => {
    localStorage.setItem('hc_token', t);
    localStorage.setItem('hc_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.token, data.user);
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    // Signup no longer issues a token — it sends an email OTP. The caller
    // navigates the user to the OTP verification screen.
    await api.post('/auth/signup', { email, password });
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const { data } = await api.post('/auth/verify-otp', { email, code });
    persist(data.token, data.user);
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    await api.post('/auth/resend-otp', { email });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hc_token');
    localStorage.removeItem('hc_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, signup, verifyOtp, resendOtp, logout }),
    [user, token, loading, login, signup, verifyOtp, resendOtp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
