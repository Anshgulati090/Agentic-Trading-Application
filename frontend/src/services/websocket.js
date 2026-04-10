export function resolveWsBase() {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) {
    if (configured.startsWith('ws://') || configured.startsWith('wss://')) {
      return configured.replace(/\/$/, '');
    }
    if (configured.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}${configured}`.replace(/\/$/, '');
    }
  }

  if (typeof window !== 'undefined') {
    // In development (Vite dev server on port 3000), proxy /ws to backend
    // In production, use same host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // e.g. localhost:3000
    return `${protocol}//${host}/ws`; // Vite proxies /ws -> ws://127.0.0.1:8000
  }

  return 'ws://127.0.0.1:8000/ws';
}

export const WS_BASE = resolveWsBase();

export const WS_STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  EXHAUSTED: 'exhausted',
};

export class SignalWebSocket {
  constructor(symbol, onMessage, onStatusChange) {
    this.symbol = symbol;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.ws = null;
    this.reconnectTimer = null;
    this.attempts = 0;
    this.maxAttempts = 15;
    this.active = true;
    this._status = WS_STATUS.IDLE;
  }

  _setStatus(s) {
    this._status = s;
    this.onStatusChange?.(s);
  }

  connect() {
    if (!this.active) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this._setStatus(WS_STATUS.CONNECTING);
    try {
      this.ws = new WebSocket(`${WS_BASE}/signals/${this.symbol}`);
    } catch {
      this._setStatus(WS_STATUS.ERROR);
      this._scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.attempts = 0;
      this._setStatus(WS_STATUS.CONNECTED);
    };
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        this.onMessage?.({ ...(data?.data || data), _receivedAt: Date.now() });
      } catch {
        this.onMessage?.({ raw: e.data, _receivedAt: Date.now() });
      }
    };
    this.ws.onerror = () => this._setStatus(WS_STATUS.ERROR);
    this.ws.onclose = (ev) => {
      if (!this.active) return;
      if (ev.code === 1000 || ev.code === 1001) { this._setStatus(WS_STATUS.DISCONNECTED); return; }
      this._setStatus(WS_STATUS.DISCONNECTED);
      this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    if (!this.active) return;
    if (this.attempts >= this.maxAttempts) { this._setStatus(WS_STATUS.EXHAUSTED); return; }
    const delay = Math.min(500 * 2 ** this.attempts, 30000);
    this.attempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  reconnect() {
    this.attempts = 0;
    clearTimeout(this.reconnectTimer);
    this.ws?.close(1000, 'manual reconnect');
    this.connect();
  }

  disconnect() {
    this.active = false;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close(1000, 'unmount');
    }
  }
}
