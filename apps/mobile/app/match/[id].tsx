import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MatchParticipantStatus, MatchStatus, Team } from '@sports-matchmaking/shared';
import { useAuth } from '../../src/auth/AuthContext';
import { apiClient } from '../../src/lib/api';
import { useMatchDetail } from '../../src/hooks/useMatchDetail';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppButton } from '../../src/components/ui/AppButton';
import { LoadingState } from '../../src/components/states/LoadingState';
import { ErrorState } from '../../src/components/states/ErrorState';
import { EmptyState } from '../../src/components/states/EmptyState';
import { MatchHeroCard } from '../../src/components/match/MatchHeroCard';
import { MatchStatusTimeline } from '../../src/components/match/MatchStatusTimeline';
import { TeamRosterCard } from '../../src/components/match/TeamRosterCard';
import { MatchActionPanel } from '../../src/components/match/MatchActionPanel';
import { MatchResultCard } from '../../src/components/match/MatchResultCard';
import { TrustSafetyPanel } from '../../src/components/match/TrustSafetyPanel';
import { colors } from '../../src/components/ui/tokens';

type FeedbackTone = 'success' | 'error';

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
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [disputedResultIds, setDisputedResultIds] = useState<string[]>([]);
  const [isMatchMuted, setIsMatchMuted] = useState(false);
  const [muteUntil, setMuteUntil] = useState<string | null>(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const now = Date.now();
  const participants = match?.participants ?? [];

  const joinedParticipants = useMemo(
    () => participants.filter((item) => item.status === MatchParticipantStatus.JOINED),
    [participants],
  );
  const teamAPlayers = participants.filter((item) => item.team === Team.A);
  const teamBPlayers = participants.filter((item) => item.team === Team.B);
  const unknownPlayers = participants.filter((item) => item.team === Team.UNKNOWN);
  const joinedParticipantCount = joinedParticipants.length;

  const participantNameByUserId = useMemo(
    () =>
      new Map(
        participants.map((participant) => [
          participant.userId,
          participant.displayName?.trim() || `Player ${participant.userId.slice(0, 8)}`,
        ]),
      ),
    [participants],
  );

  const averageReliabilityScore = useMemo(() => {
    if (joinedParticipants.length === 0) {
      return match?.fitBreakdown?.reliabilityScore;
    }
    const total = joinedParticipants.reduce((sum, participant) => sum + (participant.reliabilityScore ?? 100), 0);
    return total / joinedParticipants.length;
  }, [joinedParticipants, match?.fitBreakdown?.reliabilityScore]);

  const currentParticipant = joinedParticipants.find((item) => item.userId === user?.id);
  const currentUserParticipation = participants.find((item) => item.userId === user?.id);
  const pendingResult = match?.result ?? null;
  const hasDisputedCurrentResult = pendingResult?.id ? disputedResultIds.includes(pendingResult.id) : false;

  const isOpen = match?.status === MatchStatus.OPEN;
  const hasStarted = (match?.startsAt ? new Date(match.startsAt).getTime() : Number.MAX_SAFE_INTEGER) <= now;
  const canJoin =
    Boolean(user) &&
    isOpen &&
    !currentParticipant &&
    joinedParticipantCount < (match?.maxPlayers ?? 0);
  const canLeave =
    Boolean(currentParticipant) &&
    match?.status !== MatchStatus.COMPLETED &&
    match?.status !== MatchStatus.CANCELLED;
  const canSubmitResult = Boolean(currentParticipant) && !pendingResult;
  const canVerify =
    Boolean(currentParticipant) &&
    Boolean(pendingResult) &&
    !pendingResult?.verified &&
    pendingResult?.submittedByUserId !== user?.id;
  const canDispute =
    Boolean(currentParticipant) &&
    Boolean(pendingResult) &&
    !pendingResult?.verified;
  const canMarkNoShowBase =
    Boolean(user && match && match.createdByUserId === user.id && hasStarted) &&
    match?.status !== MatchStatus.CANCELLED &&
    match?.status !== MatchStatus.COMPLETED;
  const canReadChat = Boolean(
    user &&
      match &&
      (match.createdByUserId === user.id || currentUserParticipation),
  );

  const loadNotificationControls = useCallback(async () => {
    if (!matchId || !user) {
      setIsMatchMuted(false);
      setMuteUntil(null);
      setChatUnreadCount(0);
      return;
    }

    try {
      const [matchPreference, unread] = await Promise.all([
        apiClient.getMatchNotificationPreference(matchId),
        canReadChat ? apiClient.getChatUnreadCount(matchId) : Promise.resolve({ count: 0 }),
      ]);
      setIsMatchMuted(matchPreference.muted);
      setMuteUntil(matchPreference.muteUntil ?? null);
      setChatUnreadCount(unread.count);
    } catch {
      // Keep core match detail usable even if preference/read-state fetch fails.
    }
  }, [canReadChat, matchId, user]);

  useFocusEffect(
    useCallback(() => {
      void loadNotificationControls();
    }, [loadNotificationControls]),
  );

  function setErrorFeedback(message: string) {
    setFeedback({ tone: 'error', message });
  }

  function setSuccessFeedback(message: string) {
    setFeedback({ tone: 'success', message });
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setSuccessFeedback(success);
      await refresh();
    } catch (nextError) {
      setErrorFeedback(nextError instanceof Error ? nextError.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function submitResult() {
    const parsedA = Number(teamAScore);
    const parsedB = Number(teamBScore);
    if (!Number.isInteger(parsedA) || !Number.isInteger(parsedB) || parsedA < 0 || parsedB < 0) {
      setErrorFeedback('Scores must be non-negative whole numbers.');
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
      setErrorFeedback('No result available to verify yet.');
      return;
    }
    await runAction(() => apiClient.verifyMatchResult(matchId ?? '', resultId), 'Result verified and ratings updated.');
  }

  async function disputeResult() {
    const resultId = pendingResult?.id;
    if (!resultId) {
      setErrorFeedback('No result available to dispute yet.');
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      await apiClient.disputeMatchResult(matchId ?? '', resultId, disputeReason);
      setDisputedResultIds((prev) => (prev.includes(resultId) ? prev : [...prev, resultId]));
      setSuccessFeedback('Dispute submitted and marked as OPEN.');
      await refresh();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Could not submit dispute.';
      if (message.toLowerCase().includes('duplicate dispute')) {
        setDisputedResultIds((prev) => (prev.includes(resultId) ? prev : [...prev, resultId]));
        setErrorFeedback('You already submitted a dispute for this result.');
      } else {
        setErrorFeedback(message);
      }
    } finally {
      setBusy(false);
    }
  }

  function confirmNoShow(participantId: string, displayName: string) {
    Alert.alert('Mark no-show', `Mark ${displayName} as no-show?`, [
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
    ]);
  }

  function confirmReport(reportedUserId: string, displayName: string) {
    Alert.alert('Report participant', `Report ${displayName}?`, [
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
    ]);
  }

  function canMarkNoShowForParticipant(participantUserId: string, participantStatus: MatchParticipantStatus): boolean {
    if (!canMarkNoShowBase || participantUserId === user?.id) {
      return false;
    }
    return participantStatus === MatchParticipantStatus.JOINED;
  }

  function toActionHelperText(): string {
    if (!match) {
      return 'Match data is unavailable.';
    }
    if (match.status === MatchStatus.CANCELLED) {
      return 'This match is cancelled.';
    }
    if (match.status === MatchStatus.FULL) {
      return 'Match is full. Join is currently unavailable.';
    }
    if (!user) {
      return 'Please log in to manage participation.';
    }
    if (currentParticipant) {
      return 'You are already in this match.';
    }
    return 'No available action right now.';
  }

  async function setMatchMute(muted: boolean, nextMuteUntil?: string | null) {
    if (!matchId) {
      return;
    }
    setNotificationBusy(true);
    setFeedback(null);
    try {
      const updated = await apiClient.updateMatchNotificationPreference(matchId, {
        muted,
        muteUntil: nextMuteUntil ?? null,
      });
      setIsMatchMuted(updated.muted);
      setMuteUntil(updated.muteUntil);
      setSuccessFeedback(
        muted
          ? nextMuteUntil
            ? 'Push notifications muted for this match until selected time.'
            : 'Push notifications muted for this match.'
          : 'Push notifications unmuted for this match.',
      );
    } catch (nextError) {
      setErrorFeedback(nextError instanceof Error ? nextError.message : 'Could not update match notification preference.');
    } finally {
      setNotificationBusy(false);
    }
  }

  function muteUntilTomorrowIso() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow.toISOString();
  }

  return (
    <Screen>
      <ScreenHeader title="Match detail" subtitle="Review teams, manage actions, and complete result verification." />
      {loading ? <LoadingState message="Loading match..." /> : null}
      {!loading && loadError ? <ErrorState message={loadError} onRetry={refresh} /> : null}
      {!loading && !loadError && !match ? (
        <EmptyState title="Match not found." message="This match may have been removed or is unavailable." />
      ) : null}
      {feedback ? (
        <AppCard>
          <Text style={feedback.tone === 'success' ? styles.successText : styles.errorText}>{feedback.message}</Text>
        </AppCard>
      ) : null}

      {match ? (
        <>
          <MatchHeroCard
            match={match}
            joinedCount={joinedParticipantCount}
            currentParticipant={currentParticipant}
            averageReliabilityScore={averageReliabilityScore}
          />

          <MatchStatusTimeline
            status={match.status}
            hasResult={Boolean(pendingResult)}
            isResultVerified={Boolean(pendingResult?.verified)}
          />

          <TeamRosterCard
            title="Team A"
            participants={teamAPlayers}
            currentUserId={user?.id}
            emptyMessage="No Team A players yet."
          />
          <TeamRosterCard
            title="Team B"
            participants={teamBPlayers}
            currentUserId={user?.id}
            emptyMessage="No Team B players yet."
          />
          <TeamRosterCard
            title="Unknown team"
            participants={unknownPlayers}
            currentUserId={user?.id}
            emptyMessage="No unassigned players."
          />

          <MatchActionPanel
            status={match.status}
            canJoin={canJoin}
            canLeave={canLeave}
            busy={busy}
            onJoinTeamA={() => void runAction(() => apiClient.joinMatch(match.id, Team.A), 'Joined Team A.')}
            onJoinTeamB={() => void runAction(() => apiClient.joinMatch(match.id, Team.B), 'Joined Team B.')}
            onLeave={() => void runAction(() => apiClient.leaveMatch(match.id), 'You left the match.')}
            helperText={toActionHelperText()}
          />

          {canReadChat ? (
            <AppCard>
              <Text style={styles.sectionTitle}>Match chat</Text>
              <Text style={styles.sectionBody}>
                Coordinate arrival time, court notes, and quick updates with match players.
              </Text>
              <Text style={styles.sectionBody}>
                {chatUnreadCount > 0 ? `${chatUnreadCount} unread messages` : 'No unread messages'}
              </Text>
              <AppButton
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: '/match-chat/[id]',
                    params: { id: match.id },
                  })
                }
              >
                {chatUnreadCount > 0 ? `Open chat • ${chatUnreadCount} unread` : 'Open chat'}
              </AppButton>
            </AppCard>
          ) : null}

          {canReadChat ? (
            <AppCard>
              <Text style={styles.sectionTitle}>Match notifications</Text>
              <Text style={styles.sectionBody}>
                {isMatchMuted
                  ? muteUntil
                    ? `Push notifications are muted for this match until ${new Date(muteUntil).toLocaleString()}.`
                    : 'Push notifications are muted for this match.'
                  : 'Push notifications are active for this match.'}
              </Text>
              <AppButton
                variant="secondary"
                loading={notificationBusy}
                onPress={() => void setMatchMute(!isMatchMuted, null)}
              >
                {isMatchMuted ? 'Unmute match notifications' : 'Mute match notifications'}
              </AppButton>
              {!isMatchMuted ? (
                <AppButton
                  variant="secondary"
                  loading={notificationBusy}
                  onPress={() => void setMatchMute(true, muteUntilTomorrowIso())}
                >
                  Mute until tomorrow 08:00
                </AppButton>
              ) : null}
            </AppCard>
          ) : null}

          <MatchResultCard
            result={pendingResult}
            canSubmitResult={canSubmitResult}
            canVerifyResult={canVerify}
            canDisputeResult={canDispute}
            hasDisputed={hasDisputedCurrentResult}
            teamAScore={teamAScore}
            teamBScore={teamBScore}
            disputeReason={disputeReason}
            onTeamAScoreChange={setTeamAScore}
            onTeamBScoreChange={setTeamBScore}
            onDisputeReasonChange={setDisputeReason}
            onSubmitResult={() => void submitResult()}
            onVerifyResult={() => void verifyResult()}
            onDisputeResult={() => void disputeResult()}
            busy={busy}
            submittedByName={
              pendingResult?.submittedByUserId
                ? participantNameByUserId.get(pendingResult.submittedByUserId)
                : undefined
            }
          />

          <TrustSafetyPanel
            participants={participants}
            currentUserId={user?.id}
            reportReason={reportReason}
            onReportReasonChange={setReportReason}
            onReportUser={(participant) =>
              confirmReport(
                participant.userId,
                participant.displayName?.trim() || `Player ${participant.userId.slice(0, 8)}`,
              )
            }
            canMarkNoShow={canMarkNoShowBase}
            canMarkNoShowFor={(participant) => canMarkNoShowForParticipant(participant.userId, participant.status)}
            onMarkNoShow={(participant) =>
              confirmNoShow(
                participant.id,
                participant.displayName?.trim() || `Player ${participant.userId.slice(0, 8)}`,
              )
            }
            canDisputeResult={canDispute}
            hasDisputed={hasDisputedCurrentResult}
            onDisputeResult={() => void disputeResult()}
            busy={busy}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 16,
  },
  sectionBody: {
    color: colors.muted,
  },
  successText: {
    color: colors.success,
    fontWeight: '600',
  },
  errorText: {
    color: '#b42318',
    fontWeight: '600',
  },
});
