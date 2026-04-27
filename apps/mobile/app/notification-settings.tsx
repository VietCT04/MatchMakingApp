import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';
import type { NotificationPreferenceDto } from '@sports-matchmaking/shared';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { AppCard } from '../src/components/ui/AppCard';
import { AppButton } from '../src/components/ui/AppButton';
import { AppInput } from '../src/components/ui/AppInput';
import { LoadingState } from '../src/components/states/LoadingState';
import { ErrorState } from '../src/components/states/ErrorState';
import { apiClient } from '../src/lib/api';
import { colors } from '../src/components/ui/tokens';

type PreferenceKey =
  | 'matchUpdates'
  | 'chatMessages'
  | 'results'
  | 'trustSafety'
  | 'ratingUpdates'
  | 'quietHoursEnabled';

const preferenceRows: Array<{ key: PreferenceKey; label: string; description: string }> = [
  {
    key: 'matchUpdates',
    label: 'Match updates',
    description: 'Join, leave, and cancellation updates.',
  },
  {
    key: 'chatMessages',
    label: 'Chat messages',
    description: 'New messages from your match chat.',
  },
  {
    key: 'results',
    label: 'Results',
    description: 'Result submitted and verification updates.',
  },
  {
    key: 'trustSafety',
    label: 'Trust and safety',
    description: 'No-show, dispute, and report updates.',
  },
  {
    key: 'ratingUpdates',
    label: 'Rating updates',
    description: 'Elo and rating change updates.',
  },
];

function toEditable(preferences: NotificationPreferenceDto) {
  return {
    matchUpdates: preferences.matchUpdates,
    chatMessages: preferences.chatMessages,
    results: preferences.results,
    trustSafety: preferences.trustSafety,
    ratingUpdates: preferences.ratingUpdates,
    quietHoursEnabled: preferences.quietHoursEnabled,
    quietHoursStart: preferences.quietHoursStart ?? '22:00',
    quietHoursEnd: preferences.quietHoursEnd ?? '08:00',
    timezone: preferences.timezone ?? 'Asia/Singapore',
  };
}

function isValidHHmm(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export default function NotificationSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [serverPreferences, setServerPreferences] = useState<NotificationPreferenceDto | null>(null);
  const [draft, setDraft] = useState<ReturnType<typeof toEditable> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const preferences = await apiClient.getNotificationPreferences();
      setServerPreferences(preferences);
      setDraft(toEditable(preferences));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notification settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const hasChanges = useMemo(() => {
    if (!serverPreferences || !draft) {
      return false;
    }
    const base = toEditable(serverPreferences);
    return (
      base.matchUpdates !== draft.matchUpdates ||
      base.chatMessages !== draft.chatMessages ||
      base.results !== draft.results ||
      base.trustSafety !== draft.trustSafety ||
      base.ratingUpdates !== draft.ratingUpdates ||
      base.quietHoursEnabled !== draft.quietHoursEnabled ||
      base.quietHoursStart !== draft.quietHoursStart ||
      base.quietHoursEnd !== draft.quietHoursEnd ||
      base.timezone !== draft.timezone
    );
  }, [draft, serverPreferences]);

  async function handleSave() {
    if (!draft) {
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (draft.quietHoursEnabled) {
        if (!isValidHHmm(draft.quietHoursStart) || !isValidHHmm(draft.quietHoursEnd)) {
          setError('Quiet hours start and end must be in HH:mm format.');
          return;
        }
      }
      const updated = await apiClient.updateNotificationPreferences(draft);
      setServerPreferences(updated);
      setDraft(toEditable(updated));
      setSuccess('Notification preferences saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save notification settings.');
    } finally {
      setSaving(false);
    }
  }

  function handleToggle(key: PreferenceKey, value: boolean) {
    setSuccess('');
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        [key]: value,
      };
    });
  }

  return (
    <Screen>
      <ScreenHeader title="Notification settings" subtitle="Choose which push notifications you want to receive." />

      <AppButton variant="secondary" onPress={() => router.back()}>
        Back to notifications
      </AppButton>

      {loading ? <LoadingState message="Loading notification settings..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}

      {!loading && !error && draft ? (
        <>
          <AppCard>
            {preferenceRows.map((row) => (
              <View key={row.key} style={styles.preferenceRow}>
                <View style={styles.preferenceTextWrap}>
                  <Text style={styles.preferenceLabel}>{row.label}</Text>
                  <Text style={styles.preferenceDescription}>{row.description}</Text>
                </View>
                <Switch
                  value={draft[row.key]}
                  onValueChange={(value) => handleToggle(row.key, value)}
                  trackColor={{ false: '#c5d0e0', true: '#9db5ef' }}
                  thumbColor={draft[row.key] ? colors.primary : '#f4f3f4'}
                />
              </View>
            ))}
          </AppCard>

          <AppCard>
            <Text style={styles.preferenceLabel}>Quiet hours</Text>
            <Text style={styles.preferenceDescription}>Push notifications are paused during quiet hours.</Text>
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>Enable quiet hours</Text>
              <Switch
                value={draft.quietHoursEnabled}
                onValueChange={(value) => handleToggle('quietHoursEnabled', value)}
                trackColor={{ false: '#c5d0e0', true: '#9db5ef' }}
                thumbColor={draft.quietHoursEnabled ? colors.primary : '#f4f3f4'}
              />
            </View>
            <AppInput
              label="Quiet hours start (HH:mm)"
              value={draft.quietHoursStart}
              onChangeText={(value) =>
                setDraft((current) => (current ? { ...current, quietHoursStart: value } : current))
              }
              placeholder="22:00"
            />
            <AppInput
              label="Quiet hours end (HH:mm)"
              value={draft.quietHoursEnd}
              onChangeText={(value) =>
                setDraft((current) => (current ? { ...current, quietHoursEnd: value } : current))
              }
              placeholder="08:00"
            />
            <AppInput
              label="Timezone"
              value={draft.timezone}
              onChangeText={(value) => setDraft((current) => (current ? { ...current, timezone: value } : current))}
              placeholder="Asia/Singapore"
            />
          </AppCard>

          {success ? <Text style={styles.successText}>{success}</Text> : null}
          <AppButton onPress={() => void handleSave()} loading={saving} disabled={!hasChanges}>
            Save preferences
          </AppButton>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  preferenceTextWrap: {
    flex: 1,
    gap: 2,
  },
  preferenceLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  preferenceDescription: {
    color: colors.muted,
    fontSize: 13,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
});
