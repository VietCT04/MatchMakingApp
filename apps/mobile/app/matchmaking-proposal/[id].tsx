import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
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
  const [messageInput, setMessageInput] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Screen>
      <ScreenHeader title="Proposal detail" subtitle="Chat, propose location, and finalize your auto match." />
      {loading ? <LoadingState message="Loading proposal..." /> : null}
      {error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {!loading && !error && !proposal ? <EmptyState title="Proposal not found" message="Return to proposal list and try again." /> : null}

      {proposal ? (
        <>
          <AppCard>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{proposal.format}</Text>
              <Badge>{proposal.status}</Badge>
            </View>
            <Text style={styles.line}>Proposed time: {new Date(proposal.proposedStartTime).toLocaleString()}</Text>
            <Text style={styles.line}>Participants: {proposal.participants?.length ?? 0}</Text>
            {proposal.participants?.map((participant) => (
              <Text key={participant.id} style={styles.line}>
                {participant.userId} - Team {participant.team}
              </Text>
            ))}
            {proposal.status === 'CONFIRMED' && proposal.confirmedMatchId ? (
              <AppButton variant="secondary" onPress={() => router.push({ pathname: '/match/[id]', params: { id: proposal.confirmedMatchId! } })}>View match</AppButton>
            ) : null}
          </AppCard>

          <AppCard>
            <Text style={styles.title}>Proposal chat</Text>
            {messages.length === 0 ? <EmptyState title="No messages yet" message="Start coordinating with your proposal participants." /> : null}
            {messages.map((message) => (
              <Text key={message.id} style={styles.line}>{message.senderUserId}: {message.body}</Text>
            ))}
            {proposal.status === 'PENDING' ? (
              <>
                <AppInput label="Message" value={messageInput} onChangeText={setMessageInput} maxLength={1000} />
                <AppButton onPress={async () => {
                  await apiClient.sendProposalMessage(proposalId, messageInput);
                  setMessageInput('');
                  await refresh();
                }}>Send</AppButton>
              </>
            ) : null}
          </AppCard>

          <AppCard>
            <Text style={styles.title}>Location proposals</Text>
            <Text style={styles.helper}>Open Google Maps, copy the place link, and paste it here.</Text>
            {locationProposals.length === 0 ? <EmptyState title="No location proposed yet" message="Propose a location to continue." /> : null}
            {locationProposals.map((item) => (
              <View key={item.id} style={styles.locationItem}>
                <View style={styles.headerRow}>
                  <Text style={styles.line}>{item.locationName}</Text>
                  <Badge>{item.status}</Badge>
                </View>
                <Text style={styles.line}>{item.address ?? '-'}</Text>
                <Text style={styles.line}>{item.latitude}, {item.longitude}</Text>
                {item.googleMapsUrl ? <Text style={styles.line}>{item.googleMapsUrl}</Text> : null}
                {proposal.status === 'PENDING' && item.status === 'PENDING' ? (
                  <View style={styles.actions}>
                    <AppButton onPress={async () => { await apiClient.acceptLocationProposal(item.id); await refresh(); }}>Accept location</AppButton>
                    <AppButton variant="secondary" onPress={async () => { await apiClient.declineLocationProposal(item.id); await refresh(); }}>Decline location</AppButton>
                  </View>
                ) : null}
              </View>
            ))}

            {proposal.status === 'PENDING' ? (
              <>
                <AppInput label="Location name" value={locationName} onChangeText={setLocationName} />
                <AppInput label="Address" value={address} onChangeText={setAddress} />
                <AppInput label="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numeric" />
                <AppInput label="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numeric" />
                <AppInput label="Google Maps URL" value={googleMapsUrl} onChangeText={setGoogleMapsUrl} />
                <AppButton onPress={async () => {
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
                  await refresh();
                }}>Propose location</AppButton>
                <AppButton variant="secondary" onPress={async () => { await apiClient.cancelMatchmakingProposal(proposalId); await refresh(); }}>
                  Cancel proposal
                </AppButton>
              </>
            ) : null}
          </AppCard>
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
  actions: { flexDirection: 'row', gap: 8 },
  locationItem: { gap: 4 },
});
