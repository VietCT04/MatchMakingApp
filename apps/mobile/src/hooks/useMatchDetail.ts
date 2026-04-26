import { useCallback, useEffect, useState } from 'react';
import type { MatchWithDetailsDto } from '@sports-matchmaking/shared';
import { apiClient } from '../lib/api';

type UseMatchDetailResult = {
  data: MatchWithDetailsDto | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

export function useMatchDetail(matchId: string | undefined): UseMatchDetailResult {
  const [data, setData] = useState<MatchWithDetailsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!matchId) {
      setData(null);
      setLoading(false);
      setError('Match ID is missing.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const match = await apiClient.getMatchById(matchId);
      setData(match);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load match.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
