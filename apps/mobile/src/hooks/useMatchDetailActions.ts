import { useCallback, useMemo, useState } from 'react';
import { MatchParticipantStatus, MatchStatus, Team, type MatchCheckInStatusDto, type MatchWithDetailsDto, type MatchResultDto, type UserDto } from '@sports-matchmaking/shared';
import { apiClient } from '../lib/api';

type FeedbackTone = 'success' | 'error';

type UseMatchDetailActionsParams = {
  matchId?: string;
  match: MatchWithDetailsDto | null;
  user: UserDto | null;
  refresh: () => Promise<void>;
};

export function useMatchDetailActions({ matchId, match, user, refresh }: UseMatchDetailActionsParams) {
  const [busy, setBusy] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [disputedResultIds, setDisputedResultIds] = useState<string[]>([]);
  const [isMatchMuted, setIsMatchMuted] = useState(false);
  const [muteUntil, setMuteUntil] = useState<string | null>(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [checkIns, setCheckIns] = useState<MatchCheckInStatusDto | null>(null);
  const [checkInsLoading, setCheckInsLoading] = useState(true);

  const now = Date.now();
  const participants = match?.participants ?? [];
  const joinedParticipants = useMemo(
    () => participants.filter((item) => item.status === MatchParticipantStatus.JOINED),
    [participants],
  );
  const joinedParticipantCount = joinedParticipants.length;
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
  const canVerifyResult =
    Boolean(currentParticipant) &&
    Boolean(pendingResult) &&
    !pendingResult?.verified &&
    pendingResult?.submittedByUserId !== user?.id;
  const canDispute =
    Boolean(currentParticipant) &&
    Boolean(pendingResult) &&
    !pendingResult?.verified;
  const canMarkNoShow =
    Boolean(user && match && match.createdByUserId === user.id && hasStarted) &&
    match?.status !== MatchStatus.CANCELLED &&
    match?.status !== MatchStatus.COMPLETED;
  const canReport = Boolean(user);
  const canReadChat = Boolean(
    user &&
      match &&
      (match.createdByUserId === user.id || currentUserParticipation),
  );
  const checkInEntry = checkIns?.participants.find((item) => item.userId === user?.id);
  const hasCheckedIn = Boolean(checkInEntry?.checkedInAt);
  const canCheckIn =
    Boolean(user) &&
    Boolean(currentParticipant) &&
    !hasCheckedIn &&
    Boolean(checkIns?.checkInOpen) &&
    match?.status !== MatchStatus.CANCELLED &&
    match?.status !== MatchStatus.COMPLETED;

  const setErrorFeedback = useCallback((message: string) => {
    setFeedback({ tone: 'error', message });
  }, []);

  const setSuccessFeedback = useCallback((message: string) => {
    setFeedback({ tone: 'success', message });
  }, []);

  const runAction = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
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
    },
    [refresh, setErrorFeedback, setSuccessFeedback],
  );

  const submitResult = useCallback(
    async (teamAScore: string, teamBScore: string) => {
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
    },
    [matchId, runAction, setErrorFeedback],
  );

  const verifyResult = useCallback(async (result: MatchResultDto | null) => {
    const resultId = result?.id;
    if (!resultId) {
      setErrorFeedback('No result available to verify yet.');
      return;
    }
    await runAction(() => apiClient.verifyMatchResult(matchId ?? '', resultId), 'Result verified and ratings updated.');
  }, [matchId, runAction, setErrorFeedback]);

  const disputeResult = useCallback(async (result: MatchResultDto | null, disputeReason: string) => {
    const resultId = result?.id;
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
  }, [matchId, refresh, setErrorFeedback, setSuccessFeedback]);

  const reportUser = useCallback(async (reportedUserId: string, reason: string) => {
    await runAction(
      () => apiClient.reportUser({ reportedUserId, matchId, reason }),
      'Report submitted successfully.',
    );
  }, [matchId, runAction]);

  const markNoShow = useCallback(async (participantId: string, displayName: string) => {
    await runAction(
      () => apiClient.markParticipantNoShow(matchId ?? '', participantId),
      `${displayName} marked as no-show.`,
    );
  }, [matchId, runAction]);

  const setMatchMute = useCallback(async (muted: boolean, nextMuteUntil?: string | null) => {
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
  }, [matchId, setErrorFeedback, setSuccessFeedback]);

  const loadNotificationControls = useCallback(async () => {
    if (!matchId || !user) {
      setIsMatchMuted(false);
      setMuteUntil(null);
      setChatUnreadCount(0);
      setCheckIns(null);
      setCheckInsLoading(false);
      return;
    }

    setCheckInsLoading(true);
    try {
      const [matchPreference, unread] = await Promise.all([
        apiClient.getMatchNotificationPreference(matchId),
        canReadChat ? apiClient.getChatUnreadCount(matchId) : Promise.resolve({ count: 0 }),
      ]);
      const checkInStatus = await apiClient.getMatchCheckIns(matchId);
      setIsMatchMuted(matchPreference.muted);
      setMuteUntil(matchPreference.muteUntil ?? null);
      setChatUnreadCount(unread.count);
      setCheckIns(checkInStatus);
    } catch {
      // Keep core match detail usable even if preference/read-state fetch fails.
      setCheckIns(null);
    } finally {
      setCheckInsLoading(false);
    }
  }, [canReadChat, matchId, user]);

  const canMarkNoShowForParticipant = useCallback((participantUserId: string, participantStatus: MatchParticipantStatus): boolean => {
    if (!canMarkNoShow || participantUserId === user?.id) {
      return false;
    }
    const checkIn = checkIns?.participants.find((item) => item.userId === participantUserId);
    if (checkIn?.checkedInAt) {
      return false;
    }
    return participantStatus === MatchParticipantStatus.JOINED;
  }, [canMarkNoShow, checkIns?.participants, user?.id]);

  return {
    busy,
    notificationBusy,
    feedback,
    isMatchMuted,
    muteUntil,
    chatUnreadCount,
    joinedParticipants,
    joinedParticipantCount,
    currentParticipant,
    currentUserParticipation,
    pendingResult,
    hasDisputedCurrentResult,
    canJoin,
    canLeave,
    canSubmitResult,
    canVerifyResult,
    canDispute,
    canReport,
    canMarkNoShow,
    canReadChat,
    canCheckIn,
    hasCheckedIn,
    checkIns,
    checkInsLoading,
    setFeedback,
    runAction,
    submitResult,
    verifyResult,
    disputeResult,
    reportUser,
    markNoShow,
    setMatchMute,
    loadNotificationControls,
    checkInEntry,
    checkInNow: async () => {
      if (!matchId) {
        return;
      }
      await runAction(
        () => apiClient.checkInToMatch(matchId),
        'Check-in confirmed.',
      );
      await loadNotificationControls();
    },
    canMarkNoShowForParticipant,
  };
}
