'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from './api-client';

interface AuthState {
  accessToken: string | null;
  setAccessToken(token: string | null): void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);

  const setAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    if (token) window.sessionStorage.setItem('wallet_access_token', token);
    else window.sessionStorage.removeItem('wallet_access_token');
  }, []);

  const value = useMemo<AuthState>(() => ({
    accessToken,
    setAccessToken,
  }), [accessToken, setAccessToken]);

  useEffect(() => {
    let cancelled = false;

    async function refreshSession() {
      try {
        const session = await apiClient.request<{ accessToken: string }>('/auth/refresh', { method: 'POST' });
        if (!cancelled) setAccessToken(session.accessToken);
      } catch {
        if (!cancelled) setAccessToken(null);
      }
    }

    void refreshSession();

    return () => {
      cancelled = true;
    };
  }, [setAccessToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
