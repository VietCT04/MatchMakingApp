import { useCallback, useState } from 'react';
import { Tabs, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { apiClient } from '../../src/lib/api';

export default function TabsLayout() {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        setUnreadCount(0);
        return () => undefined;
      }
      let active = true;
      void apiClient
        .getNotificationUnreadCount()
        .then((response) => {
          if (active) {
            setUnreadCount(response.count);
          }
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, [token]),
  );

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#1f4ad3',
        tabBarInactiveTintColor: '#66748e',
        tabBarStyle: {
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
          borderTopColor: '#d7e0ec',
          backgroundColor: '#ffffff',
        },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="create-match" options={{ title: 'Create' }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      />
      <Tabs.Screen name="ratings" options={{ title: 'Ratings' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
