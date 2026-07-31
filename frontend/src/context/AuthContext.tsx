import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { apiRequest } from '../lib/api';

export type Role = 'customer' | 'seller' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  address: string | null;
  role: Role;
  effective_role: Role;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, password: string, sellerCode?: string) => Promise<User | { require_2fa: true; user_id: number }>;
  verifyOTP: (userId: number, otpCode: string) => Promise<User>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, otpCode: string, newPassword: string) => Promise<void>;
  loginWithGoogle: (idToken: string, role?: 'customer' | 'seller', businessName?: string, sellerCode?: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User | { require_2fa: true; user_id: number }>;
  requestDeleteAccount: () => Promise<void>;
  confirmDeleteAccount: (otpCode: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  demoLogin: (role: 'customer' | 'seller') => void;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'seller';
  business_name?: string;
  seller_code?: string;
}

const ACCESS_KEY = 'kinahub_access_token';
const REFRESH_KEY = 'kinahub_refresh_token';
const DEMO_TOKEN_PREFIX = '__demo_';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ACCESS_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [isDemo, setIsDemo] = useState(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setToken(null);
    setUser(null);
    setIsDemo(false);
    setLoading(false);
  }, []);

  const demoLogin = useCallback((role: 'customer' | 'seller') => {
    const demoUser: User = {
      id: role === 'seller' ? -2 : -1,
      username: role === 'seller' ? 'demo.seller' : 'demo.customer',
      email: role === 'seller' ? 'demo.seller@kinahub.local' : 'demo.customer@kinahub.local',
      first_name: 'Demo',
      last_name: role === 'seller' ? 'Seller' : 'Customer',
      phone: null,
      address: 'Kathmandu, Nepal',
      role,
      effective_role: role,
      is_active: true,
    };
    setToken(role === 'seller' ? `${DEMO_TOKEN_PREFIX}seller` : `${DEMO_TOKEN_PREFIX}customer`);
    setUser(demoUser);
    setIsDemo(true);
    setLoading(false);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (token.startsWith(DEMO_TOKEN_PREFIX)) {
      // Demo sessions live in memory only; never persist, never clear mid-session.
      // On a real page reload the demo token is gone from storage, so `token` is
      // null here and the session correctly resets.
      setLoading(false);
      return;
    }

    try {
      const requestToken = token;
      const currentUser = await apiRequest<User>('/auth/me/', { token: requestToken });
      // Session may have changed (demo login / logout) while this request was in flight.
      if (tokenRef.current !== requestToken) return;
      setUser(currentUser);
    } catch {
      if (tokenRef.current === token) logout();
    } finally {
      if (tokenRef.current === token) setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string, sellerCode?: string) => {
    const data = await apiRequest<any>('/token/', {
      method: 'POST',
      body: JSON.stringify({ email, password, seller_code: sellerCode }),
    });

    if (data.require_2fa) {
      return data;
    }

    localStorage.setItem(ACCESS_KEY, data.access);
    localStorage.setItem(REFRESH_KEY, data.refresh);
    setToken(data.access);
    const currentUser = await apiRequest<User>('/auth/me/', { token: data.access });
    setUser(currentUser);
    return currentUser;
  }, []);

  const verifyOTP = useCallback(async (userId: number, otpCode: string) => {
    const data = await apiRequest<{ access: string; refresh: string }>('/token/verify-2fa/', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, otp_code: otpCode }),
    });

    localStorage.setItem(ACCESS_KEY, data.access);
    localStorage.setItem(REFRESH_KEY, data.refresh);
    setToken(data.access);
    const currentUser = await apiRequest<User>('/auth/me/', { token: data.access });
    setUser(currentUser);
    return currentUser;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await apiRequest('/auth/password-reset/request/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }, []);

  const confirmPasswordReset = useCallback(async (email: string, otpCode: string, newPassword: string) => {
    await apiRequest('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ email, otp_code: otpCode, new_password: newPassword }),
    });
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await apiRequest<any>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (data.require_2fa) {
      return data;
    }

    localStorage.setItem(ACCESS_KEY, data.access);
    localStorage.setItem(REFRESH_KEY, data.refresh);
    setToken(data.access);
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (accessToken: string, role: 'customer' | 'seller' = 'customer', businessName?: string, sellerCode?: string) => {
    const data = await apiRequest<{ access: string; refresh: string; user: User }>('/auth/google/', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken, role, business_name: businessName, seller_code: sellerCode }),
    });
    
    setToken(data.access);
    setUser(data.user);
    localStorage.setItem(ACCESS_KEY, data.access);
    localStorage.setItem(REFRESH_KEY, data.refresh);
    
    return data.user;
  }, []);

  const requestDeleteAccount = useCallback(async () => {
    await apiRequest('/auth/delete-account/request/', { method: 'POST', token });
  }, [token]);

  const confirmDeleteAccount = useCallback(async (otpCode: string) => {
    await apiRequest('/auth/delete-account/confirm/', {
      method: 'POST',
      token,
      body: JSON.stringify({ otp_code: otpCode }),
    });
    logout();
  }, [token, logout]);

  const ctx = useMemo(() => ({ user, token, loading, isDemo, login, loginWithGoogle, verifyOTP, requestPasswordReset, confirmPasswordReset, register, requestDeleteAccount, confirmDeleteAccount, logout, refreshMe, demoLogin }), [
    user, token, loading, isDemo,
  ]);

  return (
    <AuthContext.Provider value={ctx}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
