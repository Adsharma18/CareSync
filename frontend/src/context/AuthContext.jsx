import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('caresync_access_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('caresync_refresh_token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('caresync_access_token');
    localStorage.removeItem('caresync_refresh_token');
    delete apiClient.defaults.headers.common.Authorization;
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  // Hydrate user profile on initial load or token change
  useEffect(() => {
    const initializeAuth = async () => {
      const storedAccess = localStorage.getItem('caresync_access_token');
      const storedRefresh = localStorage.getItem('caresync_refresh_token');

      if (!storedAccess && !storedRefresh) {
        setLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);
        setAccessToken(localStorage.getItem('caresync_access_token'));
        setRefreshToken(localStorage.getItem('caresync_refresh_token'));
      } catch (err) {
        // If profile fetch fails even after interceptor refresh attempts, log out
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for logout events dispatched by the axios interceptor
    const handleAuthLogout = () => {
      logout();
    };

    window.addEventListener('caresync_auth_logout', handleAuthLogout);
    return () => {
      window.removeEventListener('caresync_auth_logout', handleAuthLogout);
    };
  }, [logout]);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('caresync_access_token', data.access);
    localStorage.setItem('caresync_refresh_token', data.refresh);
    setAccessToken(data.access);
    setRefreshToken(data.refresh);

    apiClient.defaults.headers.common.Authorization = `Bearer ${data.access}`;
    const userData = await authApi.getMe();
    setUser(userData);
    return userData;
  };

  const register = async ({ fullName, email, password }) => {
    await authApi.register({ fullName, email, password });
    // Automatically log in after registration
    return await login(email, password);
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
