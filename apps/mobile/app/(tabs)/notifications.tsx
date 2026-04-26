import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { NotificationDto } from '@sports-matchmaking/shared';
import { apiClient } from '../../src/lib/api';
import { registerForPushNotifications } from '../../src/notifications/registerForPushNotifications';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppButton } from '../../src/components/ui/AppButton';
import { Badge } from '../../src/components/ui/Badge';
import { LoadingState } from '../../src/components/states/LoadingState';
import { ErrorState } from '../../src/components/states/ErrorState';
import { EmptyState } from '../../src/components/states/EmptyState';
import { colors } from '../../src/components/ui/tokens';

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markAllBusy, setMarkAllBusy] = useState(false);
  const [pushStatusText, setPushStatusText] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [notifications, unread] = await Promise.all([
        apiClient.getNotifications({ limit: 50 }),
        apiClient.getNotificationUnreadCount(),
      ]);
      setItems(notifications.items);
      setUnreadCount(unread.count);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function handleMarkAllAsRead() {
    setMarkAllBusy(true);
    try {
      await apiClient.markAllNotificationsRead();
      await refresh();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Could not mark all notifications as read.');
    } finally {
      setMarkAllBusy(false);
    }
  }

  async function handleEnablePush() {
    try {
      const registration = await registerForPushNotifications();
      if (!registration.expoPushToken) {
        setPushStatusText('Push permission is not enabled.');
        return;
      }
      await apiClient.registerPushDevice({
        expoPushToken: registration.expoPushToken,
        platform: registration.platform,
      });
      setPushStatusText('Push notifications are enabled on this device.');
    } catch (error) {
      setPushStatusText(error instanceof Error ? error.message : 'Could not enable push notifications.');
    }
  }

  async function handleOpenNotification(item: NotificationDto) {
    setBusyId(item.id);
    setError('');
    try {
      if (!item.readAt) {
        await apiClient.markNotificationRead(item.id);
      }

      const data = item.data && typeof item.data === 'object' ? item.data : null;
      const matchId = data && typeof data.matchId === 'string' ? data.matchId : null;
      if (matchId) {
        router.push({ pathname: '/match/[id]', params: { id: matchId } });
      } else {
        await refresh();
      }
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Could not open notification.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Notifications" subtitle="Important updates for matches, chat, ratings, and trust/safety." />

      <View style={styles.actions}>
        <Badge tone={unreadCount > 0 ? 'info' : 'default'}>
          {unreadCount} unread
        </Badge>
        <AppButton variant="secondary" loading={markAllBusy} onPress={() => void handleMarkAllAsRead()}>
          Mark all as read
        </AppButton>
        <AppButton variant="secondary" onPress={() => void handleEnablePush()}>
          Enable push notifications
        </AppButton>
        <AppButton variant="secondary" onPress={() => router.push('/notification-settings')}>
          Notification settings
        </AppButton>
        <AppButton variant="secondary" onPress={() => void refresh()}>
          Refresh
        </AppButton>
      </View>
      {pushStatusText ? <Text style={styles.pushNote}>{pushStatusText}</Text> : null}

      {loading ? <LoadingState message="Loading notifications..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}
      {!loading && !error && items.length === 0 ? <EmptyState title="No notifications yet" message="You're all caught up." /> : null}

      {!loading && !error
        ? items.map((item) => (
            <AppCard key={item.id} onPress={() => void handleOpenNotification(item)}>
              <View style={styles.itemHeader}>
                <Text style={styles.title}>{item.title}</Text>
                {!item.readAt ? <Badge tone="info">Unread</Badge> : <Badge>Read</Badge>}
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <View style={styles.metaRow}>
                <Badge>{item.type}</Badge>
                <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              {busyId === item.id ? <Text style={styles.processing}>Opening...</Text> : null}
            </AppCard>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  body: {
    color: colors.muted,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    color: colors.muted,
    fontSize: 12,
  },
  processing: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  pushNote: {
    color: colors.muted,
    fontSize: 12,
  },
});
