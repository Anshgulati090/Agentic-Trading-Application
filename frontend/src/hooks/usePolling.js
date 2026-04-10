import { useState, useEffect, useRef, useCallback } from 'react';

export function usePolling(fetchFn, interval = 5000, { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);
  // Always keep a fresh reference to the latest fetchFn without re-triggering effects
  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await fetchFnRef.current();
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
  }, []); // stable - no deps needed; fetchFnRef always current

  useEffect(() => {
    if (immediate) run();
    const timer = setInterval(run, interval);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, run]);

  return { data, loading, error, refetch: run };
}
