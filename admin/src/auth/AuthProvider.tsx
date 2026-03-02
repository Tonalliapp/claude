import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, saveTokens, clearTokens, loadTokens } from '@/config/api';
import type { SuperAdminUser, AuthResponse } from '@/types';

interface AuthContextType {
  user: SuperAdminUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (creds: { email: string; password: string }) => Promise<AuthResponse>;
  loginLoading: boolean;
  loginError: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadTokens();
    const storedUser = localStorage.getItem('tonalli_admin_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    setIsReady(true);
  }, []);

  const handleAuthSuccess = useCallback((data: AuthResponse) => {
    saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    localStorage.setItem('tonalli_admin_user', JSON.stringify(data.user));
  }, []);

  const loginMutation = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      apiFetch<AuthResponse>('/admin/login', { method: 'POST', body: creds }),
    onSuccess: handleAuthSuccess,
  });

  const logout = useCallback(async () => {
    try {
      const rt = localStorage.getItem('tonalli_admin_refresh_token');
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: { refreshToken: rt },
        auth: true,
      });
    } catch {
      // continue
    }
    clearTokens();
    localStorage.removeItem('tonalli_admin_user');
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isReady,
        isAuthenticated: !!user,
        login: loginMutation.mutateAsync,
        loginLoading: loginMutation.isPending,
        loginError: loginMutation.error?.message ?? null,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
