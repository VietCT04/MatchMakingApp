import { useCallback, useEffect, useState } from 'react';
import type { RatingDto, RatingHistoryDto } from '@sports-matchmaking/shared';
import { apiClient } from '../lib/api';

type RatingsData = {
  ratings: RatingDto[];
  history: RatingHistoryDto[];
};

type UseUserRatingsResult = {
  data: RatingsData;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

export function useUserRatings(enabled = true): UseUserRatingsResult {
  const [data, setData] = useState<RatingsData>({ ratings: [], history: [] });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError('');
      setData({ ratings: [], history: [] });
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [ratings, history] = await Promise.all([
        apiClient.getUserRatings(),
        apiClient.getUserRatingHistory(),
      ]);
      setData({ ratings, history });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load ratings.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
