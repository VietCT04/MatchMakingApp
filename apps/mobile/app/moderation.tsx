import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DisputeStatus, ReportStatus } from '@sports-matchmaking/shared';
import { useAuth } from '../src/auth/AuthContext';
import { EmptyState } from '../src/components/states/EmptyState';
import { ErrorState } from '../src/components/states/ErrorState';
import { LoadingState } from '../src/components/states/LoadingState';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { AppButton } from '../src/components/ui/AppButton';
import { AppCard } from '../src/components/ui/AppCard';
import { Badge } from '../src/components/ui/Badge';
import { Chip } from '../src/components/ui/Chip';
import { AppInput } from '../src/components/ui/AppInput';
import { apiClient } from '../src/lib/api';

type ModerationTab = 'REPORTS' | 'DISPUTES' | 'NO_SHOWS';

type ModerateReportItem = {
  id: string;
  reason: string;
  status: string;
  reporterUserId: string;
  reportedUserId: string;
  reporterUser?: { displayName?: string };
  reportedUser?: { displayName?: string };
  match?: { title?: string } | null;
};

type ModerateDisputeItem = {
  id: string;
  reason: string;
  status: string;
  createdByUserId: string;
  matchResult?: {
    teamAScore?: number;
    teamBScore?: number;
    correctedTeamAScore?: number | null;
    correctedTeamBScore?: number | null;
    isCorrected?: boolean;
  } | null;
  createdByUser?: { displayName?: string };
  match?: { title?: string } | null;
};

type ModerateNoShowItem = {
  id: string;
  userId: string;
  status: string;
  user?: { displayName?: string };
  match?: { title?: string } | null;
};

export default function ModerationScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<ModerationTab>('REPORTS');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reports, setReports] = useState<ModerateReportItem[]>([]);
  const [disputes, setDisputes] = useState<ModerateDisputeItem[]>([]);
  const [noShows, setNoShows] = useState<ModerateNoShowItem[]>([]);
  const [disputeCorrections, setDisputeCorrections] = useState<Record<string, { teamA: string; teamB: string }>>({});

  const canModerate = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const activeItems = useMemo(() => {
    if (tab === 'REPORTS') {
      return reports;
    }
    if (tab === 'DISPUTES') {
      return disputes;
    }
    return noShows;
  }, [disputes, noShows, reports, tab]);

  const load = useCallback(async () => {
    if (!canModerate) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [nextReports, nextDisputes, nextNoShows] = await Promise.all([
        apiClient.getModerationReports({ status: ReportStatus.OPEN, limit: 50 }),
        apiClient.getModerationDisputes({ status: DisputeStatus.OPEN, limit: 50 }),
        apiClient.getModerationNoShows({ limit: 50 }),
      ]);
      setReports(nextReports as ModerateReportItem[]);
      setDisputes(nextDisputes as ModerateDisputeItem[]);
      setNoShows(nextNoShows as ModerateNoShowItem[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load moderation queues.');
    } finally {
      setLoading(false);
    }
  }, [canModerate]);

  useEffect(() => {
    if (!canModerate) {
      return;
    }
    void load();
  }, [canModerate, load]);

  async function moderateReport(reportId: string, status: 'REVIEWED' | 'DISMISSED') {
    setSavingId(reportId);
    setMessage('');
    setError('');
    try {
      await apiClient.updateModerationReport(reportId, {
        status: status === 'REVIEWED' ? ReportStatus.REVIEWED : ReportStatus.DISMISSED,
      });
      setMessage(`Report ${status.toLowerCase()} successfully.`);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update report.');
    } finally {
      setSavingId(null);
    }
  }

  async function moderateDispute(disputeId: string, status: 'RESOLVED' | 'REJECTED') {
    setSavingId(disputeId);
    setMessage('');
    setError('');
    try {
      await apiClient.updateModerationDispute(disputeId, {
        status: status === 'RESOLVED' ? DisputeStatus.RESOLVED : DisputeStatus.REJECTED,
      });
      setMessage(`Dispute ${status.toLowerCase()} successfully.`);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update dispute.');
    } finally {
      setSavingId(null);
    }
  }

  async function resolveDisputeWithCorrection(dispute: ModerateDisputeItem) {
    const correction = disputeCorrections[dispute.id] ?? { teamA: '', teamB: '' };
    const parsedTeamA = Number(correction.teamA);
    const parsedTeamB = Number(correction.teamB);
    if (!Number.isInteger(parsedTeamA) || parsedTeamA < 0 || !Number.isInteger(parsedTeamB) || parsedTeamB < 0) {
      setError('Corrected Team A and Team B scores must be whole numbers greater than or equal to 0.');
      return;
    }
    if (
      parsedTeamA === dispute.matchResult?.teamAScore &&
      parsedTeamB === dispute.matchResult?.teamBScore
    ) {
      setError('Corrected scores match the original verified score. Use "Resolve No Change" if no correction is needed.');
      return;
    }

    setSavingId(dispute.id);
    setMessage('');
    setError('');
    try {
      await apiClient.updateModerationDispute(dispute.id, {
        status: DisputeStatus.RESOLVED,
        correctedTeamAScore: parsedTeamA,
        correctedTeamBScore: parsedTeamB,
      });
      setMessage('Dispute resolved and ratings corrected.');
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to resolve dispute.');
    } finally {
      setSavingId(null);
    }
  }

  async function moderateNoShow(participantId: string, action: 'CONFIRM' | 'REVERSE') {
    setSavingId(participantId);
    setMessage('');
    setError('');
    try {
      await apiClient.updateModerationNoShow(participantId, { action });
      setMessage(action === 'REVERSE' ? 'No-show reversed successfully.' : 'No-show confirmed successfully.');
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update no-show.');
    } finally {
      setSavingId(null);
    }
  }

  if (!canModerate) {
    return (
      <Screen>
        <ScreenHeader title="Moderation" subtitle="Moderator and admin access only." />
        <ErrorState message="You do not have moderation permissions." onRetry={() => router.replace('/profile')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Moderation" subtitle="Review open reports, disputes, and no-shows." />

      <View style={styles.chipsRow}>
        <Chip label={`Reports (${reports.length})`} active={tab === 'REPORTS'} onPress={() => setTab('REPORTS')} />
        <Chip label={`Disputes (${disputes.length})`} active={tab === 'DISPUTES'} onPress={() => setTab('DISPUTES')} />
        <Chip label={`No-shows (${noShows.length})`} active={tab === 'NO_SHOWS'} onPress={() => setTab('NO_SHOWS')} />
      </View>

      <AppButton variant="secondary" onPress={() => void load()} disabled={loading || Boolean(savingId)}>
        Refresh
      </AppButton>

      {message ? <Badge tone="success">{message}</Badge> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {loading ? <LoadingState message="Loading moderation queue..." /> : null}

      {!loading && activeItems.length === 0 ? (
        <EmptyState title="Nothing pending" message="No open items in this moderation queue." />
      ) : null}

      {!loading && tab === 'REPORTS'
        ? reports.map((report) => (
            <AppCard key={report.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>Report</Text>
                <Badge tone="info">{report.status}</Badge>
              </View>
              <Text style={styles.body}>{report.reason}</Text>
              <Text style={styles.meta}>Reporter: {report.reporterUser?.displayName ?? report.reporterUserId}</Text>
              <Text style={styles.meta}>Reported: {report.reportedUser?.displayName ?? report.reportedUserId}</Text>
              <Text style={styles.meta}>Match: {report.match?.title ?? 'N/A'}</Text>
              <View style={styles.actions}>
                <AppButton
                  variant="secondary"
                  onPress={() => void moderateReport(report.id, 'REVIEWED')}
                  disabled={savingId === report.id}
                >
                  Review
                </AppButton>
                <AppButton
                  variant="secondary"
                  onPress={() => void moderateReport(report.id, 'DISMISSED')}
                  disabled={savingId === report.id}
                >
                  Dismiss
                </AppButton>
              </View>
            </AppCard>
          ))
        : null}

      {!loading && tab === 'DISPUTES'
        ? disputes.map((dispute) => (
            <AppCard key={dispute.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>Dispute</Text>
                <Badge tone="info">{dispute.status}</Badge>
              </View>
              <Text style={styles.body}>{dispute.reason}</Text>
              <Text style={styles.meta}>Created by: {dispute.createdByUser?.displayName ?? dispute.createdByUserId}</Text>
              <Text style={styles.meta}>Match: {dispute.match?.title ?? 'N/A'}</Text>
              <Text style={styles.meta}>
                Original score: {dispute.matchResult?.teamAScore ?? '-'} - {dispute.matchResult?.teamBScore ?? '-'}
              </Text>
              <AppInput
                label="Corrected Team A score"
                value={disputeCorrections[dispute.id]?.teamA ?? ''}
                keyboardType="number-pad"
                onChangeText={(value) =>
                  setDisputeCorrections((prev) => ({
                    ...prev,
                    [dispute.id]: {
                      teamA: value,
                      teamB: prev[dispute.id]?.teamB ?? '',
                    },
                  }))
                }
              />
              <AppInput
                label="Corrected Team B score"
                value={disputeCorrections[dispute.id]?.teamB ?? ''}
                keyboardType="number-pad"
                helperText="If the verified score was wrong, enter corrected scores. Ratings will be corrected."
                onChangeText={(value) =>
                  setDisputeCorrections((prev) => ({
                    ...prev,
                    [dispute.id]: {
                      teamA: prev[dispute.id]?.teamA ?? '',
                      teamB: value,
                    },
                  }))
                }
              />
              <View style={styles.actions}>
                <AppButton
                  variant="primary"
                  onPress={() => void resolveDisputeWithCorrection(dispute)}
                  disabled={savingId === dispute.id}
                >
                  Resolve + Correct
                </AppButton>
                <AppButton
                  variant="secondary"
                  onPress={() => void moderateDispute(dispute.id, 'RESOLVED')}
                  disabled={savingId === dispute.id}
                >
                  Resolve No Change
                </AppButton>
                <AppButton
                  variant="secondary"
                  onPress={() => void moderateDispute(dispute.id, 'REJECTED')}
                  disabled={savingId === dispute.id}
                >
                  Reject
                </AppButton>
              </View>
            </AppCard>
          ))
        : null}

      {!loading && tab === 'NO_SHOWS'
        ? noShows.map((participant) => (
            <AppCard key={participant.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>No-show</Text>
                <Badge tone="info">{participant.status}</Badge>
              </View>
              <Text style={styles.meta}>Player: {participant.user?.displayName ?? participant.userId}</Text>
              <Text style={styles.meta}>Match: {participant.match?.title ?? 'N/A'}</Text>
              <View style={styles.actions}>
                <AppButton
                  variant="secondary"
                  onPress={() => void moderateNoShow(participant.id, 'CONFIRM')}
                  disabled={savingId === participant.id}
                >
                  Confirm
                </AppButton>
                <AppButton
                  variant="secondary"
                  onPress={() => void moderateNoShow(participant.id, 'REVERSE')}
                  disabled={savingId === participant.id}
                >
                  Reverse
                </AppButton>
              </View>
            </AppCard>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#20304a',
  },
  body: {
    color: '#334157',
    lineHeight: 20,
  },
  meta: {
    color: '#66748e',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
});
