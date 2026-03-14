import { SYMBOLS } from "../data/marketCatalog";
export { SYMBOLS } from "../data/marketCatalog";

const BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const TOKEN_KEY = "agentic_trading_token";
const USER_KEY = "agentic_trading_user";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const url = path.startsWith("http://") || path.startsWith("https://") ? path : `${BASE_URL}${path}`;
  const retries = options.retries ?? (String(options.method || "GET").toUpperCase() === "GET" ? 1 : 0);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          message = body.detail || body.message || message;
        } catch {}
        if (attempt < retries && response.status >= 500) {
          continue;
        }
        throw new ApiError(response.status, message);
      }

      const text = await response.text();
      if (!text) return null;

      const json = JSON.parse(text);
      if (json && json.status && json.data !== undefined) {
        return json.data;
      }
      return json;
    } catch (error) {
      if (attempt < retries && error.name !== "AbortError") {
        continue;
      }
      clearTimeout(timeout);
      if (error.name === "AbortError") {
        throw new ApiError(0, "Request timed out");
      }
      throw error;
    }
  }
}

export const api = {
  register: async ({ email, password, display_name }) => {
    const result = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name }),
    });
    setSession(result.token, result.user);
    return result.user;
  },

  login: async (email, password) => {
    const result = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setSession(result.token, result.user);
    return result.user;
  },

  logout: async () => {
    try {
      await request("/auth/logout", { method: "POST" });
    } finally {
      clearSession();
    }
  },

  getMe: async () => {
    const user = await request("/auth/me");
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  getHealth: () => request("/health"),
  getSignals: (symbol) => request(`/signals/${symbol}`),
  getPortfolioMetrics: () => request("/portfolio/metrics"),
  getLearningAccount: () => request("/learning/account"),
  getLearningAgents: () => request("/learning/agents"),
  getLearningAgent: (agentId) => request(`/learning/agents/${agentId}`),
  executeLearningTrade: (payload) => request("/learning/trade", { method: "POST", body: JSON.stringify(payload) }),
  getProfile: () => request("/profile/me"),
  updateProfile: (payload) => request("/profile/me", { method: "PUT", body: JSON.stringify(payload) }),
  changePassword: (payload) => request("/profile/password", { method: "POST", body: JSON.stringify(payload) }),
  refillDemoBalance: (mode = "free") => request("/profile/refill", { method: "POST", body: JSON.stringify({ mode }) }),

  getMarketPrice: async (symbol, timeframe = "1M") => {
    const data = await request(`/market/price/${symbol}?timeframe=${encodeURIComponent(timeframe)}`);
    return {
      symbol: data?.symbol ?? symbol,
      price: Number(data?.price ?? 0),
      change: Number(data?.change ?? 0),
      changePct: Number(data?.changePct ?? 0),
      history: Array.isArray(data?.history) ? data.history : [],
      timestamp: data?.timestamp ?? null,
    };
  },
  resolveSymbol: (query) => request(`/market/resolve?query=${encodeURIComponent(query)}`),
  suggestSymbols: (query, limit = 6) => request(`/market/suggest?query=${encodeURIComponent(query)}&limit=${limit}`),

  executeAgent: (payload) =>
    request("/agents/execute", {
      method: "POST",
      body: JSON.stringify({
        symbol: payload?.symbol ?? "AAPL",
        action: payload?.action ?? "BUY",
        quantity: payload?.quantity ?? 10,
        price: payload?.price ?? 180,
        agent_id: payload?.agent_id ?? payload?.strategy ?? "manual",
        strategy: payload?.strategy ?? "manual",
      }),
    }),
};

export function getMockPriceHistory(symbol, days = 60) {
  const bases = {
    AAPL: 189.5,
    MSFT: 378.2,
    GOOGL: 141.8,
    AMZN: 182.4,
    TSLA: 248.7,
    META: 503.1,
    NVDA: 875.4,
    NFLX: 618.4,
    AMD: 171.6,
    INTC: 43.2,
    PLTR: 28.4,
    CRM: 298.1,
    ORCL: 130.2,
    JPM: 196.5,
    GS: 411.4,
    V: 286.2,
    WMT: 61.4,
    COST: 729.7,
    XOM: 111.2,
    CVX: 156.4,
    SPY: 511.3,
    QQQ: 438.2,
    IWM: 206.1,
    GLD: 214.5,
    BTC: 68250.0,
    ETH: 3520.0,
    SOL: 176.0,
  };

  const base = bases[symbol] || 150;
  let seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  function rand() {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  }

  const now = Date.now();
  const points = [];
  let open = base;

  for (let i = days; i >= 0; i--) {
    const volatility = symbol === "BTC" ? 0.03 : 0.018;
    const drift = 0.0003;
    const change = open * (drift + (rand() - 0.48) * volatility);
    const close = open + change;
    const high = Math.max(open, close) * (1 + rand() * 0.008);
    const low = Math.min(open, close) * (1 - rand() * 0.008);

    points.push({
      date: new Date(now - i * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      timestamp: now - i * 86400000,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.floor(rand() * 50000000 + 10000000),
    });

    open = close;
  }

  return points;
}
