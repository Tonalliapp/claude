import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, saveTokens, clearTokens, loadTokens } from '@/config/api';
import type { User, AuthResponse } from '@/types';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextType {
  user: User | null;
  tenant: TenantInfo | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (creds: { email: string; username: string; password: string }) => Promise<AuthResponse>;
  loginLoading: boolean;
  loginError: string | null;
  register: (data: {
    restaurantName: string;
    ownerName: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }) => Promise<AuthResponse>;
  registerLoading: boolean;
  registerError: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isReady, setIsReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadTokens();
    const storedUser = localStorage.getItem('tonalli_user');
    const storedTenant = localStorage.getItem('tonalli_tenant');
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedTenant) setTenant(JSON.parse(storedTenant));
    setIsReady(true);
  }, []);

  const handleAuthSuccess = useCallback((data: AuthResponse) => {
    saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    setTenant(data.tenant);
    localStorage.setItem('tonalli_user', JSON.stringify(data.user));
    localStorage.setItem('tonalli_tenant', JSON.stringify(data.tenant));
  }, []);

  const loginMutation = useMutation({
    mutationFn: (creds: { email: string; username: string; password: string }) =>
      apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: creds }),
    onSuccess: handleAuthSuccess,
  });

  const registerMutation = useMutation({
    mutationFn: (data: {
      restaurantName: string;
      ownerName: string;
      email: string;
      password: string;
      phone?: string;
      address?: string;
    }) => apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: data }),
    onSuccess: handleAuthSuccess,
  });

  const logout = useCallback(async () => {
    try {
      const rt = localStorage.getItem('tonalli_refresh_token');
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: { refreshToken: rt },
        auth: true,
      });
    } catch {
      // continue
    }
    clearTokens();
    localStorage.removeItem('tonalli_user');
    localStorage.removeItem('tonalli_tenant');
    setUser(null);
    setTenant(null);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isReady,
        isAuthenticated: !!user,
        login: loginMutation.mutateAsync,
        loginLoading: loginMutation.isPending,
        loginError: loginMutation.error?.message ?? null,
        register: registerMutation.mutateAsync,
        registerLoading: registerMutation.isPending,
        registerError: registerMutation.error?.message ?? null,
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
