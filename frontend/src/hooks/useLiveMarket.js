import { useState, useEffect, useRef } from 'react';

// Singleton WebSocket management to prevent duplicate connections across components
let sharedSocket = null;
const subscribers = new Set();
// Store latest known ticks instantly
const latestTicks = {}; 

const WS_URL = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}`.replace('http', 'ws') + '/ws/market';

function notifySubscribers(ticks) {
  subscribers.forEach(cb => cb(ticks));
}

function initSharedSocket() {
  if (sharedSocket) return;

  let reconnectDelay = 500;
  
  function connect() {
    console.log('[Anti-Gravity] Connecting to live ticker stream...', WS_URL);
    sharedSocket = new WebSocket(WS_URL);

    sharedSocket.onopen = () => {
      console.log('[Anti-Gravity] WebSocket connected. Live stream active.');
      reconnectDelay = 500; // Reset fast backoff
    };

    sharedSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'tick') {
          const tick = msg.data;
          // Sub 5ms processing: overwrite memory cache and broadcast to react render tree instantly
          latestTicks[tick.symbol] = tick;
          notifySubscribers({ ...latestTicks });
        }
      } catch (e) {
        console.error('[Anti-Gravity] Error parsing tick:', e);
      }
    };

    sharedSocket.onclose = () => {
      console.warn(`[Anti-Gravity] Stream dropped. Reconnecting in ${reconnectDelay}ms...`);
      sharedSocket = null;
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 1.5, 5000); // Max backoff 5s
    };

    sharedSocket.onerror = (err) => {
      // Allow onclose to handle reconnect
      console.warn('[Anti-Gravity] WebSocket encountered an error.', err);
    };
  }

  connect();
}

/**
 * useLiveMarket()
 * React hook to consume ultra-low-latency Websocket updates from the Anti-Gravity engine.
 * Components will automatically re-render only when tick data updates.
 */
export function useLiveMarket() {
  const [ticks, setTicks] = useState(latestTicks);

  useEffect(() => {
    // Start global stream if not started
    initSharedSocket();

    // Subscribe local component state to global live ticks
    const handleUpdate = (newTicks) => setTicks(newTicks);
    subscribers.add(handleUpdate);
    
    // Trigger immediate render with current cache
    setTicks({ ...latestTicks });

    return () => {
      subscribers.delete(handleUpdate);
    };
  }, []);

  return ticks;
}
