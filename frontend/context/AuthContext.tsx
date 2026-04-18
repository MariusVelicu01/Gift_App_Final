import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginRequest,
  meRequest,
  registerRequest,
  forgotPasswordRequest,
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');
  const hasActiveSessionRef = useRef(false);

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
  }, []);

  const bootstrap = async () => {
    try {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);

      console.log('BOOTSTRAP TOKEN:', savedToken);

      if (!savedToken) {
        setLoading(false);
        return;
      }

      setToken(savedToken);

      const myProfile = await meRequest(savedToken);
      setProfile(myProfile);
    } catch (error) {
      console.log('BOOTSTRAP ERROR:', error);
      await AsyncStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    const receivedToken = result.token as string;

    await AsyncStorage.setItem(TOKEN_KEY, receivedToken);
    setToken(receivedToken);
    setSessionExpired(false);
    setSessionEmail('');

    const myProfile = await meRequest(receivedToken);
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
    await AsyncStorage.removeItem(TOKEN_KEY);
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
