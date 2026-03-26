import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import * as api from '../api/client';

interface AuthContextValue {
  loading: boolean;
  passwordSet: boolean;
  authenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [passwordSet, setPasswordSet] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const refreshAuth = useCallback(async () => {
    try {
      const status = await api.getAuthStatus();
      setPasswordSet(status.passwordSet);
      setAuthenticated(status.authenticated);
    } catch {
      setPasswordSet(false);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();

    // Handle 401 responses from API calls
    api.setOnUnauthorized(() => {
      setAuthenticated(false);
    });

    return () => {
      api.setOnUnauthorized(null);
    };
  }, [refreshAuth]);

  const login = useCallback(async (password: string) => {
    await api.login(password);
    setAuthenticated(true);
    setPasswordSet(true);
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ loading, passwordSet, authenticated, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
