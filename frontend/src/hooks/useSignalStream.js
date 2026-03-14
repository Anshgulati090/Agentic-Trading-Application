import { useState, useEffect, useRef, useCallback } from 'react';
import { SignalWebSocket, WS_STATUS } from '../services/websocket';

export function useSignalStream(symbol, maxMessages = 100) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(WS_STATUS.IDLE);
  const wsRef = useRef(null);

  const handleMessage = useCallback((msg) => {
    setMessages((prev) => {
      const next = [{ ...msg, _ts: msg._receivedAt ?? Date.now() }, ...prev];
      return next.length > maxMessages ? next.slice(0, maxMessages) : next;
    });
  }, [maxMessages]);

  useEffect(() => {
    if (!symbol) return;
    wsRef.current?.disconnect();
    setMessages([]);
    const ws = new SignalWebSocket(symbol, handleMessage, setStatus);
    wsRef.current = ws;
    ws.connect();
    return () => { ws.disconnect(); wsRef.current = null; };
  }, [symbol]);

  const reconnect = useCallback(() => wsRef.current?.reconnect(), []);
  return { messages, status, reconnect };
}
