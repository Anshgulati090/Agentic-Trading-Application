const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const WS_STATUS = {
  IDLE:         'idle',
  CONNECTING:   'connecting',
  CONNECTED:    'connected',
  DISCONNECTED: 'disconnected',
  ERROR:        'error',
  EXHAUSTED:    'exhausted',  // gave up after max retries
};

export class SignalWebSocket {
  constructor(symbol, onMessage, onStatusChange) {
    this.symbol        = symbol;
    this.onMessage     = onMessage;
    this.onStatusChange = onStatusChange;
    this.ws            = null;
    this.reconnectTimer = null;
    this.attempts      = 0;
    this.maxAttempts   = 8;
    this.active        = true;
    this._status       = WS_STATUS.IDLE;
  }

  _setStatus(s) {
    this._status = s;
    this.onStatusChange?.(s);
  }

  connect() {
    if (!this.active) return;
    // Don't try to open a second socket while one is still OPEN or CONNECTING
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    this._setStatus(WS_STATUS.CONNECTING);
    try {
      this.ws = new WebSocket(`${WS_BASE}/ws/signals/${this.symbol}`);
    } catch (e) {
      // WebSocket constructor can throw on totally invalid URLs
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
        this.onMessage?.({ ...data, _receivedAt: Date.now() });
      } catch {
        // Non-JSON frame — treat as a raw text signal
        this.onMessage?.({ raw: e.data, _receivedAt: Date.now() });
      }
    };

    this.ws.onerror = (ev) => {
      // onerror always fires just before onclose when the connection fails
      this._setStatus(WS_STATUS.ERROR);
    };

    this.ws.onclose = (ev) => {
      if (!this.active) return;
      // 1000 = normal closure, 1001 = going away — no need to reconnect
      if (ev.code === 1000 || ev.code === 1001) {
        this._setStatus(WS_STATUS.DISCONNECTED);
        return;
      }
      this._setStatus(WS_STATUS.DISCONNECTED);
      this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    if (!this.active) return;
    if (this.attempts >= this.maxAttempts) {
      this._setStatus(WS_STATUS.EXHAUSTED);
      return;
    }
    const delay = Math.min(500 * 2 ** this.attempts, 30_000); // 0.5s, 1s, 2s … 30s
    this.attempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  /** Force an immediate reconnect and reset the backoff counter */
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
      this.ws.onclose = null; // suppress the auto-reconnect inside onclose
      this.ws.close(1000, 'component unmount');
    }
  }
}
