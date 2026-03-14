function getDefaultWsBase() {
  if (typeof window === "undefined") {
    return "ws://localhost:8000";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

const WS_BASE = (import.meta.env.VITE_WS_URL || getDefaultWsBase()).replace(/\/$/, "");

export const WS_STATUS = {
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
  EXHAUSTED: "exhausted",
};

export class SignalWebSocket {
  constructor(symbol, onMessage, onStatusChange) {
    this.symbol = symbol;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.ws = null;
    this.reconnectTimer = null;
    this.attempts = 0;
    this.maxAttempts = 8;
    this.active = true;
    this._status = WS_STATUS.IDLE;
  }

  _setStatus(status) {
    this._status = status;
    this.onStatusChange?.(status);
  }

  connect() {
    if (!this.active) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this._setStatus(WS_STATUS.CONNECTING);

    try {
      this.ws = new WebSocket(`${WS_BASE}/ws/signals/${encodeURIComponent(this.symbol)}`);
    } catch {
      this._setStatus(WS_STATUS.ERROR);
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.attempts = 0;
      this._setStatus(WS_STATUS.CONNECTED);
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const payload = parsed?.data ?? parsed;
        this.onMessage?.({ ...payload, _receivedAt: Date.now() });
      } catch {
        this.onMessage?.({ raw: event.data, _receivedAt: Date.now() });
      }
    };

    this.ws.onerror = () => {
      this._setStatus(WS_STATUS.ERROR);
    };

    this.ws.onclose = (event) => {
      if (!this.active) return;
      if (event.code === 1000 || event.code === 1001) {
        this._setStatus(WS_STATUS.DISCONNECTED);
        return;
      }
      this._setStatus(WS_STATUS.DISCONNECTED);
      this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    if (!this.active) return;
    clearTimeout(this.reconnectTimer);

    if (this.attempts >= this.maxAttempts) {
      this._setStatus(WS_STATUS.EXHAUSTED);
      return;
    }

    const delay = Math.min(500 * 2 ** this.attempts, 30000);
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  reconnect() {
    this.attempts = 0;
    clearTimeout(this.reconnectTimer);
    this.ws?.close(1000, "manual reconnect");
    this.connect();
  }

  disconnect() {
    this.active = false;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close(1000, "component unmount");
    }
  }
}
