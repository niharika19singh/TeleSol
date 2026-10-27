import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, fetchCurrentUser, logoutUser } from '../data/api';

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = 'senpay_auth_token';
const USER_STORAGE_KEY = 'senpay_auth_user';

export function AuthProvider({ children }) {
  const isDemoParam = typeof window !== 'undefined' && window.location.search.includes('demo=true');
  const seededOperator = {
    id: 'usr_seeded_operator',
    username: 'operator',
    email: 'operator@telesol.io',
    full_name: 'SENPAY Lead NOC Engineer',
    role: 'operator'
  };

  const [token, setToken] = useState(() => {
    if (isDemoParam) return 'demo_seeded_session_token';
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  });

  const [user, setUser] = useState(() => {
    if (isDemoParam) return seededOperator;
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(!isDemoParam);

  // Validate token on initial mount
  useEffect(() => {
    if (isDemoParam) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    async function verifySession() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const userData = await fetchCurrentUser(token);
        if (isMounted) {
          if (userData && userData.email) {
            setUser(userData);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
          } else {
            // Token expired or invalid
            setToken(null);
            setUser(null);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.warn('[AUTH] Session verification failed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    verifySession();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (username_or_email, password) => {
    const res = await loginUser({ username_or_email, password });
    const userToken = res.token || res.access_token;
    if (userToken && res.user) {
      setToken(userToken);
      setUser(res.user);
      localStorage.setItem(TOKEN_STORAGE_KEY, userToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
      return res.user;
    }
    throw new Error('Invalid login response from server');
  };

  const register = async (userData) => {
    const res = await registerUser(userData);
    const userToken = res.token || res.access_token;
    if (userToken && res.user) {
      setToken(userToken);
      setUser(res.user);
      localStorage.setItem(TOKEN_STORAGE_KEY, userToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
      return res.user;
    }
    throw new Error('Registration failed: no token returned');
  };

  const logout = async () => {
    if (token) {
      try {
        await logoutUser(token);
      } catch (e) {
        // ignore error during logout
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const demoSignIn = async () => {
    return await login('operator@telesol.io', 'senpay-telecom-2026');
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    register,
    logout,
    demoSignIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
