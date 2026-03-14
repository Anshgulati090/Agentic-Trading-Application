import { useState, useEffect, useRef, useCallback } from 'react';

export function usePolling(fetchFn, interval = 5000, { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await fetchFn();
      if (result !== null && result !== undefined) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      setError(e?.message ?? 'Unknown error');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (immediate) run();
    const timer = setInterval(run, interval);
    return () => clearInterval(timer);
  }, [run, interval, immediate]);

  return { data, loading, error, refetch: run };
}
