import { useCallback, useEffect, useState } from 'react';
import type { VenueDto } from '@sports-matchmaking/shared';
import { apiClient } from '../lib/api';

type UseVenuesResult = {
  data: VenueDto[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

export function useVenues(): UseVenuesResult {
  const [data, setData] = useState<VenueDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const venues = await apiClient.getVenues();
      setData(venues);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load venues.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
