const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

const RETRYABLE_METHODS = new Set(['GET']);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizePayload(payload) {
  if (payload && typeof payload === 'object') {
    if ('data' in payload) return payload.data;
    if (payload.status === 'success' && 'data' in payload) return payload.data;
  }
  return payload;
}

async function request(path, options = {}, token = null, attempt = 0) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
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
      try { const body = await res.json(); errMsg = body.detail || body.message || errMsg; } catch {}
      const method = (options.method || 'GET').toUpperCase();
      if (res.status >= 500 && RETRYABLE_METHODS.has(method) && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        return request(path, options, token, attempt + 1);
      }
      if (res.status === 401) {
        localStorage.removeItem('token');
      }
      throw new ApiError(res.status, errMsg);
    }
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    return normalizePayload(payload);
  } catch (e) {
    clearTimeout(timeout);
    const method = (options.method || 'GET').toUpperCase();
    if ((e?.name === 'AbortError' || e?.message?.includes('Network')) && RETRYABLE_METHODS.has(method) && attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      return request(path, options, token, attempt + 1);
    }
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

function unwrap(payload) {
  return normalizePayload(payload);
}

export const api = {
  // Auth
  register: (email, password, full_name) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: (token) => request('/auth/me', {}, token),
  verifyEmail: (token) => request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  resendVerification: (email) => request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),

  // Health
  getHealth: () => request('/health'),

  // Market
  getMarketPrice: (symbol) => request(`/market/price/${symbol}`),
  getMarketPrices: (symbols) => request(`/market/prices/bulk?symbols=${symbols.join(',')}`),
  getOHLCV: (symbol, period = '1M', interval = null) => {
    const params = new URLSearchParams({ period });
    if (interval) params.set('interval', interval);
    return request(`/market/ohlcv/${symbol}?${params.toString()}`);
  },
  getSymbolInfo: (symbol) => request(`/market/info/${symbol}`),
  searchSymbols: (q) => request(`/market/search?q=${encodeURIComponent(q)}`),
  getPopularSymbols: () => request('/market/popular'),
  getTechnicals: (symbol) => request(`/market/technicals/${symbol}`),

  // Signals
  getSignals: (symbol) => request(`/signals/${symbol}`),

  // Portfolio
  getPortfolioMetrics: () => authReq('/portfolio/metrics'),

  // Demo Trading
  getDemoAccount: () => authReq('/demo/account'),
  executeDemoTrade: (payload) => authReq('/demo/trade', { method: 'POST', body: JSON.stringify(payload) }),
  getDemoTrades: (limit = 50) => authReq(`/demo/trades?limit=${limit}`),
  resetDemoAccount: () => authReq('/demo/reset', { method: 'DELETE' }),

  // Learning
  getLearningAccount: async () => unwrap(await authReq('/learning/account')),
  getLearningAgents: async () => unwrap(await request('/learning/agents')),
  getLearningAgent: async (agentId) => unwrap(await request(`/learning/agents/${agentId}`)),
  executeLearningTrade: async (payload) => unwrap(await authReq('/learning/trade', { method: 'POST', body: JSON.stringify(payload) })),

  // Profile
  getProfile: async () => unwrap(await authReq('/profile/me')),
  updateProfile: async (payload) => unwrap(await authReq('/profile/me', { method: 'PUT', body: JSON.stringify(payload) })),
  changePassword: async (payload) => unwrap(await authReq('/profile/password', { method: 'POST', body: JSON.stringify(payload) })),
  refillDemoBalance: async (mode = 'free') => unwrap(await authReq('/profile/refill', { method: 'POST', body: JSON.stringify({ mode }) })),

  // Agents
  executeAgent: (payload) => authReq('/agents/execute', { method: 'POST', body: JSON.stringify(payload) }),

  // AI assistant
  askAssistant: async (message) => unwrap(await request('/ai/assistant', { method: 'POST', body: JSON.stringify({ message }) })),
};

export const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ', 'DIA', 'IWM', 'BTC-USD', 'ETH-USD'];

export const BROKERS = [
  { name: 'Alpaca', url: 'https://alpaca.markets', description: 'Commission-free stock trading API', logo: '🦙' },
  { name: 'Interactive Brokers', url: 'https://www.interactivebrokers.com', description: 'Professional trading platform', logo: '📊' },
  { name: 'Binance', url: 'https://www.binance.com', description: 'Cryptocurrency exchange', logo: '₿' },
];

export function getMockPriceHistory(symbol, days = 60) {
  const bases = { AAPL: 189.5, MSFT: 378.2, GOOGL: 141.8, AMZN: 182.4, TSLA: 248.7, META: 503.1, NVDA: 875.4 };
  const base = bases[symbol] || 150;
  let seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  function rand() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; }
  const now = Date.now();
  const points = [];
  let open = base;
  for (let i = days; i >= 0; i--) {
    const change = open * ((rand() - 0.5) * 0.015);
    const close = open + change;
    const high = Math.max(open, close) * (1 + rand() * 0.008);
    const low = Math.min(open, close) * (1 - rand() * 0.008);
    const ts = now - i * 86400000;
    points.push({
      time: Math.floor(ts / 1000),
      date: new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2),
      volume: Math.floor(rand() * 50_000_000 + 10_000_000),
    });
    open = close;
  }
  return points;
}
