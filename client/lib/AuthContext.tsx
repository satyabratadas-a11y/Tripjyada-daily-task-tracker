'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { api, ApiError } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  completeLogin: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authGenerationRef = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++authGenerationRef.current;
    setLoading(true);
    try {
      const data = await api.get<{ user: User }>('/api/auth/me');
      if (authGenerationRef.current === generation) setUser(data.user);
    } catch (err) {
      // A network hiccup (status 0) doesn't mean the session is invalid — only a real 401 does.
      // Clearing the user on a transient failure would force a re-login even though the cookie
      // is still good, which is exactly what looked like "forgot my login" after a page hiccup.
      const isNetworkError = err instanceof ApiError && err.status === 0;
      if (authGenerationRef.current === generation && !isNetworkError) setUser(null);
    } finally {
      if (authGenerationRef.current === generation) setLoading(false);
    }
  }, []);

  const completeLogin = useCallback((authenticatedUser: User) => {
    // The login response already contains the authoritative user. Invalidate any older /me
    // request so it cannot race this state update, and avoid a duplicate database round trip.
    authGenerationRef.current += 1;
    setUser(authenticatedUser);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Clear local auth state even if the server cannot be reached.
    } finally {
      authGenerationRef.current += 1;
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ user, loading, refresh, completeLogin, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
