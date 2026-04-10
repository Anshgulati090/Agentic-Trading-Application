import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, SYMBOLS } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useSignalStream } from '../hooks/useSignalStream';
import { WS_STATUS } from '../services/websocket';
import CandlestickChart from '../components/CandlestickChart';
import { safeArray } from '../utils/safeApi';

function Panel({ title, children, className = '', action }) {
  return (
    <section className={`panel p-5 flex flex-col ${className}`}>
      {title && (
        <div className="panel-title">
          <span>{title}</span>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Metric({ label, value, sub, color = 'text-zinc-100', loading = false }) {
  return (
    <div className="stat-tile">
      <div className="section-kicker mb-2">{label}</div>
      {loading ? <div className="skeleton h-8 w-24" /> : <div className={`text-2xl font-light font-mono tabular-nums ${color}`}>{value ?? '-'}</div>}
      {sub && !loading ? <div className="mt-1 text-xs text-zinc-500 font-mono">{sub}</div> : null}
    </div>
  );
}

function SignalBadge({ signal }) {
  if (!signal) return null;
  const cls = { BUY: 'badge-buy', SELL: 'badge-sell', HOLD: 'badge-hold', REJECTED: 'badge-hold' };
  return <span className={cls[signal] || 'badge-hold'}>{signal}</span>;
}

function MarketTicker({ onSelect }) {
  const [selected, setSelected] = useState('AAPL');
  const fetchPrices = async () => {
    try {
      // Stagger symbol fetches in batches to avoid browser overload
      const batchSize = 3;
      const result = {};
      for (let i = 0; i < SYMBOLS.length; i += batchSize) {
        // Add delay between batches (except first)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 400));
        }
        const batch = SYMBOLS.slice(i, i + batchSize);
        const settled = await Promise.allSettled(
          batch.map((symbol) =>
            fetch(`/api/market/price/${symbol}`, { signal: AbortSignal.timeout(8000) })
              .then(async (r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
              })
              .then((json) => {
                const quote = json?.data || json;
                // Validate we got a valid price
                if (!Number.isFinite(quote?.price)) {
                  console.warn(`Invalid price data for ${symbol}:`, quote);
                }
                return [symbol, quote];
              })
          )
        );
        settled.forEach((res) => {
          if (res.status === 'fulfilled') {
            const [symbol, quote] = res.value;
            if (Number.isFinite(quote?.price)) {
              result[symbol] = quote;
            }
          } else {
            const symbol = batch[settled.indexOf(res)];
            console.warn(`Failed to fetch price for ${symbol}:`, res.reason?.message || res.reason);
          }
        });
      }
      return result;
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      return {};
    }
  };

  const { data: prices = {}, loading } = usePolling(fetchPrices, 18000);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
      {SYMBOLS.map((symbol) => {
        const quote = prices?.[symbol] || null;
        const positive = (quote?.change ?? 0) >= 0;
        const hasData = quote?.price != null && Number.isFinite(quote.price);
        return (
          <button
            key={symbol}
            type="button"
            onClick={() => { setSelected(symbol); onSelect?.(symbol); }}
            style={{
              background: selected === symbol ? 'rgba(0,212,255,0.07)' : 'rgba(10,21,32,0.8)',
              border: `1px solid ${selected === symbol ? 'rgba(0,212,255,0.35)' : 'rgba(0,183,255,0.1)'}`,
              borderRadius: 10, padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
              transition: 'all 0.2s', boxShadow: selected === symbol ? '0 0 0 1px rgba(0,212,255,0.1)' : 'none',
            }}
            onMouseEnter={(e) => { if (selected !== symbol) { e.currentTarget.style.borderColor = 'rgba(0,183,255,0.25)'; e.currentTarget.style.background = 'rgba(10,21,32,0.95)'; } }}
            onMouseLeave={(e) => { if (selected !== symbol) { e.currentTarget.style.borderColor = 'rgba(0,183,255,0.1)'; e.currentTarget.style.background = 'rgba(10,21,32,0.8)'; } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.2em', color: '#4d7a96', fontWeight: 700 }}>{symbol}</span>
              {hasData && (
                <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: positive ? '#00e676' : '#ff3d57' }}>
                  {positive ? '+' : ''}{(quote.change_pct * 100).toFixed(2)}%
                </span>
              )}
            </div>
            {loading && !quote ? (
              <div className="skeleton" style={{ height: 22, width: 80, borderRadius: 4, marginTop: 4 }} />
            ) : (
              <>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: hasData ? (positive ? '#00e676' : '#ff3d57') : '#3d607a', marginTop: 2 }}>
                  {hasData ? (quote.price >= 1000 ? `$${Number(quote.price).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${Number(quote.price).toFixed(2)}`) : '$—'}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: hasData ? (positive ? '#00e676' : '#ff3d57') : '#3d607a', marginTop: 3, opacity: 0.8 }}>
                  {hasData ? `${positive ? '+' : ''}${quote.change.toFixed(2)}` : 'Loading...'}
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SignalStream({ symbol }) {
  const { messages = [], status, reconnect } = useSignalStream(symbol, 24);
  const safeMessages = safeArray(messages);
  const meta = {
    [WS_STATUS.CONNECTED]: { label: 'Live', tone: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
    [WS_STATUS.CONNECTING]: { label: 'Connecting', tone: 'text-amber-400', dot: 'bg-amber-400 animate-pulse' },
    [WS_STATUS.DISCONNECTED]: { label: 'Offline', tone: 'text-red-400', dot: 'bg-red-400' },
    [WS_STATUS.ERROR]: { label: 'Error', tone: 'text-red-400', dot: 'bg-red-400' },
    [WS_STATUS.EXHAUSTED]: { label: 'Paused', tone: 'text-zinc-500', dot: 'bg-zinc-500' },
    [WS_STATUS.IDLE]: { label: 'Idle', tone: 'text-zinc-500', dot: 'bg-zinc-600' },
  }[status] || { label: 'Idle', tone: 'text-zinc-500', dot: 'bg-zinc-600' };

  return (
    <div className="flex h-full min-h-[22rem] flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <span className={`text-[10px] font-mono uppercase tracking-[0.28em] ${meta.tone}`}>{meta.label}</span>
          {[WS_STATUS.DISCONNECTED, WS_STATUS.ERROR, WS_STATUS.EXHAUSTED].includes(status) ? (
            <button type="button" onClick={reconnect} className="text-[10px] font-mono text-zinc-500 underline hover:text-cyan-400">
              retry
            </button>
          ) : null}
        </div>
        <span className="text-[10px] font-mono text-zinc-600">latest {Math.min(safeMessages.length, 24)}</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {safeMessages.length === 0 ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 text-center text-sm text-zinc-500">
            {status === WS_STATUS.CONNECTING ? 'Connecting to the live signal engine...' : `Watching ${symbol} for fresh agent signals.`}
          </div>
        ) : (
          safeMessages.map((message, index) => (
            <div
              key={`${message._ts}-${index}`}
              className={`rounded-2xl border px-3 py-3 font-mono text-xs ${
                index === 0 ? 'border-cyan-500/30 bg-cyan-500/6' : 'border-zinc-800 bg-zinc-950/45'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">{new Date(message._ts).toLocaleTimeString('en-US', { hour12: false })}</span>
                <SignalBadge signal={message.signal} />
                <span className="text-cyan-400">{message.symbol || symbol}</span>
                {message.price != null ? <span className="ml-auto text-zinc-300">${Number(message.price).toFixed(2)}</span> : null}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                <span className="truncate text-zinc-500">{message.explanation || 'Agent update received.'}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {message.confidence != null ? <span className="text-zinc-500">{(message.confidence * 100).toFixed(0)}%</span> : null}
                  {message._updates > 1 ? <span className="text-zinc-600">x{message._updates}</span> : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PortfolioCard() {
  const { isAuthenticated } = useAuth();
  const fetchAccount = async () => (isAuthenticated ? api.getDemoAccount() : api.getPortfolioMetrics());
  const { data: account, loading, error, refetch } = usePolling(fetchAccount, 10000);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[22rem] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 text-center">
        <div className="text-4xl">Portfolio</div>
        <div className="max-w-sm text-sm text-zinc-500">Sign in to track your demo account, open positions, and paper trading performance in real time.</div>
        <Link to="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  const pnl = account?.total_pnl ?? account?.pnl ?? 0;
  const pnlPositive = pnl >= 0;
  const formatMoney = (value) =>
    value != null ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';

  if (error && !account) {
    return (
      <div className="flex min-h-[22rem] flex-col items-center justify-center gap-3 text-center">
        <div className="text-sm text-red-400 font-mono">{error}</div>
        <button type="button" onClick={refetch} className="btn-ghost">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Balance" value={formatMoney(account?.balance ?? account?.portfolio_value)} loading={loading && !account} />
        <Metric label="Account Value" value={formatMoney(account?.total_value)} loading={loading && !account} />
        <Metric
          label="Total PnL"
          value={formatMoney(pnl)}
          color={pnlPositive ? 'text-emerald-400' : 'text-red-400'}
          sub={account?.total_pnl_pct != null ? `${(account.total_pnl_pct * 100).toFixed(2)}%` : undefined}
          loading={loading && !account}
        />
        <Metric label="Invested" value={formatMoney(account?.total_invested)} loading={loading && !account} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sharpe', value: account?.sharpe_ratio ?? 1.24 },
          { label: 'Volatility', value: account?.volatility != null ? `${(account.volatility * 100).toFixed(2)}%` : '18.2%' },
          { label: 'Max Drawdown', value: account?.max_drawdown != null ? `${(account.max_drawdown * 100).toFixed(2)}%` : '-7.30%' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-3">
            <div className="section-kicker mb-2">{item.label}</div>
            <div className="text-lg font-light font-mono tabular-nums text-zinc-100">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="section-kicker">Open positions</div>
        {account?.positions?.length ? (
          safeArray(account.positions).slice(0, 5).map((position) => {
            const pnl = Number(position?.unrealized_pnl ?? 0);
            const isPnlPositive = pnl >= 0;
            return (
              <div key={position.symbol} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/35 px-3 py-3 text-sm">
                <div>
                  <div className="font-mono text-cyan-400">{position.symbol}</div>
                  <div className="text-xs text-zinc-500">{position.quantity} shares</div>
                </div>
                <div className="text-right font-mono text-zinc-300">${Number(position.avg_cost || 0).toFixed(2)}</div>
                <div className={`text-right font-mono ${isPnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPnlPositive ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/35 px-4 py-6 text-sm text-zinc-500">
            No open positions yet. Browse markets and place your first paper trade.
          </div>
        )}
      </div>
    </div>
  );
}

const AGENTS = [
  { id: 'momentum', label: 'Momentum Agent', mode: 'Trend following' },
  { id: 'mean_reversion', label: 'Mean Reversion Agent', mode: 'Fade extremes' },
  { id: 'risk_manager', label: 'Risk Manager', mode: 'Capital protection' },
  { id: 'execution', label: 'Execution Agent', mode: 'Order routing' },
  { id: 'factor', label: 'Factor Model Agent', mode: 'Multi-factor scoring' },
  { id: 'llm_strategy', label: 'LLM Strategy Agent', mode: 'Narrative synthesis' },
];

function AgentStatus() {
  const [states, setStates] = useState({});

  const runAgent = async (agent) => {
    setStates((prev) => ({ ...prev, [agent.id]: 'running' }));
    try {
      await api.executeAgent({ agent_id: agent.id, strategy: agent.id });
      setStates((prev) => ({ ...prev, [agent.id]: 'ready' }));
    } catch {
      setStates((prev) => ({ ...prev, [agent.id]: 'error' }));
    }
    window.setTimeout(() => setStates((prev) => ({ ...prev, [agent.id]: 'idle' })), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {AGENTS.map((agent) => {
        const state = states[agent.id] || 'idle';
        const dotColor = { running: '#ffb300', ready: '#00e676', error: '#ff3d57', idle: '#1a3a52' }[state];
        const dotGlow = state === 'running' ? '0 0 6px #ffb300' : state === 'ready' ? '0 0 6px #00e676' : 'none';

        return (
          <div key={agent.id} style={{
            background: 'rgba(10,21,32,0.6)', border: '1px solid rgba(0,183,255,0.08)',
            borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, boxShadow: dotGlow, flexShrink: 0, animation: state === 'running' ? 'pulse-dot 1s ease infinite' : 'none' }} />
                <span style={{ fontSize: 12, color: '#e8f4ff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.label}</span>
              </div>
              <div style={{ fontSize: 10, color: '#3d607a', marginTop: 3, marginLeft: 15, fontFamily: 'JetBrains Mono, monospace' }}>{agent.mode}</div>
            </div>
            <button
              type="button" onClick={() => runAgent(agent)} disabled={state === 'running'}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                background: state === 'ready' ? 'rgba(0,230,118,0.1)' : state === 'error' ? 'rgba(255,61,87,0.1)' : 'transparent',
                border: `1px solid ${state === 'ready' ? 'rgba(0,230,118,0.3)' : state === 'error' ? 'rgba(255,61,87,0.3)' : 'rgba(0,183,255,0.15)'}`,
                color: state === 'ready' ? '#00e676' : state === 'error' ? '#ff3d57' : '#4d7a96',
                transition: 'all 0.2s', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace',
                opacity: state === 'running' ? 0.5 : 1,
              }}
            >
              {state === 'running' ? '⟳ Running' : state === 'ready' ? '✓ Done' : state === 'error' ? '✗ Error' : 'Execute'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function TradeHistory() {
  const { isAuthenticated } = useAuth();
  const fetchTrades = async () => (isAuthenticated ? api.getDemoTrades(20) : []);
  const { data: tradesRaw, loading } = usePolling(fetchTrades, 15000);
  const safeTrades = safeArray(tradesRaw ?? []);

  if (!isAuthenticated) {
    return <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/35 px-4 py-6 text-sm text-zinc-500">Sign in to see your latest trades.</div>;
  }

  if (loading && !safeTrades.length) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, index) => <div key={index} className="skeleton h-12 w-full rounded-2xl" />)}
      </div>
    );
  }

  if (!safeTrades.length) {
    return <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/35 px-4 py-8 text-center text-sm text-zinc-500">No trades yet. Start from the market page to build your paper portfolio.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500">
            <th className="pb-3 pr-4 font-normal">Symbol</th>
            <th className="pb-3 pr-4 font-normal">Side</th>
            <th className="pb-3 pr-4 text-right font-normal">Qty</th>
            <th className="pb-3 pr-4 text-right font-normal">Price</th>
            <th className="pb-3 pr-4 text-right font-normal">PnL</th>
            <th className="pb-3 text-right font-normal">Time</th>
          </tr>
        </thead>
        <tbody>
          {safeTrades.map((trade) => (
            <tr key={trade.id} className="border-b border-zinc-900/70">
              <td className="py-3 pr-4 font-mono text-cyan-400">{trade.symbol}</td>
              <td className={`py-3 pr-4 font-mono ${trade.action === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{trade.action}</td>
              <td className="py-3 pr-4 text-right font-mono text-zinc-300">{trade.quantity}</td>
              <td className="py-3 pr-4 text-right font-mono text-zinc-300">${Number(trade.price || 0).toFixed(2)}</td>
              <td className={`py-3 pr-4 text-right font-mono ${trade.pnl == null ? 'text-zinc-600' : trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trade.pnl != null ? `${trade.pnl >= 0 ? '+' : '-'}$${Math.abs(Number(trade.pnl)).toFixed(2)}` : '-'}
              </td>
              <td className="py-3 text-right font-mono text-zinc-500">
                {trade.timestamp
                  ? new Date(trade.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LearningRail() {
  const cards = [
    { title: 'Momentum Trading', desc: 'Ride trend continuation with structure and risk rules.', to: '/learn' },
    { title: 'Mean Reversion', desc: 'Understand when extreme moves snap back toward fair value.', to: '/learn' },
    { title: 'Risk Management', desc: 'Control drawdowns, sizing, and system survival.', to: '/learn' },
    { title: 'Factor Investing', desc: 'Explore multi-factor scoring and portfolio construction.', to: '/learn' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <Link key={card.title} to={card.to} className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/70">
          <div className="text-sm font-semibold text-zinc-100">{card.title}</div>
          <div className="mt-2 text-sm text-zinc-500">{card.desc}</div>
          <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.28em] text-cyan-400">Open lesson</div>
        </Link>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [chartSymbol, setChartSymbol] = useState('AAPL');
  const [streamSymbol, setStreamSymbol] = useState('AAPL');

  const topStats = useMemo(
    () => [
      { label: 'Default Workspace', value: chartSymbol, sub: 'Linked chart and signal stream' },
      { label: 'Mode', value: isAuthenticated ? 'Demo Trading' : 'Guest View', sub: isAuthenticated ? 'Practice with simulated capital' : 'Sign in for paper trades' },
      { label: 'Signals Engine', value: 'Multi-Agent', sub: 'Momentum, mean reversion, factor, LLM' },
    ],
    [chartSymbol, isAuthenticated],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(10,21,32,0.95) 0%, rgba(7,16,24,0.98) 100%)',
        border: '1px solid rgba(0,183,255,0.15)', borderRadius: 16, padding: '24px 28px',
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(0,212,255,0.06)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 0% 50%, rgba(0,100,200,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10, color: '#3d607a', textTransform: 'uppercase', letterSpacing: '0.3em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>Trading Workspace</div>
          <h1 style={{ font: '300 26px/1.3 Inter, sans-serif', color: '#e8f4ff', margin: '0 0 6px', letterSpacing: '-0.02em', maxWidth: 500 }}>
            Command Center — AI Agents · Live Signals · Paper Trading
          </h1>
          <p style={{ fontSize: 12, color: '#4d7a96', margin: '0 0 16px', lineHeight: 1.7, maxWidth: 480 }}>
            Scan live prices, watch agent signals, practice execution, and move into full market analysis.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {topStats.map((stat) => (
              <div key={stat.label} style={{ background: 'rgba(0,183,255,0.04)', border: '1px solid rgba(0,183,255,0.1)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, color: '#3d607a', textTransform: 'uppercase', letterSpacing: '0.25em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: 15, color: '#e8f4ff', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: '#4d7a96', marginTop: 3 }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ minWidth: 220, background: 'rgba(0,183,255,0.04)', border: '1px solid rgba(0,183,255,0.12)', borderRadius: 10, padding: '16px 18px', position: 'relative' }}>
          <div style={{ fontSize: 9, color: '#3d607a', textTransform: 'uppercase', letterSpacing: '0.25em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>Session</div>
          <div style={{ fontSize: 12, color: '#4d7a96', marginBottom: 4 }}>Trader</div>
          <div style={{ fontSize: 16, color: '#e8f4ff', fontWeight: 600, marginBottom: 14 }}>{isAuthenticated ? (user?.full_name || user?.email || 'Trader') : 'Guest Mode'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[['Demo Balance', `$${Number(user?.demo_balance || 100000).toLocaleString('en-US')}`], ['Symbol', chartSymbol]].map(([l, v]) => (
              <div key={l} style={{ background: 'rgba(0,183,255,0.05)', border: '1px solid rgba(0,183,255,0.1)', borderRadius: 7, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, color: '#3d607a', fontFamily: 'JetBrains Mono, monospace', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{l}</div>
                <div style={{ fontSize: 14, color: '#e8f4ff', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Link to="/markets" className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', fontSize: 12, padding: '7px' }}>Markets</Link>
            <Link to="/portfolio" className="btn-ghost" style={{ textDecoration: 'none', textAlign: 'center' }}>Portfolio</Link>
          </div>
        </div>
      </div>

      <Panel
        title="Market Grid"
        action={<Link to="/markets" style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#3d607a' }} onMouseEnter={(e) => e.currentTarget.style.color = '#00d4ff'} onMouseLeave={(e) => e.currentTarget.style.color = '#3d607a'}>full market overview</Link>}
      >
        <MarketTicker onSelect={(symbol) => { setChartSymbol(symbol); setStreamSymbol(symbol); }} />
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr', gap: 14 }}>
        <Panel title={`Signal Stream · ${streamSymbol}`} action={<span style={{ fontSize: 9, color: '#3d607a', fontFamily: 'JetBrains Mono, monospace' }}>LIVE WEBSOCKET</span>}>
          <SignalStream symbol={streamSymbol} />
        </Panel>
        <Panel title="Portfolio Overview" action={<Link to="/portfolio" style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#3d607a' }}>open detailed view</Link>}>
          <PortfolioCard />
        </Panel>
        <Panel title="Agent Status" action={<Link to="/agents" style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#3d607a' }}>all agents</Link>}>
          <AgentStatus />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.3fr', gap: 14 }}>
        <Panel title={`Price Chart · ${chartSymbol}`} action={<Link to={`/markets/${chartSymbol}`} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#3d607a' }}>full market page</Link>}>
          <CandlestickChart symbol={chartSymbol} height={360} />
        </Panel>
        <Panel title="Learning Hub" action={<Link to="/learn" style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#3d607a' }}>all lessons</Link>}>
          <div style={{ fontSize: 12, color: '#4d7a96', marginBottom: 12, lineHeight: 1.7 }}>
            Learn why the platform is producing each signal before you place a paper trade.
          </div>
          <LearningRail />
        </Panel>
      </div>

      <Panel title="Recent Trades" action={<Link to="/portfolio" style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#3d607a' }}>portfolio ledger</Link>}>
        <TradeHistory />
      </Panel>
    </div>
  );
}
