import { useState, useEffect, useRef } from 'react';

// Caching structure globally so rapid unmount/mount doesn't wipe screen instantly
const globalCache = {};

export function useBinanceLive(symbol) {
  const [data, setData] = useState({ trade: null, kline: null, depth: null });
  const socketRef = useRef(null);

  useEffect(() => {
    if (!symbol) return;
    const sym = symbol.toUpperCase();
    
    // Set initial known state immediately
    if (globalCache[sym]) {
      setData(globalCache[sym]);
    } else {
      globalCache[sym] = { trade: null, kline: null, depth: null };
    }

    const wsUrl = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}`.replace('http', 'ws') + `/ws/binance/${sym}`;
    let reconnectDelay = 500;
    
    const connect = () => {
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
        console.warn(`Binance WS disconnected for ${sym}. Reconnecting <800ms...`);
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 1.5, 3000);
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        // Prevent reconnect loop on deliberate unmount
        socketRef.current.onclose = null; 
        socketRef.current.close();
      }
    };
  }, [symbol]);

  return data;
}
