import { router } from 'expo-router';

type IsAuthenticated = () => boolean;

export function setupNotificationTapNavigation(isAuthenticated: IsAuthenticated): () => void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');
    const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const isAuthed = isAuthenticated();
      if (!isAuthed) {
        router.replace('/login');
        return;
      }

      const data = response?.notification?.request?.content?.data as Record<string, unknown> | undefined;
      const matchId = data && typeof data.matchId === 'string' ? data.matchId : null;
      if (matchId) {
        router.push({ pathname: '/match/[id]', params: { id: matchId } });
        return;
      }

      router.push('/notifications');
    });
    return () => {
      subscription?.remove?.();
    };
  } catch {
    return () => undefined;
  }
}
