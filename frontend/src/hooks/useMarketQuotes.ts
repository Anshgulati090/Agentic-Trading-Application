import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { api } from '../services/api';
import { useLiveMarket } from './useLiveMarket';
import { createEmptyQuote, normalizeQuote, normalizeSymbol } from '../utils/marketData';
import { getMarketProfile } from '../data/marketCatalog';
import type { MarketQuote } from '../types/market';

type MarketStoreState = {
  quotes: Record<string, MarketQuote>;
  loadingSymbols: Set<string>;
  error: string | null;
  lastFetchedAt: Record<string, number>;
};

const INITIAL_STATE: MarketStoreState = {
  quotes: {},
  loadingSymbols: new Set<string>(),
  error: null,
  lastFetchedAt: {},
};

let state: MarketStoreState = INITIAL_STATE;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;
let fetchResolver: (() => void) | null = null;
let fetchPromise: Promise<void> | null = null;
const queuedSymbols = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(next: Partial<MarketStoreState>) {
  state = {
    ...state,
    ...next,
  };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function queueFetch(symbols: string[], staleMs: number): Promise<void> {
  const now = Date.now();
  const stale = symbols.filter((symbol) => {
    const normalized = normalizeSymbol(symbol);
    const last = state.lastFetchedAt[normalized] || 0;
    return now - last > staleMs;
  });

  if (!stale.length) {
    return Promise.resolve();
  }

  stale.forEach((symbol) => {
    const normalized = normalizeSymbol(symbol);
    queuedSymbols.add(normalized);
    state.loadingSymbols.add(normalized);
  });
  emit();

  if (!fetchPromise) {
    fetchPromise = new Promise<void>((resolve) => {
      fetchResolver = resolve;
    });
  }

  if (fetchTimer) {
    return fetchPromise;
  }

  fetchTimer = setTimeout(async () => {
    fetchTimer = null;
    const batch = Array.from(queuedSymbols);
    queuedSymbols.clear();

    try {
      const payload = await api.getMarketPrices(batch);
      const source = (payload?.data || payload || {}) as Record<string, unknown>;
      const nextQuotes: Record<string, MarketQuote> = { ...state.quotes };
      const nextFetchedAt: Record<string, number> = { ...state.lastFetchedAt };

      batch.forEach((symbol) => {
        const raw = source[symbol] ?? source[symbol.toUpperCase()];
        const profile = getMarketProfile(symbol);
        const normalized = normalizeSymbol(symbol);
        nextQuotes[normalized] = raw
          ? normalizeQuote(normalized, raw, profile)
          : createEmptyQuote(normalized, profile);
        nextFetchedAt[normalized] = Date.now();
      });

      batch.forEach((symbol) => state.loadingSymbols.delete(symbol));

      setState({
        quotes: nextQuotes,
        lastFetchedAt: nextFetchedAt,
        error: null,
      });
    } catch (error) {
      batch.forEach((symbol) => state.loadingSymbols.delete(symbol));
      setState({
        error: error instanceof Error ? error.message : 'Unable to load market quotes.',
      });
    } finally {
      if (fetchResolver) {
        fetchResolver();
      }
      fetchResolver = null;
      fetchPromise = null;
    }
  }, 24);

  return fetchPromise;
}

function mergeLiveQuotes(rawTicks: Record<string, unknown>) {
  if (!rawTicks || typeof rawTicks !== 'object') return;

  let hasChanges = false;
  const nextQuotes: Record<string, MarketQuote> = { ...state.quotes };

  Object.entries(rawTicks).forEach(([symbol, value]) => {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;

    const profile = getMarketProfile(normalized);
    const current = state.quotes[normalized] || createEmptyQuote(normalized, profile);
    const incoming = normalizeQuote(normalized, value, profile);

    nextQuotes[normalized] = {
      ...current,
      ...incoming,
      history: incoming.history.length ? incoming.history : current.history,
      source: 'live',
      timestamp: Date.now(),
    };
    hasChanges = true;
  });

  if (hasChanges) {
    setState({ quotes: nextQuotes });
  }
}

export function useMarketQuotes(
  symbols: string[],
  options: { refreshMs?: number; staleMs?: number } = {},
) {
  const refreshMs = options.refreshMs ?? 15000;
  const staleMs = options.staleMs ?? 10000;

  const normalizedSymbols = useMemo(() => {
    const uniq = new Set<string>();
    symbols.forEach((symbol) => {
      const normalized = normalizeSymbol(symbol);
      if (normalized) {
        uniq.add(normalized);
      }
    });
    return Array.from(uniq);
  }, [symbols]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const liveTicks = useLiveMarket();

  useEffect(() => {
    if (!normalizedSymbols.length) return;

    queueFetch(normalizedSymbols, staleMs);
    const timer = setInterval(() => {
      queueFetch(normalizedSymbols, staleMs);
    }, refreshMs);

    return () => clearInterval(timer);
  }, [normalizedSymbols, refreshMs, staleMs]);

  useEffect(() => {
    mergeLiveQuotes(liveTicks as Record<string, unknown>);
  }, [liveTicks]);

  const quotes = useMemo(() => {
    const shaped: Record<string, MarketQuote> = {};
    normalizedSymbols.forEach((symbol) => {
      shaped[symbol] = snapshot.quotes[symbol] || createEmptyQuote(symbol, getMarketProfile(symbol));
    });
    return shaped;
  }, [normalizedSymbols, snapshot.quotes]);

  const loading = normalizedSymbols.some((symbol) => {
    const quote = snapshot.quotes[symbol];
    return snapshot.loadingSymbols.has(symbol) && quote?.price == null;
  });

  const refresh = () => queueFetch(normalizedSymbols, 0);

  return {
    quotes,
    loading,
    error: snapshot.error,
    refresh,
  };
}
