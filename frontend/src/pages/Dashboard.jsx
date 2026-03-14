import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, SYMBOLS, getMockPriceHistory } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useSignalStream } from '../hooks/useSignalStream';
import { WS_STATUS } from '../services/websocket';
import CandlestickChart from '../components/CandlestickChart';

// ── Shared UI ──────────────────────────────────────────────────────────────

function Panel({ title, children, className = '', action }) {
  return (
    <div className={`panel p-5 flex flex-col ${className}`}>
      {title && (
        <div className="panel-title">
          <span>{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Metric({ label, value, sub, color = 'text-zinc-100', loading }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">{label}</span>
      {loading
        ? <span className="h-7 w-20 skeleton mt-0.5" />
        : <span className={`text-xl font-light tabular-nums font-mono ${color}`}>{value ?? '—'}</span>
      }
      {sub && !loading && <span className="text-xs text-zinc-600 font-mono">{sub}</span>}
    </div>
  );
}

function SignalBadge({ signal }) {
  if (!signal) return null;
  const cls = { BUY: 'badge-buy', SELL: 'badge-sell', HOLD: 'badge-hold', REJECTED: 'badge-hold' };
  return <span className={cls[signal] || 'badge-hold'}>{signal}</span>;
}

// ── Market Ticker ──────────────────────────────────────────────────────────

function MarketTicker({ onSelect }) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('AAPL');

  const fetch = useCallback(async () => {
    const results = await Promise.allSettled(SYMBOLS.map(s => api.getMarketPrice(s).then(d => [s, d?.data || d])));
    setPrices(prev => {
      const next = { ...prev };
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const [sym, data] = r.value;
          next[sym] = data;
        }
      });
      return next;
    });
    setLoading(false);
  }, []);

  usePolling(fetch, 8000);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {SYMBOLS.map(sym => {
        const p = prices[sym];
        const isPos = (p?.change ?? 0) >= 0;
        return (
          <button
            key={sym}
            onClick={() => { setSelected(sym); onSelect?.(sym); }}
            className={`flex flex-col p-2.5 rounded-lg border transition-all text-left ${
              selected === sym ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] font-mono text-zinc-500">{sym}</span>
            {loading && !p
              ? <span className="h-4 w-14 skeleton mt-1" />
              : <>
                  <span className="text-sm font-mono text-zinc-100 mt-0.5 tabular-nums">
                    ${typeof p?.price === 'number' ? p.price.toFixed(2) : (typeof p === 'number' ? p.toFixed(2) : '—')}
                  </span>
                  {p?.change != null && (
                    <span className={`text-[10px] font-mono tabular-nums ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPos ? '+' : ''}{p.change.toFixed(2)}
                    </span>
                  )}
                </>
            }
          </button>
        );
      })}
    </div>
  );
}

// ── Signal Stream ──────────────────────────────────────────────────────────

function SignalStream({ symbol }) {
  const { messages, status, reconnect } = useSignalStream(symbol, 50);
  const meta = {
    [WS_STATUS.CONNECTED]:    { dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400', label: 'Live' },
    [WS_STATUS.CONNECTING]:   { dot: 'bg-amber-400 animate-pulse',   text: 'text-amber-400',   label: 'Connecting' },
    [WS_STATUS.DISCONNECTED]: { dot: 'bg-red-400',                   text: 'text-red-400',     label: 'Offline' },
    [WS_STATUS.ERROR]:        { dot: 'bg-red-500',                   text: 'text-red-500',     label: 'Error' },
    [WS_STATUS.EXHAUSTED]:    { dot: 'bg-zinc-500',                  text: 'text-zinc-500',    label: 'Exhausted' },
    [WS_STATUS.IDLE]:         { dot: 'bg-zinc-600',                  text: 'text-zinc-600',    label: 'Idle' },
  }[status] ?? { dot: 'bg-zinc-600', text: 'text-zinc-600', label: 'Idle' };
  const canReconnect = [WS_STATUS.DISCONNECTED, WS_STATUS.ERROR, WS_STATUS.EXHAUSTED].includes(status);

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <span className={`text-[10px] font-mono uppercase tracking-widest ${meta.text}`}>{meta.label}</span>
          {canReconnect && (
            <button onClick={reconnect} className="text-[10px] font-mono text-zinc-500 hover:text-cyan-400 underline">retry</button>
          )}
        </div>
        <span className="text-[10px] font-mono text-zinc-600">{messages.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1 font-mono text-xs">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-600">
            {status === WS_STATUS.CONNECTING
              ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" /> Connecting…</div>
              : `Awaiting ${symbol} signals…`
            }
          </div>
        ) : messages.map((msg, i) => (
          <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded ${i === 0 ? 'bg-zinc-800/80 border border-zinc-700/50' : 'hover:bg-zinc-800/30'}`}>
            <span className="text-zinc-600 tabular-nums shrink-0">
              {new Date(msg._ts).toLocaleTimeString('en-US', { hour12: false })}
            </span>
            {msg.signal && <SignalBadge signal={msg.signal} />}
            {msg.symbol && <span className="text-cyan-400 shrink-0">{msg.symbol}</span>}
            {msg.price && <span className="text-zinc-300 tabular-nums">${Number(msg.price).toFixed(2)}</span>}
            {msg.confidence != null && (
              <span className="text-zinc-500 tabular-nums ml-auto">{(msg.confidence * 100).toFixed(0)}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Portfolio Card ─────────────────────────────────────────────────────────

function PortfolioCard() {
  const { isAuthenticated } = useAuth();
  const fetch = useCallback(() => isAuthenticated ? api.getDemoAccount() : api.getPortfolioMetrics(), [isAuthenticated]);
  const { data: m, loading, error, refetch } = usePolling(fetch, 8000);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <div className="text-2xl">💼</div>
        <p className="text-sm text-zinc-400">Sign in to track your demo portfolio</p>
        <Link to="/login" className="btn-primary text-xs">Sign In</Link>
      </div>
    );
  }

  const pnl = m?.total_pnl ?? m?.pnl ?? null;
  const isPos = (pnl ?? 0) >= 0;
  const fmt = (n) => n != null ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

  if (error && !m) return (
    <div className="text-center py-8">
      <div className="text-red-400 text-xs font-mono mb-2">{error}</div>
      <button onClick={refetch} className="btn-ghost">Retry</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Metric label="Balance" value={fmt(m?.balance ?? m?.portfolio_value)} loading={loading && !m} />
        <Metric label="Total Value" value={fmt(m?.total_value)} loading={loading && !m} />
        <Metric
          label="Total P&L"
          value={fmt(pnl)}
          sub={m?.total_pnl_pct != null ? `${(m.total_pnl_pct * 100).toFixed(2)}%` : undefined}
          color={pnl == null ? 'text-zinc-100' : isPos ? 'text-emerald-400' : 'text-red-400'}
          loading={loading && !m}
        />
        <Metric label="Invested" value={fmt(m?.total_invested)} loading={loading && !m} />
      </div>
      {m?.positions?.length > 0 && (
        <div>
          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Positions</div>
          <div className="space-y-1.5">
            {m.positions.map(pos => (
              <div key={pos.symbol} className="grid grid-cols-3 text-xs font-mono">
                <span className="text-cyan-400">{pos.symbol}</span>
                <span className="text-zinc-400 text-center">{pos.quantity} sh</span>
                <span className="text-zinc-300 text-right">${pos.avg_cost?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Agent Status ───────────────────────────────────────────────────────────

const AGENTS = [
  { id: 'momentum', label: 'Momentum Agent', strategy: 'momentum' },
  { id: 'mean_reversion', label: 'Mean Reversion', strategy: 'mean_reversion' },
  { id: 'risk_manager', label: 'Risk Manager', strategy: 'risk' },
  { id: 'executor', label: 'Execution Agent', strategy: 'execution' },
];

function AgentStatus() {
  const [states, setStates] = useState({});
  const run = async (agent) => {
    setStates(s => ({ ...s, [agent.id]: 'running' }));
    try {
      await api.executeAgent({ agent_id: agent.id, strategy: agent.strategy });
      setStates(s => ({ ...s, [agent.id]: 'success' }));
    } catch {
      setStates(s => ({ ...s, [agent.id]: 'error' }));
    }
    setTimeout(() => setStates(s => ({ ...s, [agent.id]: 'idle' })), 4000);
  };

  return (
    <div className="space-y-2">
      {AGENTS.map(agent => {
        const state = states[agent.id] || 'idle';
        const dotCls = { running: 'bg-amber-400 animate-pulse', success: 'bg-emerald-400', error: 'bg-red-400', idle: 'bg-zinc-600' }[state];
        return (
          <div key={agent.id} className={`rounded-lg border p-3 transition-all ${
            state === 'running' ? 'border-amber-400/30 bg-amber-400/5' :
            state === 'success' ? 'border-emerald-400/30 bg-emerald-400/5' :
            state === 'error' ? 'border-red-400/30 bg-red-400/5' : 'border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
                <div>
                  <div className="text-xs text-zinc-200">{agent.label}</div>
                  <div className="text-[10px] font-mono text-zinc-600 capitalize">{state}</div>
                </div>
              </div>
              <button
                onClick={() => run(agent)}
                disabled={state === 'running'}
                className="btn-ghost text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {state === 'running' ? 'Running…' : 'Execute'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Trade History ──────────────────────────────────────────────────────────

function TradeHistory() {
  const { isAuthenticated } = useAuth();
  const fetch = useCallback(() => isAuthenticated ? api.getDemoTrades(20) : Promise.resolve([]), [isAuthenticated]);
  const { data: trades, loading } = usePolling(fetch, 10000);
  const rows = trades || [];

  if (!isAuthenticated) return (
    <div className="text-center py-6 text-zinc-600 text-sm font-mono">Sign in to view trade history</div>
  );

  return (
    <div className="overflow-auto" style={{ maxHeight: 280 }}>
      {loading && !rows.length ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-8 skeleton" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-10 text-zinc-600 text-sm font-mono">No trades yet</div>
      ) : (
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-zinc-900">
            <tr className="text-[10px] uppercase tracking-widest text-zinc-600 border-b border-zinc-800">
              <th className="text-left pb-2 pr-3 font-normal">Symbol</th>
              <th className="text-left pb-2 pr-3 font-normal">Side</th>
              <th className="text-right pb-2 pr-3 font-normal">Qty</th>
              <th className="text-right pb-2 pr-3 font-normal">Price</th>
              <th className="text-right pb-2 font-normal">P&L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(t => (
              <tr key={t.id} className="border-b border-zinc-900/80 hover:bg-zinc-800/20">
                <td className="py-1.5 pr-3 text-cyan-400">{t.symbol}</td>
                <td className={`py-1.5 pr-3 font-semibold ${t.action === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{t.action}</td>
                <td className="py-1.5 pr-3 text-right text-zinc-300 tabular-nums">{t.quantity}</td>
                <td className="py-1.5 pr-3 text-right text-zinc-300 tabular-nums">${t.price?.toFixed(2)}</td>
                <td className={`py-1.5 text-right tabular-nums ${t.pnl == null ? 'text-zinc-600' : t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${Math.abs(t.pnl).toFixed(2)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [chartSymbol, setChartSymbol] = useState('AAPL');
  const [streamSymbol, setStreamSymbol] = useState('AAPL');

  return (
    <div className="space-y-5">
      {/* Welcome banner for auth users */}
      {isAuthenticated && user && (
        <div className="panel p-4 bg-gradient-to-r from-cyan-500/5 to-transparent border-cyan-500/20 flex items-center justify-between">
          <div>
            <span className="text-sm text-zinc-300">Welcome back, <span className="text-cyan-400 font-medium">{user.full_name || user.email}</span></span>
            {user.demo_balance != null && (
              <span className="text-xs text-zinc-600 font-mono ml-3">
                Balance: ${Number(user.demo_balance).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <Link to="/markets" className="btn-ghost">Explore Markets →</Link>
        </div>
      )}

      {/* Market ticker */}
      <Panel title="Markets · Live Prices" action={
        <Link to="/markets" className="text-[10px] font-mono text-zinc-600 hover:text-cyan-400 transition-colors">All markets →</Link>
      }>
        <MarketTicker onSelect={sym => { setChartSymbol(sym); setStreamSymbol(sym); }} />
      </Panel>

      {/* Three column row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title={`Signal Stream · ${streamSymbol}`} className="lg:col-span-1">
          <div className="flex-1 min-h-0" style={{ height: 280 }}>
            <SignalStream symbol={streamSymbol} />
          </div>
        </Panel>
        <Panel title="Portfolio · Demo Account" className="lg:col-span-1">
          <PortfolioCard />
        </Panel>
        <Panel title="Agent Control Panel" className="lg:col-span-1">
          <AgentStatus />
        </Panel>
      </div>

      {/* Chart */}
      <Panel title={`Price Chart · ${chartSymbol}`} action={
        <Link to={`/markets/${chartSymbol}`} className="text-[10px] font-mono text-zinc-600 hover:text-cyan-400 transition-colors">Full view →</Link>
      }>
        <CandlestickChart symbol={chartSymbol} height={340} />
      </Panel>

      {/* Trade history + learn */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="Trade History · Demo">
          <TradeHistory />
        </Panel>
        <Panel title="Learning Hub" action={
          <Link to="/learn" className="text-[10px] font-mono text-zinc-600 hover:text-cyan-400 transition-colors">All lessons →</Link>
        }>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🚀', title: 'Momentum Trading', to: '/learn', desc: 'Trend-following strategies' },
              { icon: '🔄', title: 'Mean Reversion', to: '/learn', desc: 'Fade extreme moves' },
              { icon: '🛡️', title: 'Risk Management', to: '/learn', desc: 'Protect your capital' },
              { icon: '📐', title: 'Factor Investing', to: '/learn', desc: 'Multi-factor alpha' },
            ].map(l => (
              <Link key={l.title} to={l.to}
                className="panel p-3 hover:border-zinc-600 transition-all hover:bg-zinc-900 group"
              >
                <div className="text-xl mb-2">{l.icon}</div>
                <div className="text-xs font-medium text-zinc-300 group-hover:text-cyan-400 transition-colors">{l.title}</div>
                <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{l.desc}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
