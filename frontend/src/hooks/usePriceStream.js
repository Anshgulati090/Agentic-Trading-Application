import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_STATUS, WS_BASE } from '../services/websocket';

/**
 * Real-time price streaming hook with ultra-low latency
 * Connects to WebSocket /prices/{symbol} endpoint
 */
export function usePriceStream(symbol, enabled = true) {
  const [priceData, setPriceData] = useState(null);
  const [status, setStatus] = useState(WS_STATUS.IDLE);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    if (!symbol || !enabled) return;

    setStatus(WS_STATUS.CONNECTING);
    
    try {
      const wsUrl = `${WS_BASE}/prices/${symbol.toUpperCase()}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`[PriceStream] Connected to ${symbol}`);
        setStatus(WS_STATUS.CONNECTED);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.status === 'success' && message.data) {
            setPriceData((prev) => {
              // Merge with previous data to maintain state
              const newData = {
                ...prev,
                ...message.data,
                _receivedAt: Date.now(),
                _source: message.data.source || 'live',
              };
              return newData;
            });
          }
        } catch (error) {
          console.error('[PriceStream] Parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[PriceStream] Error:', error);
        setStatus(WS_STATUS.ERROR);
      };

      ws.onclose = () => {
        console.log(`[PriceStream] Disconnected from ${symbol}`);
        
        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts && enabled) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          reconnectAttempts.current += 1;
          
          console.log(`[PriceStream] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setStatus(WS_STATUS.DISCONNECTED);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[PriceStream] Connection failed:', error);
      setStatus(WS_STATUS.ERROR);
    }
  }, [symbol, enabled]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setStatus(WS_STATUS.DISCONNECTED);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    setTimeout(connect, 500);
  }, [disconnect, connect]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  // Calculate derived metrics
  const derivedMetrics = useCallback(() => {
    if (!priceData) return null;

    const source = priceData._source || priceData.source || 'unknown';
    const isLive = source === 'ws_stream' || source === 'live' || source === 'binance';
    const isCached = source === 'cached' || source === 'cache_fallback';
    const hasError = priceData.error != null;
    const age = Date.now() - (priceData._receivedAt || 0);
    const isStale = age > 15000; // Older than 15 seconds

    return {
      ...priceData,
      isLive,
      isCached,
      hasError,
      isStale,
      age,
      latency: age,
    };
  }, [priceData]);

  return {
    data: derivedMetrics(),
    status,
    connect,
    disconnect,
    reconnect,
    isLive: derivedMetrics()?.isLive || false,
  };
}
