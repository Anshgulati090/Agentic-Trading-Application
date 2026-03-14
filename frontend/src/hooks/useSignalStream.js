import { useState, useEffect, useRef, useCallback } from "react";
import { SignalWebSocket, WS_STATUS } from "../services/websocket";

export function useSignalStream(symbol, maxMessages = 50) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(WS_STATUS.IDLE);
  const wsRef = useRef(null);
  const lastFingerprintRef = useRef(null);

  const handleMessage = useCallback((msg) => {
    setMessages((prev) => {
      const nextMessage = { ...msg, _ts: Date.now() };
      const fingerprint = JSON.stringify({
        symbol: msg?.symbol ?? null,
        signal: msg?.signal ?? null,
        price: msg?.price ?? null,
        confidence: msg?.confidence ?? null,
        raw: msg?.raw ?? null,
      });

      if (lastFingerprintRef.current === fingerprint && prev.length > 0) {
        const next = [...prev];
        next[next.length - 1] = nextMessage;
        return next;
      }

      lastFingerprintRef.current = fingerprint;
      const next = [...prev, nextMessage];

      // keep only latest N messages
      if (next.length > maxMessages) {
        next.shift();
      }

      return next;
    });
  }, [maxMessages]);

  useEffect(() => {
    if (!symbol) {
      setMessages([]);
      setStatus(WS_STATUS.IDLE);
      return;
    }

    wsRef.current?.disconnect();
    setMessages([]);
    lastFingerprintRef.current = null;

    const ws = new SignalWebSocket(symbol, handleMessage, setStatus);
    wsRef.current = ws;
    ws.connect();

    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, [symbol, handleMessage]);

  const reconnect = useCallback(() => {
    wsRef.current?.reconnect();
  }, []);

  return { messages, status, reconnect };
}
