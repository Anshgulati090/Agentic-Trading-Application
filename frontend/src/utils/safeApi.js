/**
 * Safe API Wrapper - Production-Ready Error Handling
 * Ensures all API calls return structured responses with proper error handling
 */

const DEFAULT_TIMEOUT = 8000; // 8 seconds
const AUTH_TIMEOUT = 5000; // 5 seconds for auth calls
const MAX_RETRIES = 2;
const RETRY_DELAY = 500; // 0.5 second

/**
 * Delay helper for retries
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with timeout and retry logic
 */
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        errorMessage = body.detail || body.message || body.error || errorMessage;
      } catch {
        // Response might not be JSON
      }
      
      // Auto-retry on server errors (5xx)
      if (response.status >= 500 && retries > 0) {
        console.warn(`[API] Server error (${response.status}), retrying... (${retries} attempts left)`);
        await delay(RETRY_DELAY);
        return fetchWithRetry(url, options, retries - 1);
      }

      throw new Error(errorMessage);
    }

    // Parse response
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    return {
      success: true,
      data,
      error: null,
      status: response.status,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout
    if (error.name === 'AbortError') {
      console.error(`[API] Request timed out after ${DEFAULT_TIMEOUT}ms`);
      return {
        success: false,
        data: null,
        error: 'Request timed out. Please try again.',
        status: 0,
      };
    }

    // Handle network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.error('[API] Network error - server may be offline');
      return {
        success: false,
        data: null,
        error: 'Server not reachable. Please ensure the backend is running.',
        status: 0,
      };
    }

    // Handle parsed errors
    if (error instanceof Error) {
      return {
        success: false,
        data: null,
        error: error.message,
        status: 0,
      };
    }

    // Unknown errors
    return {
      success: false,
      data: null,
      error: 'An unexpected error occurred',
      status: 0,
    };
  }
}

/**
 * Safe API request wrapper
 * Returns structured response: { success, data, error }
 */
export async function safeRequest(path, options = {}, token = null) {
  const BASE_URL = import.meta.env.VITE_API_URL || '/api';
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${path}`;
  
  console.log(`[SafeAPI] → ${options.method || 'GET'} ${url}`);
  
  const result = await fetchWithRetry(url, { ...options, headers });
  
  if (!result.success) {
    console.error(`[SafeAPI] ✗ ${path}: ${result.error}`);
  } else {
    console.log(`[SafeAPI] ✓ ${path}`);
  }
  
  return result;
}

/**
 * Get authentication token from localStorage
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Authenticated request helper
 */
export function authRequest(path, options = {}) {
  const token = getToken();
  return safeRequest(path, options, token);
}

/**
 * Unwrap API response (extract data field)
 */
export function unwrapResponse(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

/**
 * Safe array conversion - ensures we always have an array
 */
export function safeArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Safe object access with fallback
 */
export function safeGet(obj, path, fallback = null) {
  if (!obj) return fallback;
  
  try {
    return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? fallback;
  } catch {
    return fallback;
  }
}

// ============================================================================
// SAFE API METHODS
// ============================================================================

export const safeApi = {
  // Auth
  register: async (email, password, full_name) => {
    const result = await safeRequest('/auth/register', { 
      method: 'POST', 
      body: JSON.stringify({ email, password, full_name }) 
    });
    return result;
  },
  
  login: async (email, password) => {
    const result = await safeRequest('/auth/login', { 
      method: 'POST', 
      body: JSON.stringify({ email, password }) 
    });
    return result;
  },
  
  logout: async () => {
    const result = await safeRequest('/auth/logout', { method: 'POST' });
    if (result.success) {
      localStorage.removeItem('token');
    }
    return result;
  },
  
  getMe: async (token) => {
    const result = await safeRequest('/auth/me', {}, token);
    return result;
  },
  
  verifyEmail: async (token) => {
    const result = await safeRequest('/auth/verify-email', { 
      method: 'POST', 
      body: JSON.stringify({ token }) 
    });
    return result;
  },
  
  resendVerification: async (email) => {
    const result = await safeRequest('/auth/resend-verification', { 
      method: 'POST', 
      body: JSON.stringify({ email }) 
    });
    return result;
  },

  // Health
  getHealth: async () => {
    const result = await safeRequest('/health');
    return result;
  },

  // Market
  getMarketPrice: async (symbol) => {
    const result = await safeRequest(`/market/price/${symbol}`);
    return result;
  },
  
  getOHLCV: async (symbol, period = '1M') => {
    const result = await safeRequest(`/market/ohlcv/${symbol}?period=${period}`);
    return result;
  },
  
  getSymbolInfo: async (symbol) => {
    const result = await safeRequest(`/market/info/${symbol}`);
    return result;
  },
  
  searchSymbols: async (q) => {
    const result = await safeRequest(`/market/search?q=${encodeURIComponent(q)}`);
    return result;
  },
  
  getPopularSymbols: async () => {
    const result = await safeRequest('/market/popular');
    return result;
  },

  // Signals
  getSignals: async (symbol) => {
    const result = await safeRequest(`/signals/${symbol}`);
    return result;
  },

  // Portfolio
  getPortfolioMetrics: async () => {
    const result = await authRequest('/portfolio/metrics');
    return result;
  },

  // Demo Trading
  getDemoAccount: async () => {
    const result = await authRequest('/demo/account');
    return result;
  },
  
  executeDemoTrade: async (payload) => {
    const result = await authRequest('/demo/trade', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    });
    return result;
  },
  
  getDemoTrades: async (limit = 50) => {
    const result = await authRequest(`/demo/trades?limit=${limit}`);
    return result;
  },
  
  resetDemoAccount: async () => {
    const result = await authRequest('/demo/reset', { method: 'DELETE' });
    return result;
  },

  // Learning
  getLearningAccount: async () => {
    const result = await authRequest('/learning/account');
    return result;
  },
  
  getLearningAgents: async () => {
    const result = await safeRequest('/learning/agents');
    return result;
  },
  
  executeLearningTrade: async (payload) => {
    const result = await authRequest('/learning/trade', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    });
    return result;
  },

  // Profile
  getProfile: async () => {
    const result = await authRequest('/profile/me');
    return result;
  },
  
  updateProfile: async (payload) => {
    const result = await authRequest('/profile/me', { 
      method: 'PUT', 
      body: JSON.stringify(payload) 
    });
    return result;
  },
  
  changePassword: async (payload) => {
    const result = await authRequest('/profile/password', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    });
    return result;
  },
  
  refillDemoBalance: async (mode = 'free') => {
    const result = await authRequest('/profile/refill', { 
      method: 'POST', 
      body: JSON.stringify({ mode }) 
    });
    return result;
  },

  // Agents
  executeAgent: async (payload) => {
    const result = await authRequest('/agents/execute', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    });
    return result;
  },

  // AI assistant
  askAssistant: async (message) => {
    const result = await safeRequest('/ai/assistant', { 
      method: 'POST', 
      body: JSON.stringify({ message }) 
    });
    return result;
  },
};

export default safeApi;
