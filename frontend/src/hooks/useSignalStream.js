import { useState, useEffect, useRef, useCallback } from 'react';
import { SignalWebSocket, WS_STATUS } from '../services/websocket';

function normalizePrice(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : 'na';
}

function buildMessageKey(message) {
  return [
    message?.symbol || '',
    message?.signal || message?.action || '',
    normalizePrice(message?.price),
    message?.agent || '',
  ].join('|');
}

const MERGE_WINDOW_MS = 5000;

export function useSignalStream(symbol, maxMessages = 100) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(WS_STATUS.IDLE);
  const wsRef = useRef(null);
  const lastKeyRef = useRef('');

  const handleMessage = useCallback((msg) => {
    const nextMessage = { ...msg, _ts: msg._receivedAt ?? Date.now() };
    const nextKey = buildMessageKey(nextMessage);
    setMessages((prev) => {
      const previous = prev[0];
      const canMerge =
        previous &&
        lastKeyRef.current === nextKey &&
        Math.abs((nextMessage._ts ?? 0) - (previous._ts ?? 0)) < MERGE_WINDOW_MS;

      if (canMerge) {
        const updated = [...prev];
        updated[0] = {
          ...updated[0],
          ...nextMessage,
          _ts: nextMessage._ts,
          _updates: (updated[0]?._updates ?? 1) + 1,
        };
        return updated;
      }

      const next = [{ ...nextMessage, _updates: 1 }, ...prev];
      lastKeyRef.current = nextKey;
      return next.length > maxMessages ? next.slice(0, maxMessages) : next;
    });
  }, [maxMessages]);

  useEffect(() => {
    if (!symbol) return;
    wsRef.current?.disconnect();
    setMessages([]);
    lastKeyRef.current = '';
    const ws = new SignalWebSocket(symbol, handleMessage, setStatus);
    wsRef.current = ws;
    ws.connect();
    return () => { ws.disconnect(); wsRef.current = null; };
  }, [handleMessage, symbol]);

  const reconnect = useCallback(() => wsRef.current?.reconnect(), []);
  return { messages, status, reconnect };
}
