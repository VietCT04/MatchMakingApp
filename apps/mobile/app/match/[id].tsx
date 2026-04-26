import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MatchParticipantStatus, MatchStatus, Team } from '@sports-matchmaking/shared';
import { useAuth } from '../../src/auth/AuthContext';
import { apiClient } from '../../src/lib/api';
import { useMatchDetail } from '../../src/hooks/useMatchDetail';

function toParticipantLabel(userId: string, currentUserId: string | undefined) {
  return userId === currentUserId ? 'You' : `Player ${userId.slice(0, 8)}`;
}

export default function MatchDetailScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = typeof id === 'string' ? id : undefined;
  const { data: match, loading, error: loadError, refresh } = useMatchDetail(matchId);
  const [teamAScore, setTeamAScore] = useState('21');
  const [teamBScore, setTeamBScore] = useState('17');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  const error = actionError || loadError;

  const joinedParticipants = useMemo(
    () => match?.participants?.filter((item) => item.status === MatchParticipantStatus.JOINED) ?? [],
    [match],
  );
  const teamAPlayers = joinedParticipants.filter((item) => item.team === Team.A);
  const teamBPlayers = joinedParticipants.filter((item) => item.team === Team.B);
  const unknownPlayers = joinedParticipants.filter((item) => item.team === Team.UNKNOWN);
  const currentParticipant = joinedParticipants.find((item) => item.userId === user?.id);
  const pendingResult = match?.result ?? null;

  const isOpen = match?.status === MatchStatus.OPEN;
  const canJoin =
    Boolean(user) &&
    isOpen &&
    !currentParticipant &&
    joinedParticipants.length < (match?.maxPlayers ?? 0);
  const canLeave = Boolean(currentParticipant) && match?.status !== MatchStatus.COMPLETED;
  const canSubmitResult = Boolean(currentParticipant) && !pendingResult;
  const canVerify =
    Boolean(currentParticipant) &&
    Boolean(pendingResult) &&
    !pendingResult?.verified &&
    pendingResult?.submittedByUserId !== user?.id;

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setActionError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function submitResult() {
    const parsedA = Number(teamAScore);
    const parsedB = Number(teamBScore);
    if (!Number.isInteger(parsedA) || !Number.isInteger(parsedB) || parsedA < 0 || parsedB < 0) {
      setActionError('Scores must be non-negative whole numbers.');
      return;
    }
    await runAction(
      () => apiClient.submitMatchResult(matchId ?? '', { teamAScore: parsedA, teamBScore: parsedB }),
      'Result submitted. Waiting for another participant to verify.',
    );
  }

  async function verifyResult() {
    const resultId = pendingResult?.id;
    if (!resultId) {
      setActionError('No result available to verify yet.');
      return;
    }
    await runAction(() => apiClient.verifyMatchResult(matchId ?? '', resultId), 'Result verified and ratings updated.');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Match Detail</Text>
      {loading ? <Text style={styles.muted}>Loading match...</Text> : null}
      {error ? (
        <View style={styles.messageBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.secondaryButton} onPress={refresh}>
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      {match ? (
        <>
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>{match.title}</Text>
              <Text style={styles.statusPill}>{match.status}</Text>
            </View>
            <Text style={styles.line}>Sport: {match.sport?.name ?? match.sportId}</Text>
            <Text style={styles.line}>Format: {match.format}</Text>
            <Text style={styles.line}>Venue: {match.venue?.name ?? 'Venue TBD'}</Text>
            <Text style={styles.line}>Date & time: {new Date(match.startsAt).toLocaleString()}</Text>
            <Text style={styles.line}>Rating range: {match.minRating ?? 'Any'}-{match.maxRating ?? 'Any'}</Text>
            <Text style={styles.line}>Players: {joinedParticipants.length}/{match.maxPlayers}</Text>
            {typeof match.fitScore === 'number' ? <Text style={styles.fitBadge}>{Math.round(match.fitScore)}% fit</Text> : null}
            <Text style={styles.participationState}>
              Your status: {currentParticipant ? `Joined Team ${currentParticipant.team}` : 'Not joined'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <Text style={styles.subheading}>Team A</Text>
            {teamAPlayers.length === 0 ? <Text style={styles.muted}>No players yet.</Text> : null}
            {teamAPlayers.map((participant) => (
              <Text key={participant.id} style={styles.line}>{toParticipantLabel(participant.userId, user?.id)}</Text>
            ))}
            <Text style={styles.subheading}>Team B</Text>
            {teamBPlayers.length === 0 ? <Text style={styles.muted}>No players yet.</Text> : null}
            {teamBPlayers.map((participant) => (
              <Text key={participant.id} style={styles.line}>{toParticipantLabel(participant.userId, user?.id)}</Text>
            ))}
            <Text style={styles.subheading}>Unknown</Text>
            {unknownPlayers.length === 0 ? <Text style={styles.muted}>No players yet.</Text> : null}
            {unknownPlayers.map((participant) => (
              <Text key={participant.id} style={styles.line}>{toParticipantLabel(participant.userId, user?.id)}</Text>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionRow}>
              {canJoin ? (
                <>
                  <Pressable
                    style={[styles.button, busy && styles.buttonDisabled]}
                    disabled={busy}
                    onPress={() => runAction(() => apiClient.joinMatch(match.id, Team.A), 'Joined Team A.')}
                  >
                    <Text style={styles.buttonText}>Join Team A</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, busy && styles.buttonDisabled]}
                    disabled={busy}
                    onPress={() => runAction(() => apiClient.joinMatch(match.id, Team.B), 'Joined Team B.')}
                  >
                    <Text style={styles.buttonText}>Join Team B</Text>
                  </Pressable>
                </>
              ) : null}
              {canLeave ? (
                <Pressable
                  style={[styles.secondaryButton, busy && styles.buttonDisabled]}
                  disabled={busy}
                  onPress={() => runAction(() => apiClient.leaveMatch(match.id), 'You left the match.')}
                >
                  <Text style={styles.secondaryButtonText}>Leave match</Text>
                </Pressable>
              ) : null}
            </View>
            {!canJoin && !canLeave ? <Text style={styles.muted}>No available participation actions right now.</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Result</Text>
            {pendingResult ? (
              <>
                <Text style={styles.line}>Team A score: {pendingResult.teamAScore}</Text>
                <Text style={styles.line}>Team B score: {pendingResult.teamBScore}</Text>
                {pendingResult.verified ? (
                  <Text style={styles.success}>Verified result. Match is completed.</Text>
                ) : (
                  <Text style={styles.muted}>Result submitted. Waiting for another participant to verify.</Text>
                )}
              </>
            ) : (
              <Text style={styles.muted}>No result submitted yet.</Text>
            )}

            {canSubmitResult ? (
              <>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreField}>
                    <Text style={styles.scoreLabel}>Team A score</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={teamAScore}
                      onChangeText={setTeamAScore}
                      keyboardType="number-pad"
                      placeholder="0"
                    />
                  </View>
                  <View style={styles.scoreField}>
                    <Text style={styles.scoreLabel}>Team B score</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={teamBScore}
                      onChangeText={setTeamBScore}
                      keyboardType="number-pad"
                      placeholder="0"
                    />
                  </View>
                </View>
                <Pressable style={[styles.button, busy && styles.buttonDisabled]} disabled={busy} onPress={submitResult}>
                  <Text style={styles.buttonText}>Submit result</Text>
                </Pressable>
              </>
            ) : null}

            {canVerify ? (
              <Pressable style={[styles.secondaryButton, busy && styles.buttonDisabled]} disabled={busy} onPress={verifyResult}>
                <Text style={styles.secondaryButtonText}>Verify result</Text>
              </Pressable>
            ) : null}
            {!canSubmitResult && !canVerify && !pendingResult?.verified ? (
              <Text style={styles.muted}>Only joined participants can submit or verify results.</Text>
            ) : null}
            {pendingResult && pendingResult.submittedByUserId === user?.id && !pendingResult.verified ? (
              <Text style={styles.muted}>You submitted this result. Another participant must verify it.</Text>
            ) : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { padding: 20, gap: 14, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#17263b' },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d5deec',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  heading: { fontSize: 20, fontWeight: '700', color: '#20304a', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#20304a' },
  subheading: { fontWeight: '700', color: '#44516a', marginTop: 4 },
  line: { color: '#44516a' },
  participationState: { color: '#20304a', fontWeight: '600' },
  statusPill: {
    fontSize: 12,
    color: '#20304a',
    backgroundColor: '#e7ecf7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: '700',
  },
  fitBadge: {
    color: '#1f4ad3',
    fontWeight: '700',
    backgroundColor: '#e9efff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  messageBox: { gap: 8 },
  muted: { color: '#6f7b91' },
  error: { color: '#b42318' },
  success: { color: '#067647', fontWeight: '600' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { backgroundColor: '#1f4ad3', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { borderColor: '#1f4ad3', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' },
  secondaryButtonText: { color: '#1f4ad3', fontWeight: '700' },
  buttonDisabled: { opacity: 0.65 },
  scoreRow: { flexDirection: 'row', gap: 8 },
  scoreField: { flex: 1, gap: 6 },
  scoreLabel: { color: '#44516a', fontWeight: '600' },
  scoreInput: { borderWidth: 1, borderColor: '#c9d3e6', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
});
