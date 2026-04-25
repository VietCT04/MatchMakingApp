import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MatchStatus, MatchParticipantStatus, Team, type MatchResultDto, type MatchWithDetailsDto } from '@sports-matchmaking/shared';
import { DEMO_USER_ID } from '../../src/config/demoUser';
import { apiClient } from '../../src/lib/api';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [match, setMatch] = useState<MatchWithDetailsDto | null>(null);
  const [pendingResult, setPendingResult] = useState<MatchResultDto | null>(null);
  const [teamAScore, setTeamAScore] = useState('21');
  const [teamBScore, setTeamBScore] = useState('17');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const matchId = String(id ?? '');

  async function loadMatch() {
    if (!matchId) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.getMatchById(matchId);
      setMatch(response);
      setPendingResult(response.result ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load match.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  const joinedParticipants = useMemo(
    () => match?.participants?.filter((item) => item.status === MatchParticipantStatus.JOINED) ?? [],
    [match],
  );
  const currentParticipant = joinedParticipants.find((item) => item.userId === DEMO_USER_ID);
  const canJoin = match?.status === MatchStatus.OPEN && !currentParticipant;
  const canLeave = Boolean(currentParticipant) && match?.status !== MatchStatus.COMPLETED;

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await loadMatch();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function submitResult() {
    const parsedA = Number(teamAScore);
    const parsedB = Number(teamBScore);
    if (!Number.isInteger(parsedA) || !Number.isInteger(parsedB) || parsedA < 0 || parsedB < 0) {
      setError('Scores must be non-negative whole numbers.');
      return;
    }

    await runAction(
      async () => {
        const result = await apiClient.submitMatchResult(matchId, {
          submittedByUserId: DEMO_USER_ID,
          teamAScore: parsedA,
          teamBScore: parsedB,
        });
        setPendingResult(result);
      },
      'Result submitted for verification.',
    );
  }

  async function verifyResult() {
    const resultId = pendingResult?.id ?? match?.result?.id;
    if (!resultId) {
      setError('Submit a result before verifying.');
      return;
    }
    await runAction(() => apiClient.verifyMatchResult(matchId, resultId, DEMO_USER_ID), 'Result verified and ratings updated.');
  }

  async function addDemoOpponent() {
    await runAction(async () => {
      const users = await apiClient.getUsers();
      const opponent = users.find((user) => user.id !== DEMO_USER_ID);
      if (!opponent) {
        throw new Error('No seeded opponent user found.');
      }
      await apiClient.joinMatch(matchId, opponent.id, Team.B);
    }, 'Seeded opponent joined team B.');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Match Detail</Text>
      {loading ? <Text style={styles.muted}>Loading match...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
                {participant.userId === DEMO_USER_ID ? 'Demo user' : participant.userId} | Team {participant.team}
              </Text>
            ))}
          </View>

          <View style={styles.actionRow}>
            {canJoin ? (
              <>
                <Pressable style={styles.button} disabled={busy} onPress={() => runAction(() => apiClient.joinMatch(match.id, DEMO_USER_ID, Team.A), 'Joined team A.')}>
                  <Text style={styles.buttonText}>Join A</Text>
                </Pressable>
                <Pressable style={styles.button} disabled={busy} onPress={() => runAction(() => apiClient.joinMatch(match.id, DEMO_USER_ID, Team.B), 'Joined team B.')}>
                  <Text style={styles.buttonText}>Join B</Text>
                </Pressable>
              </>
            ) : null}
            {canLeave ? (
              <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => runAction(() => apiClient.leaveMatch(match.id, DEMO_USER_ID), 'Left match.')}>
                <Text style={styles.secondaryButtonText}>Leave</Text>
              </Pressable>
            ) : null}
            {currentParticipant && !joinedParticipants.some((participant) => participant.team === Team.B) ? (
              <Pressable style={styles.secondaryButton} disabled={busy} onPress={addDemoOpponent}>
                <Text style={styles.secondaryButtonText}>Add Demo Opponent</Text>
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
            <View style={styles.scoreRow}>
              <TextInput style={styles.scoreInput} value={teamAScore} onChangeText={setTeamAScore} keyboardType="number-pad" placeholder="Team A" />
              <TextInput style={styles.scoreInput} value={teamBScore} onChangeText={setTeamBScore} keyboardType="number-pad" placeholder="Team B" />
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.button} disabled={busy || !currentParticipant} onPress={submitResult}>
                <Text style={styles.buttonText}>Submit Result</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} disabled={busy || !pendingResult || pendingResult.verified} onPress={verifyResult}>
                <Text style={styles.secondaryButtonText}>Verify</Text>
              </Pressable>
            </View>
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
