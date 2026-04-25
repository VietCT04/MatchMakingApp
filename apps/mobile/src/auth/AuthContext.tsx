import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { UserDto } from '@sports-matchmaking/shared';
import { apiClient, setAccessToken } from '../lib/api';

const TOKEN_KEY = 'sports-matchmaking.accessToken';

type AuthContextValue = {
  user: AuthSessionUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

type AuthSessionUser = Pick<UserDto, 'id' | 'email' | 'displayName'>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      setAccessToken(storedToken);
      setToken(storedToken);
      try {
        setUser(await apiClient.getMe());
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setAccessToken(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function persistSession(accessToken: string, nextUser: AuthSessionUser) {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    setAccessToken(accessToken);
    setToken(accessToken);
    setUser(nextUser);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      async login(email: string, password: string) {
        const response = await apiClient.login({ email, password });
        await persistSession(response.accessToken, response.user);
      },
      async register(email: string, password: string, displayName: string) {
        const response = await apiClient.register({ email, password, displayName });
        await persistSession(response.accessToken, response.user);
      },
      async logout() {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setAccessToken(null);
        setToken(null);
        setUser(null);
      },
      async refreshMe() {
        setUser(await apiClient.getMe());
      },
    }),
    [loading, token, user],
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
