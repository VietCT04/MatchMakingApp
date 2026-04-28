import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MatchStatus, Team } from '@sports-matchmaking/shared';
import { useAuth } from '../../src/auth/AuthContext';
import { apiClient } from '../../src/lib/api';
import { useMatchDetail } from '../../src/hooks/useMatchDetail';
import { useMatchDetailActions } from '../../src/hooks/useMatchDetailActions';
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

export default function MatchDetailScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = typeof id === 'string' ? id : undefined;
  const { data: match, loading, error: loadError, refresh } = useMatchDetail(matchId);
  const [teamAScore, setTeamAScore] = useState('21');
  const [teamBScore, setTeamBScore] = useState('17');
  const [disputeReason, setDisputeReason] = useState('Score is incorrect');
  const [reportReason, setReportReason] = useState('No show without notice');
  const {
    busy,
    notificationBusy,
    feedback,
    isMatchMuted,
    muteUntil,
    chatUnreadCount,
    joinedParticipants,
    joinedParticipantCount,
    currentParticipant,
    pendingResult,
    hasDisputedCurrentResult,
    canJoin,
    canLeave,
    canSubmitResult,
    canVerifyResult: canVerify,
    canDispute,
    canMarkNoShow: canMarkNoShowBase,
    canReadChat,
    runAction,
    submitResult,
    verifyResult,
    disputeResult,
    reportUser,
    markNoShow,
    setMatchMute,
    loadNotificationControls,
    canMarkNoShowForParticipant,
  } = useMatchDetailActions({
    matchId,
    match,
    user,
    refresh,
  });

  const participants = match?.participants ?? [];
  const teamAPlayers = participants.filter((item) => item.team === Team.A);
  const teamBPlayers = participants.filter((item) => item.team === Team.B);
  const unknownPlayers = participants.filter((item) => item.team === Team.UNKNOWN);

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

  useFocusEffect(
    useCallback(() => {
      void loadNotificationControls();
    }, [loadNotificationControls]),
  );

  function confirmNoShow(participantId: string, displayName: string) {
    Alert.alert('Mark no-show', `Mark ${displayName} as no-show?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => {
          void markNoShow(participantId, displayName);
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
          void reportUser(reportedUserId, reportReason);
        },
      },
    ]);
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
                {chatUnreadCount > 0 ? `Open chat - ${chatUnreadCount} unread` : 'Open chat'}
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
            onSubmitResult={() => void submitResult(teamAScore, teamBScore)}
            onVerifyResult={() => void verifyResult(pendingResult)}
            onDisputeResult={() => void disputeResult(pendingResult, disputeReason)}
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
            onDisputeResult={() => void disputeResult(pendingResult, disputeReason)}
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
