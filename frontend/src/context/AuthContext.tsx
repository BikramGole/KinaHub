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
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
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
    const data = await apiRequest<{ access: string; refresh: string }>('/token/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(ACCESS_KEY, data.access);
    localStorage.setItem(REFRESH_KEY, data.refresh);
    setToken(data.access);
    const currentUser = await apiRequest<User>('/auth/me/', { token: data.access });
    setUser(currentUser);
    return currentUser;
  }

  async function register(payload: RegisterPayload) {
    const data = await apiRequest<{ access: string; refresh: string; user: User }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem(ACCESS_KEY, data.access);
    localStorage.setItem(REFRESH_KEY, data.refresh);
    setToken(data.access);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
