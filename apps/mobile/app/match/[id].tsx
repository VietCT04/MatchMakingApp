import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MatchStatus, MatchParticipantStatus, Team } from '@sports-matchmaking/shared';
import { useAuth } from '../../src/auth/AuthContext';
import { apiClient } from '../../src/lib/api';
import { useMatchDetail } from '../../src/hooks/useMatchDetail';

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
  const currentParticipant = joinedParticipants.find((item) => item.userId === user?.id);
  const pendingResult = match?.result ?? null;
  const canJoin =
    Boolean(user) &&
    match?.status === MatchStatus.OPEN &&
    !currentParticipant &&
    joinedParticipants.length < (match?.maxPlayers ?? 0);
  const canLeave = Boolean(currentParticipant) && match?.status !== MatchStatus.COMPLETED;
  const canSubmitResult = Boolean(currentParticipant);
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
    } catch (actionError) {
      setActionError(actionError instanceof Error ? actionError.message : 'Action failed.');
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
      'Result submitted for verification.',
    );
  }

  async function verifyResult() {
    const resultId = pendingResult?.id;
    if (!resultId) {
      setActionError('Submit a result before verifying.');
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
          <View style={styles.section}>
            <Text style={styles.heading}>{match.title}</Text>
            <Text style={styles.line}>{match.sport?.name ?? match.sportId} at {match.venue?.name ?? 'Venue TBD'}</Text>
            <Text style={styles.line}>{new Date(match.startsAt).toLocaleString()}</Text>
            <Text style={styles.line}>{match.format} | {match.status}</Text>
            <Text style={styles.line}>Rating {match.minRating ?? 'any'}-{match.maxRating ?? 'any'}</Text>
            <Text style={styles.line}>{joinedParticipants.length}/{match.maxPlayers} players joined</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.heading}>Participants</Text>
            {joinedParticipants.length === 0 ? <Text style={styles.muted}>No joined participants yet.</Text> : null}
            {joinedParticipants.map((participant) => (
              <Text key={participant.id} style={styles.line}>
                {participant.userId === user?.id ? 'You' : `User ${participant.userId.slice(0, 8)}`} | Team {participant.team}
              </Text>
            ))}
          </View>

          <View style={styles.actionRow}>
            {canJoin ? (
              <>
                <Pressable style={styles.button} disabled={busy} onPress={() => runAction(() => apiClient.joinMatch(match.id, Team.A), 'Joined team A.')}>
                  <Text style={styles.buttonText}>Join A</Text>
                </Pressable>
                <Pressable style={styles.button} disabled={busy} onPress={() => runAction(() => apiClient.joinMatch(match.id, Team.B), 'Joined team B.')}>
                  <Text style={styles.buttonText}>Join B</Text>
                </Pressable>
              </>
            ) : null}
            {canLeave ? (
              <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => runAction(() => apiClient.leaveMatch(match.id), 'Left match.')}>
                <Text style={styles.secondaryButtonText}>Leave</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.heading}>Result</Text>
            {pendingResult ? (
              <Text style={styles.line}>
                Team A {pendingResult.teamAScore} - Team B {pendingResult.teamBScore} | {pendingResult.verified ? 'Verified' : 'Pending'}
              </Text>
            ) : (
              <Text style={styles.muted}>No result submitted.</Text>
            )}
            {canSubmitResult ? (
              <>
                <View style={styles.scoreRow}>
                  <TextInput style={styles.scoreInput} value={teamAScore} onChangeText={setTeamAScore} keyboardType="number-pad" placeholder="Team A" />
                  <TextInput style={styles.scoreInput} value={teamBScore} onChangeText={setTeamBScore} keyboardType="number-pad" placeholder="Team B" />
                </View>
                <View style={styles.actionRow}>
                  <Pressable style={styles.button} disabled={busy} onPress={submitResult}>
                    <Text style={styles.buttonText}>Submit Result</Text>
                  </Pressable>
                  {canVerify ? (
                    <Pressable style={styles.secondaryButton} disabled={busy} onPress={verifyResult}>
                      <Text style={styles.secondaryButtonText}>Verify</Text>
                    </Pressable>
                  ) : null}
                </View>
                {!canVerify && pendingResult && pendingResult.submittedByUserId === user?.id ? (
                  <Text style={styles.muted}>Result submitter cannot verify their own result.</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.muted}>Only joined participants can submit or verify results.</Text>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: '700' },
  section: { gap: 6 },
  heading: { fontSize: 18, fontWeight: '700' },
  line: { color: '#44516a' },
  messageBox: { gap: 8 },
  muted: { color: '#6f7b91' },
  error: { color: '#b42318' },
  success: { color: '#067647' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { backgroundColor: '#1f4ad3', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { borderColor: '#1f4ad3', borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryButtonText: { color: '#1f4ad3', fontWeight: '700' },
  scoreRow: { flexDirection: 'row', gap: 8 },
  scoreInput: { borderWidth: 1, borderColor: '#d0d7e2', borderRadius: 8, flex: 1, padding: 12 },
});
