import { useState, useCallback, useEffect } from 'react';
import { useSignalStream } from '../hooks/useSignalStream';
import { api, SYMBOLS }    from '../services/api';
import { WS_STATUS }       from '../services/websocket';
import PriceChart          from '../components/PriceChart';

function SignalBadge({ signal }) {
  const STYLE = {
    BUY:  'bg-emerald-400/10 text-emerald-400 border-emerald-400/30',
    SELL: 'bg-red-400/10 text-red-400 border-red-400/30',
    HOLD: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider font-mono ${STYLE[signal] ?? STYLE.HOLD}`}>
      {signal}
    </span>
  );
}

const STATUS_META = {
  [WS_STATUS.CONNECTED]:    { dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400', label: 'Live' },
  [WS_STATUS.CONNECTING]:   { dot: 'bg-amber-400 animate-pulse',   text: 'text-amber-400',   label: 'Connecting…' },
  [WS_STATUS.DISCONNECTED]: { dot: 'bg-red-400',                   text: 'text-red-400',     label: 'Disconnected' },
  [WS_STATUS.ERROR]:        { dot: 'bg-red-500',                   text: 'text-red-500',     label: 'Error' },
  [WS_STATUS.EXHAUSTED]:    { dot: 'bg-zinc-500',                  text: 'text-zinc-500',    label: 'Retries exhausted' },
  [WS_STATUS.IDLE]:         { dot: 'bg-zinc-600',                  text: 'text-zinc-500',    label: 'Idle' },
};

export default function Signals() {
  const [symbol,      setSymbol]      = useState('AAPL');
  const [restSignal,  setRestSignal]  = useState(null);
  const [restLoading, setRestLoading] = useState(false);
  const [restError,   setRestError]   = useState(null);
  const { messages, status, reconnect } = useSignalStream(symbol, 150);
  const meta = STATUS_META[status] ?? STATUS_META[WS_STATUS.IDLE];
  const canReconnect = [WS_STATUS.DISCONNECTED, WS_STATUS.ERROR, WS_STATUS.EXHAUSTED].includes(status);

  const fetchREST = useCallback(async () => {
    setRestLoading(true);
    setRestError(null);
    try {
      const data = await api.getSignals(symbol);
      setRestSignal(data);
    } catch (e) {
      setRestError(e.message);
      setRestSignal(null);
    } finally {
      setRestLoading(false);
    }
  }, [symbol]);

  useEffect(() => { fetchREST(); }, [fetchREST]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-zinc-100 font-light text-xl tracking-tight">Signal Monitor</h2>
          <p className="text-zinc-500 text-xs font-mono mt-0.5">WebSocket stream + REST snapshot</p>
        </div>
        <div className="flex items-center gap-3">
          {/* WS status */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
            <span className={`text-xs font-mono ${meta.text}`}>{meta.label}</span>
            {canReconnect && (
              <button onClick={reconnect} className="text-[10px] font-mono text-zinc-500 hover:text-cyan-400 underline underline-offset-2 transition-colors ml-1">
                retry
              </button>
            )}
          </div>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-mono px-3 py-1.5 rounded focus:outline-none focus:border-cyan-500">
            {SYMBOLS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Price chart for selected symbol */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-3">Price Chart · {symbol}</div>
        <PriceChart defaultSymbol={symbol} />
      </div>

      {/* REST snapshot */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-3 flex items-center justify-between">
          <span>Latest Signal · GET /signals/{symbol}</span>
          <button onClick={fetchREST} className="text-zinc-600 hover:text-cyan-400 transition-colors text-[10px]">↻ refresh</button>
        </div>
        {restLoading ? (
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 animate-pulse">
            <span className="w-3 h-3 border border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
            Fetching…
          </div>
        ) : restError ? (
          <div className="text-xs font-mono text-red-400">Error: {restError}</div>
        ) : restSignal ? (
          <div className="flex flex-wrap gap-4 font-mono text-sm">
            {restSignal.signal    && <div className="flex items-center gap-2"><span className="text-zinc-500 text-xs">Signal</span><SignalBadge signal={restSignal.signal} /></div>}
            {restSignal.price     && <div className="flex items-center gap-2"><span className="text-zinc-500 text-xs">Price</span><span className="text-zinc-200">${Number(restSignal.price).toFixed(2)}</span></div>}
            {restSignal.confidence != null && <div className="flex items-center gap-2"><span className="text-zinc-500 text-xs">Confidence</span><span className="text-zinc-200">{(restSignal.confidence * 100).toFixed(1)}%</span></div>}
            {restSignal.agent     && <div className="flex items-center gap-2"><span className="text-zinc-500 text-xs">Agent</span><span className="text-zinc-200">{restSignal.agent}</span></div>}
          </div>
        ) : (
          <div className="text-xs font-mono text-zinc-600">No signal data returned</div>
        )}
      </div>

      {/* WebSocket stream table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-3 flex items-center justify-between">
          <span>Live Stream · ws://localhost:8000/ws/signals/{symbol}</span>
          <span className="text-zinc-600">{messages.length} msgs</span>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
          {messages.length === 0 ? (
            <div className="text-zinc-600 text-center py-14 font-mono text-sm">
              {status === WS_STATUS.CONNECTED
                ? `Streaming ${symbol}… waiting for signals`
                : status === WS_STATUS.CONNECTING
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" /> Connecting…</span>
                : 'Not connected'}
            </div>
          ) : (
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-zinc-900">
                <tr className="text-[10px] uppercase tracking-widest text-zinc-600 border-b border-zinc-800">
                  <th className="text-left pb-2 pr-4 font-normal">Time</th>
                  <th className="text-left pb-2 pr-4 font-normal">Signal</th>
                  <th className="text-left pb-2 pr-4 font-normal">Symbol</th>
                  <th className="text-right pb-2 pr-4 font-normal">Price</th>
                  <th className="text-right pb-2 font-normal">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg, i) => (
                  <tr key={`${msg._ts}-${i}`} className={`border-b border-zinc-900 ${i === 0 ? 'bg-zinc-800/30' : 'hover:bg-zinc-800/10'}`}>
                    <td className="py-1.5 pr-4 text-zinc-600 tabular-nums">
                      {new Date(msg._ts).toLocaleTimeString('en-US', { hour12: false })}
                    </td>
                    <td className="py-1.5 pr-4">
                      {msg.signal ? <SignalBadge signal={msg.signal} /> : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="py-1.5 pr-4 text-cyan-400">{msg.symbol ?? symbol}</td>
                    <td className="py-1.5 pr-4 text-right text-zinc-300 tabular-nums">
                      {msg.price ? `$${Number(msg.price).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-1.5 text-right text-zinc-500 tabular-nums">
                      {msg.confidence != null ? `${(msg.confidence * 100).toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
