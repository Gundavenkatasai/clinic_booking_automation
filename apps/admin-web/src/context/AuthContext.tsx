import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser, AdminLoginInput } from '@clinic/shared';
import { adminApi } from '../api/client';

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (credentials: AdminLoginInput) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (token) {
      adminApi
        .me()
        .then((userData) => {
          setUser(userData);
          setLoading(false);
        })
        .catch(() => {
          sessionStorage.removeItem('admin_token');
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials: AdminLoginInput) => {
    const res = await adminApi.login(credentials);
    setUser(res.user);
  };

  const logout = async () => {
    await adminApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
