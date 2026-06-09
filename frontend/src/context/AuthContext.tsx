import { createContext, useContext, useEffect, useState } from 'react';
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
  login: (email: string, password: string) => Promise<User | { require_2fa: true; user_id: number }>;
  verifyOTP: (userId: number, otpCode: string) => Promise<User>;
  loginWithGoogle: (idToken: string, role?: 'customer' | 'seller', businessName?: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User | { require_2fa: true; user_id: number }>;
  deleteAccount: () => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'seller';
  business_name?: string;
}

const ACCESS_KEY = 'kinahub_access_token';
const REFRESH_KEY = 'kinahub_refresh_token';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ACCESS_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  async function refreshMe() {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await apiRequest<User>('/auth/me/', { token });
      setUser(currentUser);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshMe();
  }, [token]);

  async function login(email: string, password: string) {
    const data = await apiRequest<any>('/token/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
  }

  async function verifyOTP(userId: number, otpCode: string) {
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
  }

  async function register(payload: RegisterPayload) {
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
  }

  async function loginWithGoogle(accessToken: string, role: 'customer' | 'seller' = 'customer', businessName?: string) {
    const data = await apiRequest<{ access: string; refresh: string; user: User }>('/auth/google/', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken, role, business_name: businessName }),
    });
    
    setToken(data.access);
    setUser(data.user);
    localStorage.setItem(ACCESS_KEY, data.access);
    localStorage.setItem(REFRESH_KEY, data.refresh);
    
    return data.user;
  }

  async function deleteAccount() {
    await apiRequest('/auth/me/', { method: 'DELETE', token });
    logout();
  }

  function logout() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, verifyOTP, register, deleteAccount, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
