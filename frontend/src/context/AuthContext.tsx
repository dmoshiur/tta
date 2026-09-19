import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '../types/index.ts';
import { authApi, userApi, setToken, getToken } from '../api.ts';

interface AuthContextType {
  user: User | null;
  permissions: string[];
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (name: string, email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<User>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('tta_user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [permissions, setPermissions] = useState<string[]>(() => {
    const cached = localStorage.getItem('tta_permissions');
    try {
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  const saveSession = (u: User, perms: string[] = []) => {
    setUser(u);
    setPermissions(perms);
    localStorage.setItem('tta_user', JSON.stringify(u));
    localStorage.setItem('tta_permissions', JSON.stringify(perms));
  };

  const clearSession = () => {
    setUser(null);
    setPermissions([]);
    setToken(null);
    localStorage.removeItem('tta_user');
    localStorage.removeItem('tta_permissions');
  };

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      clearSession();
      setLoading(false);
      return;
    }
    try {
      const { user: refreshed, permissions: perms } = await authApi.getSession();
      saveSession(refreshed, perms || []);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, pass: string): Promise<User> => {
    const res = await authApi.login({ email, password: pass });
    setToken(res.token);
    try {
      const session = await authApi.getSession();
      saveSession(session.user, session.permissions || []);
      return session.user;
    } catch {
      saveSession(res.user, []);
      return res.user;
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<User> => {
    const res = await authApi.register({ name, email, password: pass });
    setToken(res.token);
    saveSession(res.user, []);
    return res.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    } finally {
      clearSession();
    }
  };

  const updateUser = async (data: Partial<User>): Promise<User> => {
    const updated = await userApi.updateProfile(data);
    setUser((prev) => (prev ? { ...prev, ...updated } : updated));
    localStorage.setItem('tta_user', JSON.stringify({ ...(user || {}), ...updated }));
    return updated;
  };

  const isAdmin = Boolean(user && ['SUPER_ADMIN', 'CONTENT_ADMIN', 'MODERATOR', 'ANALYST'].includes(user.role));
  const isSuperAdmin = Boolean(user && user.role === 'SUPER_ADMIN');

  const hasPermission = (perm: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return permissions.includes(perm);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        isAdmin,
        isSuperAdmin,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
