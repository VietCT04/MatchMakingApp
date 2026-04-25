import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { UserDto } from '@sports-matchmaking/shared';
import { ApiError, apiClient, setAccessToken, setUnauthorizedHandler } from '../lib/api';

const TOKEN_KEY = 'sports-matchmaking.accessToken';

type AuthContextValue = {
  user: UserDto | null;
  token: string | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<UserDto | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function clearSession() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAccessToken(null);
    setToken(null);
    setUser(null);
  }

  async function persistToken(nextToken: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken);
    setAccessToken(nextToken);
    setToken(nextToken);
  }

  async function refreshMeInternal(): Promise<UserDto | null> {
    try {
      const me = await apiClient.getMe();
      setUser(me);
      return me;
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        await clearSession();
        return null;
      }
      throw error;
    }
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession().catch(() => undefined);
    });

    async function restoreSession() {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!storedToken) {
          return;
        }
        setAccessToken(storedToken);
        setToken(storedToken);
        await refreshMeInternal();
      } catch {
        await clearSession();
      } finally {
        setAuthLoading(false);
      }
    }

    restoreSession();

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      authLoading,
      async login(email: string, password: string) {
        const response = await apiClient.login({ email, password });
        await persistToken(response.accessToken);
        await refreshMeInternal();
      },
      async register(email: string, password: string, displayName: string) {
        const response = await apiClient.register({ email, password, displayName });
        await persistToken(response.accessToken);
        await refreshMeInternal();
      },
      async logout() {
        await clearSession();
      },
      async refreshMe() {
        return refreshMeInternal();
      },
    }),
    [authLoading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
