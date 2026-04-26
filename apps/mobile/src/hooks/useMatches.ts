import { useCallback, useEffect, useState } from 'react';
import type { MatchWithDetailsDto } from '@sports-matchmaking/shared';
import { apiClient, type MatchFilters } from '../lib/api';

type UseMatchesResult = {
  data: MatchWithDetailsDto[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

export function useMatches(filters: MatchFilters = {}): UseMatchesResult {
  const [data, setData] = useState<MatchWithDetailsDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const matches = await apiClient.getMatches(filters);
      setData(matches);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load matches.');
    } finally {
      setLoading(false);
    }
  }, [
    filters.format,
    filters.maxRating,
    filters.minRating,
    filters.sportId,
    filters.startsAfter,
    filters.startsBefore,
    filters.status,
    filters.venueId,
    filters.latitude,
    filters.longitude,
    filters.radiusKm,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
