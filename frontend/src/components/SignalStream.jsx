import { useState } from 'react';
import { useSignalStream } from '../hooks/useSignalStream';
import { SYMBOLS } from '../services/api';
import { WS_STATUS } from '../services/websocket';

const STATUS_META = {
  [WS_STATUS.CONNECTED]:    { dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400', label: 'Live' },
  [WS_STATUS.CONNECTING]:   { dot: 'bg-amber-400 animate-pulse',   text: 'text-amber-400',   label: 'Connecting' },
  [WS_STATUS.DISCONNECTED]: { dot: 'bg-red-400',                   text: 'text-red-400',     label: 'Disconnected' },
  [WS_STATUS.ERROR]:        { dot: 'bg-red-500',                   text: 'text-red-500',     label: 'Error' },
  [WS_STATUS.EXHAUSTED]:    { dot: 'bg-zinc-500',                  text: 'text-zinc-500',    label: 'Retries exhausted' },
  [WS_STATUS.IDLE]:         { dot: 'bg-zinc-600',                  text: 'text-zinc-600',    label: 'Idle' },
};

const SIGNAL_STYLE = {
  BUY:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  SELL: 'text-red-400 bg-red-400/10 border-red-400/30',
  HOLD: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
};

function SignalBadge({ signal }) {
  return (
    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold tracking-wider shrink-0 ${SIGNAL_STYLE[signal] ?? SIGNAL_STYLE.HOLD}`}>
      {signal}
    </span>
  );
}

export default function SignalStream() {
  const [symbol, setSymbol] = useState('AAPL');
  const { messages, status, reconnect } = useSignalStream(symbol);
  const meta = STATUS_META[status] ?? STATUS_META[WS_STATUS.IDLE];
  const canReconnect = status === WS_STATUS.DISCONNECTED || status === WS_STATUS.ERROR || status === WS_STATUS.EXHAUSTED;

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <span className={`text-[10px] font-mono uppercase tracking-widest ${meta.text}`}>{meta.label}</span>
          {canReconnect && (
            <button
              onClick={reconnect}
              className="text-[10px] font-mono text-zinc-500 hover:text-cyan-400 underline underline-offset-2 transition-colors"
            >
              retry
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <span className="text-[10px] font-mono text-zinc-600">{messages.length}</span>
          )}
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono px-2 py-1 rounded focus:outline-none focus:border-cyan-500 transition-colors"
          >
            {SYMBOLS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Stream body */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1 font-mono text-xs">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
            {status === WS_STATUS.CONNECTING ? (
              <>
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
                <span className="text-zinc-600">Connecting to {symbol} stream…</span>
              </>
            ) : status === WS_STATUS.CONNECTED ? (
              <span className="text-zinc-600">Awaiting signals for {symbol}…</span>
            ) : status === WS_STATUS.EXHAUSTED ? (
              <div className="text-center space-y-1">
                <div className="text-red-400">Connection failed</div>
                <div className="text-zinc-600">Backend may be unavailable</div>
                <button onClick={reconnect} className="mt-2 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded hover:bg-cyan-500/10 transition-colors">
                  Retry
                </button>
              </div>
            ) : (
              <span className="text-zinc-600">No signals yet</span>
            )}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={`${msg._ts}-${i}`}
              className={`flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                i === 0 ? 'bg-zinc-800/80 border border-zinc-700/50' : 'hover:bg-zinc-800/30'
              }`}
            >
              <span className="text-zinc-600 shrink-0 tabular-nums">
                {new Date(msg._ts).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              {msg.signal  && <SignalBadge signal={msg.signal} />}
              {msg.symbol  && <span className="text-cyan-400 shrink-0">{msg.symbol}</span>}
              {msg.price   && <span className="text-zinc-300 tabular-nums">${Number(msg.price).toFixed(2)}</span>}
              {msg.confidence != null && (
                <span className="text-zinc-500 tabular-nums ml-auto">{(msg.confidence * 100).toFixed(0)}%</span>
              )}
              {/* Fallback: show raw JSON for unknown shapes */}
              {!msg.signal && !msg.symbol && !msg.price && (
                <span className="text-zinc-500 truncate">{msg.raw ?? JSON.stringify(msg).slice(0, 80)}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
