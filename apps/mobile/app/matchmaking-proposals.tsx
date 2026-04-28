import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { MatchmakingProposalDto } from '@sports-matchmaking/shared';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { AppCard } from '../src/components/ui/AppCard';
import { AppButton } from '../src/components/ui/AppButton';
import { Badge } from '../src/components/ui/Badge';
import { LoadingState } from '../src/components/states/LoadingState';
import { ErrorState } from '../src/components/states/ErrorState';
import { EmptyState } from '../src/components/states/EmptyState';
import { apiClient } from '../src/lib/api';

export default function MatchmakingProposalsScreen() {
  const [proposals, setProposals] = useState<MatchmakingProposalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getMyMatchmakingProposals();
      setProposals(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load proposals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <Screen>
      <ScreenHeader title="Matchmaking proposals" subtitle="Open each proposal to chat and agree on location." />
      {loading ? <LoadingState message="Loading proposals..." /> : null}
      {error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {!loading && !error && proposals.length === 0 ? <EmptyState title="No proposals yet" message="Run Find Match to create a matchmaking ticket." /> : null}

      {proposals.map((proposal) => (
        <AppCard key={proposal.id}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{proposal.format}</Text>
            <Badge>{proposal.status === 'PENDING' ? ((proposal as any).locationProposals?.[0] ? 'Location proposed' : 'Negotiating') : proposal.status}</Badge>
          </View>
          <Text style={styles.line}>Proposed time: {new Date(proposal.proposedStartTime).toLocaleString()}</Text>
          <Text style={styles.line}>Participants: {proposal.participants?.length ?? 0}</Text>
          <Text style={styles.line}>
            {(proposal.participants ?? []).map((p) => p.user?.displayName ?? p.userId).join(', ')}
          </Text>
          <Text style={styles.line}>
            Latest location: {(proposal as any).locationProposals?.[0]?.status ?? 'NONE'}
          </Text>
          <AppButton variant="secondary" onPress={() => router.push({ pathname: '/matchmaking-proposal/[id]', params: { id: proposal.id } })}>
            Open proposal
          </AppButton>

          {proposal.status === 'CONFIRMED' && proposal.confirmedMatchId ? (
            <AppButton variant="secondary" onPress={() => router.push({ pathname: '/match/[id]', params: { id: proposal.confirmedMatchId! } })}>
              View match
            </AppButton>
          ) : null}
        </AppCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#20304a', fontWeight: '700' },
  line: { color: '#44516a' },
});
