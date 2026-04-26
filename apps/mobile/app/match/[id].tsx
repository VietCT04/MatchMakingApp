import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MatchParticipantStatus, MatchStatus, Team } from '@sports-matchmaking/shared';
import { useAuth } from '../../src/auth/AuthContext';
import { apiClient } from '../../src/lib/api';
import { useMatchDetail } from '../../src/hooks/useMatchDetail';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { Badge } from '../../src/components/ui/Badge';
import { LoadingState } from '../../src/components/states/LoadingState';
import { ErrorState } from '../../src/components/states/ErrorState';

function toParticipantLabel(displayName: string | undefined, userId: string, currentUserId: string | undefined) {
  if (userId === currentUserId) {
    return 'You';
  }
  return displayName ?? `Player ${userId.slice(0, 8)}`;
}

export default function MatchDetailScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = typeof id === 'string' ? id : undefined;
  const { data: match, loading, error: loadError, refresh } = useMatchDetail(matchId);
  const [teamAScore, setTeamAScore] = useState('21');
  const [teamBScore, setTeamBScore] = useState('17');
  const [disputeReason, setDisputeReason] = useState('Score is incorrect');
  const [reportReason, setReportReason] = useState('No show without notice');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  const error = actionError || loadError;
  const now = Date.now();

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
  const hasStarted = (match?.startsAt ? new Date(match.startsAt).getTime() : Number.MAX_SAFE_INTEGER) <= now;
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
  const canDispute = Boolean(currentParticipant) && Boolean(pendingResult) && !pendingResult?.verified;
  const canMarkNoShow = Boolean(user && match && match.createdByUserId === user.id && hasStarted);

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

  async function disputeResult() {
    const resultId = pendingResult?.id;
    if (!resultId) {
      setActionError('No result available to dispute yet.');
      return;
    }
    await runAction(
      () => apiClient.disputeMatchResult(matchId ?? '', resultId, disputeReason),
      'Dispute submitted and marked as OPEN.',
    );
  }

  function confirmNoShow(participantId: string, displayName: string) {
    Alert.alert(
      'Mark no-show',
      `Mark ${displayName} as no-show?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            void runAction(
              () => apiClient.markParticipantNoShow(matchId ?? '', participantId),
              `${displayName} marked as no-show.`,
            );
          },
        },
      ],
    );
  }

  function confirmReport(reportedUserId: string, displayName: string) {
    Alert.alert(
      'Report participant',
      `Report ${displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            void runAction(
              () => apiClient.reportUser({ reportedUserId, matchId, reason: reportReason }),
              `Report submitted for ${displayName}.`,
            );
          },
        },
      ],
    );
  }

  function renderTeam(title: string, participants: typeof joinedParticipants) {
    return (
      <View style={styles.teamBlock}>
        <Text style={styles.subheading}>{title}</Text>
        {participants.length === 0 ? <Text style={styles.muted}>No players yet.</Text> : null}
        {participants.map((participant) => {
          const displayName = toParticipantLabel(participant.displayName, participant.userId, user?.id);
          const reliabilityScore = participant.reliabilityScore ?? 100;
          const canMarkThisNoShow =
            canMarkNoShow &&
            participant.userId !== user?.id &&
            participant.status === MatchParticipantStatus.JOINED;
          const canReportThisUser = participant.userId !== user?.id;
          return (
            <View key={participant.id} style={styles.participantRow}>
              <View style={styles.participantText}>
                <Text style={styles.line}>{displayName}</Text>
                <Badge>{reliabilityScore} reliability</Badge>
              </View>
              <View style={styles.rowActions}>
                {canMarkThisNoShow ? (
                  <AppButton
                    variant="secondary"
                    disabled={busy}
                    onPress={() => confirmNoShow(participant.id, displayName)}
                  >
                    No-show
                  </AppButton>
                ) : null}
                {canReportThisUser ? (
                  <AppButton
                    variant="secondary"
                    disabled={busy}
                    onPress={() => confirmReport(participant.userId, displayName)}
                  >
                    Report
                  </AppButton>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Match Detail" />
      {loading ? <LoadingState message="Loading match..." /> : null}
      {error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      {match ? (
        <>
          <AppCard>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>{match.title}</Text>
              <Badge>{match.status}</Badge>
            </View>
            <Text style={styles.line}>Sport: {match.sport?.name ?? match.sportId}</Text>
            <Text style={styles.line}>Format: {match.format}</Text>
            <Text style={styles.line}>Venue: {match.venue?.name ?? 'Venue TBD'}</Text>
            <Text style={styles.line}>Date & time: {new Date(match.startsAt).toLocaleString()}</Text>
            <Text style={styles.line}>Rating range: {match.minRating ?? 'Any'}-{match.maxRating ?? 'Any'}</Text>
            <Text style={styles.line}>Players: {joinedParticipants.length}/{match.maxPlayers}</Text>
            {typeof match.fitScore === 'number' ? <Badge tone="info">{Math.round(match.fitScore)}% fit</Badge> : null}
            <Text style={styles.participationState}>
              Your status: {currentParticipant ? `Joined Team ${currentParticipant.team}` : 'Not joined'}
            </Text>
          </AppCard>

          <AppCard>
            <Text style={styles.sectionTitle}>Participants & Reliability</Text>
            {renderTeam('Team A', teamAPlayers)}
            {renderTeam('Team B', teamBPlayers)}
            {renderTeam('Unknown', unknownPlayers)}
          </AppCard>

          <AppCard>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionRow}>
              {canJoin ? (
                <>
                  <AppButton disabled={busy} onPress={() => runAction(() => apiClient.joinMatch(match.id, Team.A), 'Joined Team A.')}>Join Team A</AppButton>
                  <AppButton disabled={busy} onPress={() => runAction(() => apiClient.joinMatch(match.id, Team.B), 'Joined Team B.')}>Join Team B</AppButton>
                </>
              ) : null}
              {canLeave ? (
                <AppButton variant="secondary" disabled={busy} onPress={() => runAction(() => apiClient.leaveMatch(match.id), 'You left the match.')}>
                  Leave match
                </AppButton>
              ) : null}
            </View>
            {canMarkNoShow && !hasStarted ? <Text style={styles.muted}>No-show is available only after match start.</Text> : null}
          </AppCard>

          <AppCard>
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
                  <AppInput style={styles.halfInput} label="Team A score" value={teamAScore} onChangeText={setTeamAScore} keyboardType="number-pad" />
                  <AppInput style={styles.halfInput} label="Team B score" value={teamBScore} onChangeText={setTeamBScore} keyboardType="number-pad" />
                </View>
                <AppButton disabled={busy} onPress={submitResult}>Submit result</AppButton>
              </>
            ) : null}

            {canVerify ? <AppButton variant="secondary" disabled={busy} onPress={verifyResult}>Verify result</AppButton> : null}

            {canDispute ? (
              <>
                <AppInput
                  label="Dispute reason"
                  value={disputeReason}
                  onChangeText={setDisputeReason}
                  placeholder="Explain why the result is incorrect"
                />
                <AppButton variant="secondary" disabled={busy} onPress={disputeResult}>Dispute result</AppButton>
              </>
            ) : null}

            {currentParticipant ? (
              <AppInput
                label="Default report reason"
                value={reportReason}
                onChangeText={setReportReason}
                placeholder="Reason when reporting participants"
                helperText="Use this reason when tapping report buttons above."
              />
            ) : null}
          </AppCard>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  heading: { fontSize: 20, fontWeight: '700', color: '#20304a', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#20304a' },
  subheading: { fontWeight: '700', color: '#44516a', marginTop: 4 },
  line: { color: '#44516a' },
  participationState: { color: '#20304a', fontWeight: '600' },
  muted: { color: '#6f7b91' },
  success: { color: '#067647', fontWeight: '600' },
  teamBlock: { gap: 6 },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  participantText: { gap: 4, flex: 1 },
  rowActions: { gap: 6, alignItems: 'flex-end' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scoreRow: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
});
