import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  secureMultiGet,
  secureMultiSet,
  secureMultiDelete,
} from '../services/secureStorage';
import {
  loginRequest,
  meRequest,
  registerRequest,
  forgotPasswordRequest,
  refreshTokenRequest,
  RegisterPayload,
} from '../services/authApi';
import { UserProfile } from '../types/user';
import { onSessionExpired } from '../services/authEventBus';
import SessionExpiredModal from '../components/SessionExpiredModal';

type RegisterResult = {
  autoLoginSuccess: boolean;
};

type AuthContextType = {
  loading: boolean;
  token: string | null;
  profile: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'gift_app_token';
const REFRESH_TOKEN_KEY = 'gift_app_refresh_token';
const TOKEN_EXPIRES_AT_KEY = 'gift_app_token_expires_at';

const REFRESH_BEFORE_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');
  const hasActiveSessionRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hasActiveSessionRef.current = !!token;
  }, [token]);

  useEffect(() => {
    return onSessionExpired(() => {
      if (!hasActiveSessionRef.current) return;
      setSessionEmail(profile?.email || sessionEmail);
      setSessionExpired(true);
    });
  }, [profile?.email, sessionEmail]);

  useEffect(() => {
    bootstrap();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const scheduleRefresh = useCallback((expiresAt: number, rt: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const delay = expiresAt - Date.now() - REFRESH_BEFORE_MS;

    if (delay <= 0) {
      doRefresh(rt);
      return;
    }

    refreshTimerRef.current = setTimeout(() => doRefresh(rt), delay);
  }, []);

  const doRefresh = useCallback(async (rt: string) => {
    try {
      const result = await refreshTokenRequest(rt);
      const expiresAt = Date.now() + parseInt(result.expiresIn, 10) * 1000;

      await secureMultiSet([
        [TOKEN_KEY, result.token],
        [REFRESH_TOKEN_KEY, result.refreshToken],
        [TOKEN_EXPIRES_AT_KEY, String(expiresAt)],
      ]);

      setToken(result.token);
      scheduleRefresh(expiresAt, result.refreshToken);
    } catch {
      setSessionEmail(profile?.email || '');
      setSessionExpired(true);
    }
  }, [profile?.email, scheduleRefresh]);

  const bootstrap = async () => {
    try {
      const pairs = await secureMultiGet([TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRES_AT_KEY]);
      const savedToken = pairs.find(([k]) => k === TOKEN_KEY)?.[1] ?? null;
      const savedRefreshToken = pairs.find(([k]) => k === REFRESH_TOKEN_KEY)?.[1] ?? null;
      const savedExpiresAt = pairs.find(([k]) => k === TOKEN_EXPIRES_AT_KEY)?.[1] ?? null;

      if (!savedToken || !savedRefreshToken) {
        setLoading(false);
        return;
      }

      const expiresAt = savedExpiresAt ? parseInt(savedExpiresAt, 10) : 0;
      const isExpired = Date.now() >= expiresAt - REFRESH_BEFORE_MS;

      if (isExpired) {
        const result = await refreshTokenRequest(savedRefreshToken);
        const newExpiresAt = Date.now() + parseInt(result.expiresIn, 10) * 1000;

        await secureMultiSet([
          [TOKEN_KEY, result.token],
          [REFRESH_TOKEN_KEY, result.refreshToken],
          [TOKEN_EXPIRES_AT_KEY, String(newExpiresAt)],
        ]);

        setToken(result.token);
        const myProfile = await meRequest(result.token);
        setProfile(myProfile);
        scheduleRefresh(newExpiresAt, result.refreshToken);
      } else {
        setToken(savedToken);
        const myProfile = await meRequest(savedToken);
        setProfile(myProfile);
        scheduleRefresh(expiresAt, savedRefreshToken);
      }
    } catch {
      await secureMultiDelete([TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRES_AT_KEY]);
      setToken(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const persistSession = async (idToken: string, rt: string, expiresIn: string) => {
    const expiresAt = Date.now() + parseInt(expiresIn, 10) * 1000;
    await secureMultiSet([
      [TOKEN_KEY, idToken],
      [REFRESH_TOKEN_KEY, rt],
      [TOKEN_EXPIRES_AT_KEY, String(expiresAt)],
    ]);
    setToken(idToken);
    scheduleRefresh(expiresAt, rt);
  };

  const login = async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    await persistSession(result.token, result.refreshToken, result.expiresIn);
    setSessionExpired(false);
    setSessionEmail('');
    const myProfile = await meRequest(result.token);
    setProfile(myProfile);
  };

  const register = async (payload: RegisterPayload): Promise<RegisterResult> => {
    await registerRequest(payload);
    try {
      await login(payload.email, payload.password);
      return { autoLoginSuccess: true };
    } catch {
      return { autoLoginSuccess: false };
    }
  };

  const forgotPassword = async (email: string) => {
    await forgotPasswordRequest(email);
  };

  const logout = async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await secureMultiDelete([TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRES_AT_KEY]);
    setToken(null);
    setProfile(null);
    setSessionExpired(false);
  };

  const refreshProfile = async () => {
    if (!token) return;
    const myProfile = await meRequest(token);
    setProfile(myProfile);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        token,
        profile,
        login,
        register,
        forgotPassword,
        logout,
        refreshProfile,
      }}
    >
      {children}
      <SessionExpiredModal
        visible={sessionExpired}
        prefillEmail={sessionEmail || profile?.email || ''}
        onLogin={login}
        onLogout={logout}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
