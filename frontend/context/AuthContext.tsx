import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginRequest,
  meRequest,
  registerRequest,
  forgotPasswordRequest,
  RegisterPayload,
} from '../services/authApi';
import { UserProfile } from '../types/user';

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

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);

      if (!savedToken) {
        setLoading(false);
        return;
      }

      setToken(savedToken);
      const myProfile = await meRequest(savedToken);
      setProfile(myProfile);
    } catch {
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