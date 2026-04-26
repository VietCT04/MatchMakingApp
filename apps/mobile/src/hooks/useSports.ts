import { useCallback, useEffect, useState } from 'react';
import type { SportDto } from '@sports-matchmaking/shared';
import { apiClient } from '../lib/api';

type UseSportsResult = {
  data: SportDto[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

export function useSports(): UseSportsResult {
  const [data, setData] = useState<SportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sports = await apiClient.getSports();
      setData(sports);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load sports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
