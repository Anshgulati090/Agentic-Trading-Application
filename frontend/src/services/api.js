// IMPORTANT: Use relative /api path so Vite proxies requests server-side.
// This works whether you access via localhost OR a LAN IP (172.x.x.x)
// because the proxy runs on the Vite server, NOT in the browser.
// DO NOT set VITE_API_URL=http://localhost:8000 — breaks LAN access.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request(path, options = {}, token = null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers,
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        errMsg = body.detail || body.message || errMsg;
      } catch {}
      if (res.status === 401) {
        localStorage.removeItem('token');
      }
      throw new ApiError(res.status, errMsg);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new ApiError(0, 'Request timed out');
    throw e;
  }
}

function getToken() {
  return localStorage.getItem('token');
}

function authReq(path, options = {}) {
  return request(path, options, getToken());
}

// Unwrap { status, data } envelope if present
function unwrap(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────
  register: (email, password, full_name) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name }) }),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  getMe: (token) => request('/auth/me', {}, token),

  verifyEmail: (token) =>
    request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),

  resendVerification: (email) =>
    request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),

  // ── Health ───────────────────────────────────────────────────────
  getHealth: () => request('/health'),

  // ── Market ───────────────────────────────────────────────────────
  // Returns { status, data: { symbol, price, change, change_pct, volume, open, high, low, prev_close } }
  getMarketPrice: async (symbol) => {
    const payload = await request(`/market/price/${symbol.toUpperCase()}`);
    // Normalise so callers always get a flat object with price, change, changePct
    const d = payload?.data || payload || {};
    return {
      symbol: d.symbol || symbol.toUpperCase(),
      price: Number(d.price ?? 0),
      change: Number(d.change ?? 0),
      changePct: Number(d.change_pct ?? d.changePct ?? 0),
      change_pct: Number(d.change_pct ?? d.changePct ?? 0),
      volume: Number(d.volume ?? 0),
      open: Number(d.open ?? 0),
      high: Number(d.high ?? 0),
      low: Number(d.low ?? 0),
      prev_close: Number(d.prev_close ?? 0),
    };
  },

  getOHLCV: async (symbol, period = '1M') => {
    const payload = await request(`/market/ohlcv/${symbol.toUpperCase()}?period=${period}`);
    return payload; // { status, symbol, period, data: [{time, date, open, high, low, close, volume}] }
  },

  getSymbolInfo: async (symbol) => {
    const payload = await request(`/market/info/${symbol.toUpperCase()}`);
    return payload?.data || payload;
  },

  searchSymbols: (q) => request(`/market/search?q=${encodeURIComponent(q)}`),

  getPopularSymbols: () => request('/market/popular'),

  // ── Signals ──────────────────────────────────────────────────────
  getSignals: async (symbol) => {
    const payload = await request(`/signals/${symbol.toUpperCase()}`);
    return payload?.data || payload;
  },

  // ── Portfolio ─────────────────────────────────────────────────────
  getPortfolioMetrics: async () => {
    const payload = await authReq('/portfolio/metrics');
    return payload?.data || payload;
  },

  // ── Demo Trading ──────────────────────────────────────────────────
  getDemoAccount: async () => {
    // Returns AccountOut: { balance, initial_balance, total_invested, total_value, total_pnl, total_pnl_pct, positions[] }
    return await authReq('/demo/account');
  },

  executeDemoTrade: (payload) =>
    authReq('/demo/trade', { method: 'POST', body: JSON.stringify(payload) }),

  getDemoTrades: async (limit = 50) => {
    const payload = await authReq(`/demo/trades?limit=${limit}`);
    return Array.isArray(payload) ? payload : [];
  },

  resetDemoAccount: () => authReq('/demo/reset', { method: 'DELETE' }),

  // ── Learning ──────────────────────────────────────────────────────
  getLearningAccount: async () => {
    const payload = await authReq('/learning/account');
    return unwrap(payload);
  },

  getLearningAgents: async () => {
    const payload = await request('/learning/agents');
    return unwrap(payload) || [];
  },

  getLearningAgent: async (agentId) => {
    const payload = await request(`/learning/agents/${agentId}`);
    return unwrap(payload);
  },

  executeLearningTrade: async (payload) => {
    const res = await authReq('/learning/trade', { method: 'POST', body: JSON.stringify(payload) });
    return unwrap(res);
  },

  // ── Profile ───────────────────────────────────────────────────────
  getProfile: async () => {
    const payload = await authReq('/profile/me');
    return unwrap(payload);
  },

  updateProfile: async (payload) => {
    const res = await authReq('/profile/me', { method: 'PUT', body: JSON.stringify(payload) });
    return unwrap(res);
  },

  changePassword: async (payload) => {
    const res = await authReq('/profile/password', { method: 'POST', body: JSON.stringify(payload) });
    return unwrap(res);
  },

  refillDemoBalance: async (mode = 'free') => {
    const res = await authReq('/profile/refill', { method: 'POST', body: JSON.stringify({ mode }) });
    return unwrap(res);
  },

  // ── Agents ────────────────────────────────────────────────────────
  executeAgent: (payload) =>
    authReq('/agents/execute', { method: 'POST', body: JSON.stringify(payload) }),

  // ── AI Assistant ──────────────────────────────────────────────────
  askAssistant: async (message) => {
    const res = await request('/ai/assistant', { method: 'POST', body: JSON.stringify({ message }) });
    return unwrap(res);
  },
};

export const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA'];

export const BROKERS = [
  { name: 'Alpaca', url: 'https://alpaca.markets', description: 'Commission-free stock trading API', logo: '🦙' },
  { name: 'Interactive Brokers', url: 'https://www.interactivebrokers.com', description: 'Professional trading platform', logo: '📊' },
  { name: 'Binance', url: 'https://www.binance.com', description: 'Cryptocurrency exchange', logo: '₿' },
];

// Stable deterministic mock price history — seed is fixed so prices never drift on re-render
export function getMockPriceHistory(symbol, days = 60) {
  const bases = {
    AAPL: 189.5, MSFT: 378.2, GOOGL: 141.8, AMZN: 182.4,
    TSLA: 248.7, META: 503.1, NVDA: 875.4,
  };
  const base = bases[symbol] || 150;
  // Deterministic seed — never uses Date.now() so it never drifts
  let seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 9301;
  function rand() {
    seed = (seed * 49297 + 233323) % 233280;
    return seed / 233280;
  }
  // Fixed epoch start — same every render
  const startEpoch = 1735689600000; // 2025-01-01 00:00:00 UTC
  const points = [];
  let price = base;
  for (let i = 0; i <= days; i++) {
    const change = price * (0.0002 + (rand() - 0.5) * 0.016);
    const open = price;
    const close = Math.max(1, price + change);
    const high = Math.max(open, close) * (1 + rand() * 0.006);
    const low = Math.min(open, close) * (1 - rand() * 0.006);
    const ts = startEpoch + i * 86400000;
    points.push({
      time: Math.floor(ts / 1000),
      date: new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.floor(rand() * 40_000_000 + 8_000_000),
    });
    price = close;
  }
  return points;
}
