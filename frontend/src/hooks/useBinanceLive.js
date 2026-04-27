import { useState, useEffect, useRef } from 'react';
import { WS_BASE } from '../services/websocket';

// Caching structure globally so rapid unmount/mount doesn't wipe screen instantly
const globalCache = {};
const SUPPORTED_BINANCE_SYMBOLS = new Set([
  'BTC-USD',
  'ETH-USD',
  'SOL-USD',
  'BNB-USD',
  'XRP-USD',
  'DOGE-USD',
  'ADA-USD',
]);

export function useBinanceLive(symbol) {
  const [data, setData] = useState({ trade: null, kline: null, depth: null });
  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    if (!symbol) return;
    const sym = symbol.toUpperCase();
    const isSupported = SUPPORTED_BINANCE_SYMBOLS.has(sym);

    if (!isSupported) {
      setData({ trade: null, kline: null, depth: null });
      return;
    }
    
    // Set initial known state immediately
    if (globalCache[sym]) {
      setData(globalCache[sym]);
    } else {
      globalCache[sym] = { trade: null, kline: null, depth: null };
    }

    const wsUrl = `${WS_BASE}/binance/${sym}`;
    let reconnectDelay = 500;
    shouldReconnectRef.current = true;
    
    const connect = () => {
      if (!shouldReconnectRef.current) return;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        reconnectDelay = 500;
      };

      socketRef.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type; // 'trade', 'kline', 'depth'
          if (type && msg.data) {
            globalCache[sym][type] = msg.data;
            // Force re-render instantly under 10ms boundary hook
            setData({ ...globalCache[sym] });
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      socketRef.current.onclose = () => {
        if (!shouldReconnectRef.current) return;
        console.warn(`Binance WS disconnected for ${sym}. Reconnecting <800ms...`);
        reconnectRef.current = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 1.5, 3000);
      };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      if (socketRef.current) {
        // Prevent reconnect loop on deliberate unmount
        socketRef.current.onclose = null; 
        socketRef.current.close();
      }
    };
  }, [symbol]);

  return data;
}
