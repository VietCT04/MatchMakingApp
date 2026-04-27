import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ChatMessageDto, MatchWithDetailsDto } from '@sports-matchmaking/shared';
import { useAuth } from '../../src/auth/AuthContext';
import { apiClient } from '../../src/lib/api';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppButton } from '../../src/components/ui/AppButton';
import { LoadingState } from '../../src/components/states/LoadingState';
import { ErrorState } from '../../src/components/states/ErrorState';
import { EmptyState } from '../../src/components/states/EmptyState';
import { colors } from '../../src/components/ui/tokens';

const POLL_INTERVAL_MS = 8000;

export default function MatchChatScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = typeof id === 'string' ? id : undefined;

  const [match, setMatch] = useState<MatchWithDetailsDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const fetchMessages = useCallback(
    async (showLoading: boolean) => {
      if (!matchId) {
        setError('Match ID is missing.');
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }
      setError('');
      try {
        const nextMessages = await apiClient.getMatchMessages(matchId, { limit: 100 });
        setMessages(nextMessages);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load chat messages.');
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [matchId],
  );

  const fetchMatch = useCallback(async () => {
    if (!matchId) {
      return;
    }
    try {
      const nextMatch = await apiClient.getMatchById(matchId);
      setMatch(nextMatch);
    } catch {
      setMatch(null);
    }
  }, [matchId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchMatch(), fetchMessages(false)]);
  }, [fetchMatch, fetchMessages]);

  useEffect(() => {
    async function load() {
      if (!matchId) {
        setError('Match ID is missing.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const [nextMatch, nextMessages] = await Promise.all([
          apiClient.getMatchById(matchId),
          apiClient.getMatchMessages(matchId, { limit: 100 }),
        ]);
        setMatch(nextMatch);
        setMessages(nextMessages);
        await apiClient.markChatRead(matchId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load chat.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [matchId]);

  useFocusEffect(
    useCallback(() => {
      if (!matchId) {
        return () => undefined;
      }
      void apiClient.markChatRead(matchId).catch(() => undefined);
      const timer = setInterval(() => {
        void fetchMessages(false);
      }, POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [fetchMessages, matchId]),
  );

  const canSend = useMemo(() => {
    if (!user || !match) {
      return false;
    }
    const isCreator = match.createdByUserId === user.id;
    const ownParticipant = match.participants?.find((participant) => participant.userId === user.id);

    if (match.status === 'CANCELLED') {
      return false;
    }
    if (isCreator) {
      return true;
    }
    if (!ownParticipant) {
      return false;
    }
    return ownParticipant.status === 'JOINED';
  }, [match, user]);

  async function sendMessage() {
    const body = composer.trim();
    if (!matchId) {
      setSendError('Match ID is missing.');
      return;
    }
    if (!body) {
      setSendError('Message cannot be empty.');
      return;
    }

    setSending(true);
    setSendError('');
    try {
      await apiClient.sendMatchMessage(matchId, body);
      setComposer('');
      await fetchMessages(false);
      await apiClient.markChatRead(matchId);
    } catch (nextError) {
      setSendError(nextError instanceof Error ? nextError.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader
        title="Match chat"
        subtitle={match?.title ? `${match.title} • Coordinate before the game` : 'Coordinate before the game'}
      />

      <AppButton variant="secondary" onPress={() => void refreshAll()}>
        Refresh
      </AppButton>

      {loading ? <LoadingState message="Loading chat..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void fetchMessages(true)} /> : null}
      {!loading && !error && messages.length === 0 ? (
        <EmptyState title="No messages yet." message="Say hello to your match." />
      ) : null}

      {!loading && !error ? (
        <ScrollView contentContainerStyle={styles.list}>
          {messages.map((message) => {
            const isMine = message.senderUserId === user?.id;
            return (
              <View key={message.id} style={[styles.messageWrap, isMine ? styles.messageWrapMine : styles.messageWrapOther]}>
                <AppCard>
                  {!isMine ? <Text style={styles.sender}>{message.sender.displayName}</Text> : null}
                  <Text style={styles.body}>{message.body}</Text>
                  <Text style={styles.timestamp}>{new Date(message.createdAt).toLocaleString()}</Text>
                </AppCard>
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      <AppCard>
        <AppInput
          label="Message"
          value={composer}
          onChangeText={setComposer}
          placeholder={canSend ? 'Type a message...' : 'You cannot send messages in this match state.'}
          editable={canSend && !sending}
          multiline
        />
        {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
        <AppButton onPress={() => void sendMessage()} disabled={!canSend} loading={sending}>
          Send
        </AppButton>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  messageWrap: {
    width: '100%',
  },
  messageWrapMine: {
    alignItems: 'flex-end',
  },
  messageWrapOther: {
    alignItems: 'flex-start',
  },
  sender: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  body: {
    color: colors.ink,
  },
  timestamp: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right',
  },
  sendError: {
    color: '#b42318',
    fontSize: 12,
  },
});
