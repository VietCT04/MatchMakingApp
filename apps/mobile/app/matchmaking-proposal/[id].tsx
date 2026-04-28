import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { MatchmakingLocationProposalDto, MatchmakingProposalDto, MatchmakingProposalMessageDto } from '@sports-matchmaking/shared';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppButton } from '../../src/components/ui/AppButton';
import { Badge } from '../../src/components/ui/Badge';
import { LoadingState } from '../../src/components/states/LoadingState';
import { ErrorState } from '../../src/components/states/ErrorState';
import { EmptyState } from '../../src/components/states/EmptyState';
import { apiClient } from '../../src/lib/api';

export default function MatchmakingProposalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const proposalId = id as string;
  const [proposal, setProposal] = useState<MatchmakingProposalDto | null>(null);
  const [messages, setMessages] = useState<MatchmakingProposalMessageDto[]>([]);
  const [locationProposals, setLocationProposals] = useState<MatchmakingLocationProposalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [proposals, proposalMessages, locations] = await Promise.all([
        apiClient.getMyMatchmakingProposals(),
        apiClient.getProposalMessages(proposalId),
        apiClient.getLocationProposals(proposalId),
      ]);
      setProposal(proposals.find((p) => p.id === proposalId) ?? null);
      setMessages(proposalMessages);
      setLocationProposals(locations);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load proposal detail.');
    }
  }, [proposalId]);

  useEffect(() => {
    async function initial() {
      setLoading(true);
      await refresh();
      setLoading(false);
    }
    void initial();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        void refresh();
      }, 8000);
      return () => clearInterval(interval);
    }, [refresh]),
  );

  const latestLocation = locationProposals[0];
  const isPending = proposal?.status === 'PENDING';
  const statusLabel = useMemo(() => {
    if (!proposal) return '';
    if (proposal.status === 'PENDING') return latestLocation ? 'Location proposed' : 'Negotiating';
    if (proposal.status === 'CONFIRMED') return 'Confirmed';
    if (proposal.status === 'CANCELLED') return 'Cancelled';
    return proposal.status;
  }, [latestLocation, proposal]);

  async function runAction(action: () => Promise<void>) {
    setActionError('');
    try {
      await action();
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.');
    }
  }

  return (
    <Screen>
      <ScreenHeader
        title="Proposal detail"
        subtitle="Negotiate by chat and agree on a location before match confirmation."
        action={<AppButton variant="secondary" onPress={() => void refresh()}>Refresh</AppButton>}
      />
      {loading ? <LoadingState message="Loading proposal..." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}
      {!loading && !error && !proposal ? <EmptyState title="Proposal not found" message="Return to proposal list and try again." /> : null}

      {proposal ? (
        <>
          <AppCard>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{proposal.format}</Text>
              <Badge>{statusLabel}</Badge>
            </View>
            <Text style={styles.line}>Time: {new Date(proposal.proposedStartTime).toLocaleString()}</Text>
            <Text style={styles.line}>Participants: {proposal.participants?.length ?? 0}</Text>
            {proposal.participants?.map((participant) => (
              <Text key={participant.id} style={styles.line}>
                {(participant.user?.displayName ?? participant.userId)} - Team {participant.team}{participant.user?.reliabilityScore !== undefined ? ` - ${participant.user.reliabilityScore} reliability` : ''}
              </Text>
            ))}
            {proposal.status === 'CONFIRMED' && proposal.confirmedMatchId ? (
              <AppButton variant="secondary" onPress={() => router.push({ pathname: '/match/[id]', params: { id: proposal.confirmedMatchId! } })}>View confirmed match</AppButton>
            ) : null}
          </AppCard>

          <AppCard>
            <Text style={styles.title}>Proposal chat</Text>
            {messages.length === 0 ? <EmptyState title="No messages yet" message="No messages yet. Start the discussion." /> : null}
            {messages.map((message) => (
              <Text key={message.id} style={styles.line}>{message.senderUserId}: {message.body}</Text>
            ))}
            {isPending ? (
              <>
                <AppInput label="Message" value={messageInput} onChangeText={setMessageInput} maxLength={1000} />
                <View style={styles.actions}>
                  <AppButton onPress={() => void runAction(async () => {
                    await apiClient.sendProposalMessage(proposalId, messageInput);
                    setMessageInput('');
                  })}>Send</AppButton>
                  <AppButton variant="secondary" onPress={() => void refresh()}>Refresh chat</AppButton>
                </View>
              </>
            ) : null}
          </AppCard>

          <AppCard>
            <Text style={styles.title}>Location proposals</Text>
            <Text style={styles.helper}>Required: name, latitude, longitude. Open Google Maps, copy place link, and paste it.</Text>
            {locationProposals.length === 0 ? <EmptyState title="No location proposed yet" message="Propose a location to continue." /> : null}
            {locationProposals.map((item) => (
              <View key={item.id} style={styles.locationItem}>
                <View style={styles.headerRow}>
                  <Text style={styles.line}>{item.locationName}</Text>
                  <Badge>{item.status}</Badge>
                </View>
                <Text style={styles.line}>By: {(item as any).proposedByUser?.displayName ?? item.proposedByUserId}</Text>
                <Text style={styles.line}>{item.address ?? '-'}</Text>
                <Text style={styles.line}>{item.latitude}, {item.longitude}</Text>
                {item.googleMapsUrl ? <Text style={styles.line}>{item.googleMapsUrl}</Text> : null}
                {(item.responses ?? []).map((response) => (
                  <Text key={response.id} style={styles.muted}>{response.userId}: {response.status}</Text>
                ))}
                {isPending && item.status === 'PENDING' ? (
                  <View style={styles.actions}>
                    <AppButton onPress={() => void runAction(async () => { await apiClient.acceptLocationProposal(item.id); })}>Accept location</AppButton>
                    <AppButton variant="secondary" onPress={() => void runAction(async () => { await apiClient.declineLocationProposal(item.id); })}>Decline location</AppButton>
                  </View>
                ) : null}
              </View>
            ))}

            {isPending ? (
              <>
                <AppInput label="Location name" value={locationName} onChangeText={setLocationName} error={!locationName && actionError.includes('locationName') ? 'Location name is required.' : undefined} />
                <AppInput label="Address" value={address} onChangeText={setAddress} />
                <AppInput label="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numeric" />
                <AppInput label="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numeric" />
                <AppInput label="Google Maps URL" value={googleMapsUrl} onChangeText={setGoogleMapsUrl} />
                <AppButton onPress={() => void runAction(async () => {
                  if (!locationName.trim() || !latitude.trim() || !longitude.trim()) {
                    throw new Error('Location name, latitude, and longitude are required.');
                  }
                  await apiClient.proposeLocation(proposalId, {
                    locationName,
                    address: address || undefined,
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    googleMapsUrl: googleMapsUrl || undefined,
                  });
                  setLocationName('');
                  setAddress('');
                  setLatitude('');
                  setLongitude('');
                  setGoogleMapsUrl('');
                })}>Propose location</AppButton>
              </>
            ) : null}
          </AppCard>

          {isPending ? (
            <AppCard>
              <Text style={styles.title}>Cancel proposal</Text>
              <Text style={styles.helper}>Any participant can cancel while proposal is negotiating.</Text>
              <AppButton variant="secondary" onPress={() => void runAction(async () => { await apiClient.cancelMatchmakingProposal(proposalId); })}>
                Cancel proposal
              </AppButton>
            </AppCard>
          ) : null}

          {actionError ? <ErrorState message={actionError} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#20304a', fontWeight: '700' },
  line: { color: '#44516a' },
  helper: { color: '#66748e' },
  muted: { color: '#6f7b91', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  locationItem: { gap: 4 },
});
