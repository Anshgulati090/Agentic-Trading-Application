import { useState, useEffect } from 'react';
import { WS_BASE } from '../services/websocket';

// Singleton WebSocket management to prevent duplicate connections across components
let sharedSocket = null;
let reconnectTimer = null;
let restRefreshTimer = null;
const subscribers = new Set();
const latestTicks = {};

const WS_URL = `${WS_BASE}/market`;
const BOOTSTRAP_SYMBOLS = [
  'SPY', 'QQQ', 'DIA', 'GLD', 'VIX',
  'BTC-USD', 'ETH-USD', 'AAPL', 'MSFT', 'NVDA', 'TSLA',
];

function resolveApiBase() {
  const configured = import.meta.env.VITE_API_URL;
  if (!configured) return '/api';
  return configured.replace(/\/$/, '');
}

const API_BASE = resolveApiBase();

function normalizeTick(raw) {
  if (!raw?.symbol) return null;
  const price = Number(raw.price);
  if (!Number.isFinite(price)) return null;
  const normalizedSymbol = String(raw.symbol).toUpperCase();
  const symbol = normalizedSymbol === '^VIX' || normalizedSymbol === '%5EVIX' ? 'VIX' : normalizedSymbol;

  const change = Number(raw.change ?? 0);
  const changePctRaw = raw.changePct ?? raw.change_pct ?? 0;
  const changePct = Number(changePctRaw);
  return {
    ...raw,
    symbol,
    price,
    change: Number.isFinite(change) ? change : 0,
    changePct: Number.isFinite(changePct) ? changePct : 0,
    source: raw.source || 'ws_stream',
    timestamp: raw.timestamp ?? Date.now() / 1000,
  };
}

function notifySubscribers(ticks) {
  subscribers.forEach((cb) => cb(ticks));
}

function mergeAndBroadcast(tick) {
  const normalized = normalizeTick(tick);
  if (!normalized) return;
  latestTicks[normalized.symbol] = normalized;
  notifySubscribers({ ...latestTicks });
}

async function fetchBootstrapQuotes() {
  const symbols = BOOTSTRAP_SYMBOLS.join(',');
  const url = `${API_BASE}/market/prices/bulk?symbols=${encodeURIComponent(symbols)}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return;
    const payload = await response.json();
    const quotes = payload?.data || {};
    Object.entries(quotes).forEach(([symbol, quote]) => {
      mergeAndBroadcast({
        symbol,
        price: quote?.price,
        change: quote?.change,
        changePct: quote?.changePct ?? quote?.change_pct,
        volume: quote?.volume,
        source: 'rest_bootstrap',
        timestamp: Date.now() / 1000,
      });
    });
  } catch {
    // No-op: websocket stream may still provide updates
  }
}

function initSharedSocket() {
  if (sharedSocket) return;

  let reconnectDelay = 500;

  function connect() {
    console.log('[Anti-Gravity] Connecting to live ticker stream...', WS_URL);
    sharedSocket = new WebSocket(WS_URL);

    sharedSocket.onopen = () => {
      console.log('[Anti-Gravity] WebSocket connected. Live stream active.');
      reconnectDelay = 500;
    };

    sharedSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'tick' && msg.data) {
          mergeAndBroadcast(msg.data);
        }
      } catch (e) {
        console.error('[Anti-Gravity] Error parsing tick:', e);
      }
    };

    sharedSocket.onclose = () => {
      console.warn(`[Anti-Gravity] Stream dropped. Reconnecting in ${reconnectDelay}ms...`);
      sharedSocket = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 1.5, 5000);
    };

    sharedSocket.onerror = (err) => {
      console.warn('[Anti-Gravity] WebSocket encountered an error.', err);
    };
  }

  fetchBootstrapQuotes();
  connect();

  if (!restRefreshTimer) {
    restRefreshTimer = setInterval(fetchBootstrapQuotes, 12000);
  }
}

/**
 * useLiveMarket()
 * React hook to consume low-latency websocket updates with REST bootstrap fallback.
 */
export function useLiveMarket() {
  const [ticks, setTicks] = useState(latestTicks);

  useEffect(() => {
    initSharedSocket();
    const handleUpdate = (newTicks) => setTicks(newTicks);
    subscribers.add(handleUpdate);
    setTicks({ ...latestTicks });

    return () => {
      subscribers.delete(handleUpdate);
    };
  }, []);

  return ticks;
}
