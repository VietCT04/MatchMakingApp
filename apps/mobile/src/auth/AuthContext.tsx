import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { UserDto } from '@sports-matchmaking/shared';
import { ApiError, apiClient, setAccessToken, setUnauthorizedHandler } from '../lib/api';
import { setupNotificationTapNavigation } from '../notifications/notificationNavigation';
import { registerForPushNotifications } from '../notifications/registerForPushNotifications';

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
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

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

  async function registerPushForCurrentUser() {
    try {
      const registration = await registerForPushNotifications();
      if (!registration.expoPushToken) {
        return;
      }
      await apiClient.registerPushDevice({
        expoPushToken: registration.expoPushToken,
        platform: registration.platform,
      });
      setExpoPushToken(registration.expoPushToken);
    } catch {
      // Push registration should not block auth flow.
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
        const me = await refreshMeInternal();
        if (me) {
          await registerPushForCurrentUser();
        }
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

  useEffect(() => {
    const cleanupPushNavigation = setupNotificationTapNavigation(() => Boolean(token));
    return () => {
      cleanupPushNavigation();
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      authLoading,
      async login(email: string, password: string) {
        const response = await apiClient.login({ email, password });
        await persistToken(response.accessToken);
        const me = await refreshMeInternal();
        if (me) {
          await registerPushForCurrentUser();
        }
      },
      async register(email: string, password: string, displayName: string) {
        const response = await apiClient.register({ email, password, displayName });
        await persistToken(response.accessToken);
        const me = await refreshMeInternal();
        if (me) {
          await registerPushForCurrentUser();
        }
      },
      async logout() {
        if (expoPushToken) {
          try {
            await apiClient.deactivatePushDevice(expoPushToken);
          } catch {
            // Deactivation failures should not block logout.
          }
        }
        await clearSession();
        setExpoPushToken(null);
      },
      async refreshMe() {
        return refreshMeInternal();
      },
    }),
    [authLoading, expoPushToken, token, user],
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
