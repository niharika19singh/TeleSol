import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginUser,
  registerUser,
  fetchCurrentUser,
  logoutUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '../data/api';

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = 'senpay_auth_token';
const USER_STORAGE_KEY = 'senpay_auth_user';

function isPublicLandingRoute() {
  if (typeof window === 'undefined') return true;
  const hash = (window.location.hash || '').toLowerCase().replace(/^[/#]+/, '').trim();
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'true') return false;
  if (!hash || hash === 'home' || hash === 'landing') return true;
  return false;
}

export function AuthProvider({ children }) {
  // Clean up any legacy fake demo tokens that might have been stored by older versions
  if (typeof window !== 'undefined') {
    const existingToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (existingToken === 'demo_seeded_session_token') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!saved || saved === 'demo_seeded_session_token') return null;
    return saved;
  });

  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!savedToken || savedToken === 'demo_seeded_session_token') return null;
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed?.id === 'usr_seeded_operator') return null;
      return parsed;
    } catch {
      return null;
    }
  });

  // Explicit session mode: 'authenticated' | 'demo' | 'anonymous'
  // Never fabricates a JWT or impersonates a backend user in 'demo' mode.
  const [sessionMode, setSessionMode] = useState(() => {
    if (token && user) return 'authenticated';
    if (!isPublicLandingRoute()) return 'demo';
    return 'anonymous';
  });

  const [isLoading, setIsLoading] = useState(() => Boolean(token));

  // Validate saved real token on initial mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!savedToken || savedToken === 'demo_seeded_session_token') {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function verifySession() {
      try {
        const res = await fetchCurrentUser(savedToken);
        if (isMounted) {
          const resolvedUser = res?.user || res;
          if (resolvedUser && (resolvedUser.email || resolvedUser.username)) {
            setUser(resolvedUser);
            setSessionMode('authenticated');
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(resolvedUser));
          } else {
            // Token expired or invalid — clear without blocking public demo access
            setToken(null);
            setUser(null);
            setSessionMode(isPublicLandingRoute() ? 'anonymous' : 'demo');
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.warn('[AUTH] Session verification failed:', err);
        if (isMounted) {
          setToken(null);
          setUser(null);
          setSessionMode(isPublicLandingRoute() ? 'anonymous' : 'demo');
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  const enterDemoMode = useCallback(() => {
    if (!token || !user) {
      setSessionMode('demo');
    }
  }, [token, user]);

  const exitDemoMode = useCallback(() => {
    if (!token || !user) {
      setSessionMode('anonymous');
    }
  }, [token, user]);

  const login = async (username_or_email, password) => {
    const res = await loginUser({ username_or_email, password });
    const userToken = res.token || res.access_token;
    const userData = res.user || res;
    if (userToken && userData && (userData.email || userData.username)) {
      setToken(userToken);
      setUser(userData);
      setSessionMode('authenticated');
      localStorage.setItem(TOKEN_STORAGE_KEY, userToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      return userData;
    }
    throw new Error('Invalid login response from server');
  };

  const register = async (userData) => {
    const res = await registerUser(userData);
    const userToken = res.token || res.access_token;
    const createdUser = res.user || res;
    if (userToken && createdUser && createdUser.email_verified) {
      setToken(userToken);
      setUser(createdUser);
      setSessionMode('authenticated');
      localStorage.setItem(TOKEN_STORAGE_KEY, userToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(createdUser));
    }
    return { user: createdUser, raw: res };
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
    setSessionMode('anonymous');
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const isAuthenticated = Boolean(token && user);
  const isDemoMode = !isAuthenticated && sessionMode === 'demo';

  const normalizedRole = isAuthenticated ? (user?.role || '').toUpperCase() : '';
  const isAdmin = isAuthenticated && (normalizedRole === 'PLATFORM_ADMIN' || normalizedRole === 'ADMIN');
  const isOwner = isAuthenticated && (normalizedRole === 'WORKSPACE_OWNER' || isAdmin);
  const isOperator = isAuthenticated && (normalizedRole === 'NOC_OPERATOR' || normalizedRole === 'OPERATOR' || isOwner);
  const isFinance = isAuthenticated && (normalizedRole === 'FINANCE' || isOwner);

  const hasRole = (allowedRoles = []) => {
    if (!isAuthenticated || !user) return false;
    if (isAdmin) return true;
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
    return normalizedAllowed.includes(normalizedRole);
  };

  const value = {
    user: isAuthenticated ? user : null,
    token: isAuthenticated ? token : null,
    isAuthenticated,
    sessionMode: isAuthenticated ? 'authenticated' : sessionMode,
    isDemoMode,
    enterDemoMode,
    exitDemoMode,
    isLoading,
    login,
    register,
    logout,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    hasRole,
    isAdmin,
    isOwner,
    isOperator,
    isFinance,
    role: isAuthenticated ? normalizedRole : 'DEMO_VISITOR',
    workspace: isAuthenticated
      ? (user?.org_name || user?.workspace_id || 'TeleSol Operations')
      : 'SENPAY Interactive Demo',
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
