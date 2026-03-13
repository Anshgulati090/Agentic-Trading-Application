const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try { const body = await res.json(); errMsg = body.detail || body.message || errMsg; } catch {}
      throw new ApiError(res.status, errMsg);
    }
    // Handle empty responses (204 No Content etc.)
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new ApiError(0, 'Request timed out');
    throw e;
  }
}

export const api = {
  getHealth:        ()         => request('/health'),
  getSignals:       (symbol)   => request(`/signals/${symbol}`),
  getPortfolioMetrics: ()      => request('/portfolio/metrics'),
  getMarketPrice:   (symbol)   => request(`/market/price/${symbol}`),
  executeAgent:     (payload)  => request('/agents/execute', { method: 'POST', body: JSON.stringify(payload) }),
  runBacktest:      (payload)  => request('/backtest', { method: 'POST', body: JSON.stringify(payload) }),
  getBacktest:      (id)       => request(`/backtest/${id}`),
};

export const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA'];

// Seed-stable mock price history for a symbol (so the chart doesn't jump on re-render)
export function getMockPriceHistory(symbol, days = 60) {
  const bases = { AAPL: 189.5, MSFT: 378.2, GOOGL: 141.8, AMZN: 182.4, TSLA: 248.7, META: 503.1, NVDA: 875.4 };
  const base = bases[symbol] || 150;
  // Deterministic seed from symbol
  let seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  function rand() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; }
  const now = Date.now();
  const points = [];
  let open = base;
  for (let i = days; i >= 0; i--) {
    const volatility = 0.018;
    const drift = 0.0003;
    const change = open * (drift + (rand() - 0.48) * volatility);
    const close = open + change;
    const high = Math.max(open, close) * (1 + rand() * 0.008);
    const low  = Math.min(open, close) * (1 - rand() * 0.008);
    points.push({
      date: new Date(now - i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: now - i * 86400000,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low:  +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.floor(rand() * 50_000_000 + 10_000_000),
    });
    open = close;
  }
  return points;
}
