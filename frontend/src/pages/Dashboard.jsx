import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, SYMBOLS } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useSignalStream } from '../hooks/useSignalStream';
import { WS_STATUS } from '../services/websocket';
import CandlestickChart from '../components/CandlestickChart';

/* ─── Helpers ──────────────────────────────────────────────── */
const fmt = (n, pre = '$') =>
  n == null ? '—' : pre + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = n =>
  n == null ? '—' : `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
const fmtCompact = n =>
  n == null ? '—' : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : fmt(n);

/* ─── Signal Badge ─────────────────────────────────────────── */
function SignalBadge({ signal }) {
  if (!signal) return null;
  const cls = { BUY: 'badge-buy', SELL: 'badge-sell', HOLD: 'badge-hold', REJECTED: 'badge-hold' };
  return <span className={cls[signal] || 'badge-hold'}>{signal}</span>;
}

/* ─── Stat Card ────────────────────────────────────────────── */
function StatCard({ label, value, sub, color, loading = false, trend }) {
  return (
    <div className="stat-tile" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="section-kicker" style={{ marginBottom: 8 }}>{label}</div>
      {loading ? (
        <div className="skeleton" style={{ width: '70%', height: 28, marginBottom: 4 }} />
      ) : (
        <div style={{
          fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 300,
          color: color || 'var(--text-primary)', lineHeight: 1,
          letterSpacing: '-0.02em',
        }}>{value ?? '—'}</div>
      )}
      {sub && !loading && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

/* ─── Market Ticker Grid ───────────────────────────────────── */
function MarketTicker({ onSelect, selected }) {
  const fetchPrices = useCallback(async () => {
    const results = await Promise.allSettled(
      SYMBOLS.map(sym => api.getMarketPrice(sym).then(p => [sym, p?.data || p]))
    );
    return results.reduce((acc, r) => {
      if (r.status === 'fulfilled') { const [s, q] = r.value; acc[s] = q; }
      return acc;
    }, {});
  }, []);

  const { data: prices = {}, loading } = usePolling(fetchPrices, 12000);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
      {SYMBOLS.map(sym => {
        const quote = prices[sym];
        const positive = (quote?.change ?? 0) >= 0;
        const isSelected = selected === sym;

        return (
          <button key={sym} onClick={() => onSelect?.(sym)}
            style={{
              padding: '12px 14px',
              background: isSelected ? 'rgba(0,212,255,0.08)' : 'var(--bg-elevated)',
              border: `1px solid ${isSelected ? 'rgba(0,212,255,0.35)' : 'var(--border-subtle)'}`,
              borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s',
              boxShadow: isSelected ? '0 0 16px rgba(0,212,255,0.1)' : 'none',
            }}
            onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}}
            onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}}
          >
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 6 }}>{sym}</div>
            {loading && !quote ? (
              <div className="skeleton" style={{ width: '80%', height: 18 }} />
            ) : (
              <>
                <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  ${Number(quote?.price ?? 0).toFixed(2)}
                </div>
                {quote?.change != null && (
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: positive ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: 2 }}>
                    {positive ? '+' : ''}{quote.change.toFixed(2)}
                  </div>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Live Signal Stream ───────────────────────────────────── */
function SignalStream({ symbol }) {
  const { messages, status, reconnect } = useSignalStream(symbol, 20);
  const isLive = status === WS_STATUS.CONNECTED;
  const isConnecting = status === WS_STATUS.CONNECTING;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLive && <span className="live-dot" />}
          {isConnecting && <span className="live-dot-amber" />}
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: isLive ? 'var(--accent-green)' : isConnecting ? 'var(--accent-amber)' : 'var(--text-muted)', letterSpacing: '0.1em' }}>
            {isLive ? 'LIVE' : isConnecting ? 'CONNECTING' : 'OFFLINE'}
          </span>
        </div>
        {[WS_STATUS.DISCONNECTED, WS_STATUS.ERROR, WS_STATUS.EXHAUSTED].includes(status) && (
          <button onClick={reconnect} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Reconnect
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, flexDirection: 'column', gap: 8 }}>
            {isConnecting ? (
              <>
                <div style={{ width: 20, height: 20, border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connecting to {symbol}…</span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Watching {symbol} for signals</span>
            )}
          </div>
        ) : messages.map((msg, i) => (
          <div key={`${msg._ts}-${i}`} style={{
            padding: '10px 12px',
            background: i === 0 ? 'rgba(0,212,255,0.04)' : 'var(--bg-elevated)',
            border: `1px solid ${i === 0 ? 'rgba(0,212,255,0.15)' : 'var(--border-subtle)'}`,
            borderRadius: 8,
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {new Date(msg._ts).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <SignalBadge signal={msg.signal} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{msg.symbol || symbol}</span>
              {msg.price && (
                <span style={{ marginLeft: 'auto', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  ${Number(msg.price).toFixed(2)}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {msg.explanation || 'Agent signal received.'}
            </div>
            {msg.confidence != null && (
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, height: 2, background: 'var(--bg-base)', borderRadius: 1 }}>
                  <div style={{ width: `${msg.confidence * 100}%`, height: '100%', background: 'var(--accent-cyan)', borderRadius: 1, opacity: 0.6 }} />
                </div>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {(msg.confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Portfolio Overview ───────────────────────────────────── */
function PortfolioOverview() {
  const { isAuthenticated } = useAuth();
  const fetch = useCallback(() => isAuthenticated ? api.getDemoAccount() : api.getPortfolioMetrics(), [isAuthenticated]);
  const { data: account, loading, error, refetch } = usePolling(fetch, 12000);

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 12, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 32 }}>📊</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Sign in to track your demo portfolio</div>
        <Link to="/login" className="btn-primary" style={{ marginTop: 4 }}>Sign In</Link>
      </div>
    );
  }

  const pnl = account?.total_pnl ?? account?.pnl ?? 0;
  const pnlPos = pnl >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatCard label="Balance" value={fmt(account?.balance)} loading={loading && !account} />
        <StatCard label="Total Value" value={fmt(account?.total_value)} loading={loading && !account} />
        <StatCard
          label="Total P&L"
          value={fmt(pnl)}
          sub={fmtPct(account?.total_pnl_pct)}
          color={pnlPos ? 'var(--accent-green)' : 'var(--accent-red)'}
          loading={loading && !account}
        />
        <StatCard label="Invested" value={fmt(account?.total_invested)} loading={loading && !account} />
      </div>

      {/* Risk metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {[
          { label: 'Sharpe', value: account?.sharpe_ratio != null ? Number(account.sharpe_ratio).toFixed(2) : '1.24' },
          { label: 'Volatility', value: account?.volatility != null ? fmtPct(account.volatility) : '18.2%' },
          { label: 'Max DD', value: account?.max_drawdown != null ? fmtPct(account.max_drawdown) : '−7.3%' },
        ].map(m => (
          <div key={m.label} style={{
            padding: '10px 12px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}>
            <div className="section-kicker" style={{ marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 400, color: 'var(--text-primary)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Positions */}
      {account?.positions?.length > 0 && (
        <div>
          <div className="section-kicker" style={{ marginBottom: 8 }}>Open Positions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {account.positions.slice(0, 4).map(pos => (
              <div key={pos.symbol} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 6,
              }}>
                <div style={{ display: 'flex', align: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-cyan)', minWidth: 48 }}>{pos.symbol}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pos.quantity} sh</span>
                </div>
                <div style={{ display: 'flex', align: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmt(pos.avg_cost)}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: Number(pos.unrealized_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {Number(pos.unrealized_pnl || 0) >= 0 ? '+' : ''}{fmt(pos.unrealized_pnl)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link to="/portfolio" style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >View Full Portfolio →</Link>
    </div>
  );
}

/* ─── Agent Status ─────────────────────────────────────────── */
const AGENTS = [
  { id: 'momentum', label: 'Momentum', mode: 'Trend following' },
  { id: 'mean_reversion', label: 'Mean Reversion', mode: 'Fade extremes' },
  { id: 'risk_manager', label: 'Risk Manager', mode: 'Capital protection' },
  { id: 'execution', label: 'Execution', mode: 'Order routing' },
  { id: 'factor', label: 'Factor Model', mode: 'Multi-factor' },
  { id: 'llm_strategy', label: 'LLM Strategy', mode: 'Narrative' },
];

function AgentPanel() {
  const [states, setStates] = useState({});

  const runAgent = async (agent) => {
    setStates(prev => ({ ...prev, [agent.id]: 'running' }));
    try {
      await api.executeAgent({ agent_id: agent.id, strategy: agent.id });
      setStates(prev => ({ ...prev, [agent.id]: 'ready' }));
    } catch {
      setStates(prev => ({ ...prev, [agent.id]: 'error' }));
    }
    window.setTimeout(() => setStates(prev => ({ ...prev, [agent.id]: 'idle' })), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {AGENTS.map(agent => {
        const state = states[agent.id] || 'idle';
        const dotColor = { running: 'var(--accent-amber)', ready: 'var(--accent-green)', error: 'var(--accent-red)', idle: 'var(--text-muted)' }[state];

        return (
          <div key={agent.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            borderRadius: 8, transition: 'border-color 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0, transition: 'background 0.3s' }} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{agent.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{agent.mode}</div>
              </div>
            </div>
            <button onClick={() => runAgent(agent)} disabled={state === 'running'}
              className="btn-ghost"
              style={{ padding: '4px 10px', fontSize: 10 }}
            >
              {state === 'running' ? '…' : 'Run'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Trade History ────────────────────────────────────────── */
function RecentTrades() {
  const { isAuthenticated } = useAuth();
  const fetch = useCallback(() => isAuthenticated ? api.getDemoTrades(15) : Promise.resolve([]), [isAuthenticated]);
  const { data: trades = [], loading } = usePolling(fetch, 15000);

  if (!isAuthenticated) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sign in to see trades</div>;
  }

  if (loading && !trades.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />)}
      </div>
    );
  }

  if (!trades.length) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        No trades yet. Place your first paper trade from any market page.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ minWidth: 560 }}>
        <thead>
          <tr>
            {['Symbol', 'Side', 'Qty', 'Price', 'P&L', 'Time'].map(h => (
              <th key={h} style={{ textAlign: h === 'Qty' || h === 'Price' || h === 'P&L' ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map(trade => (
            <tr key={trade.id}>
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 500 }}>{trade.symbol}</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: trade.action === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>{trade.action}</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{trade.quantity}</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>${Number(trade.price || 0).toFixed(2)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: trade.pnl == null ? 'var(--text-muted)' : trade.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {trade.pnl != null ? `${trade.pnl >= 0 ? '+' : ''}$${Math.abs(Number(trade.pnl)).toFixed(2)}` : '—'}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 11 }}>
                {trade.timestamp ? new Date(trade.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Panel Wrapper ────────────────────────────────────────── */
function Panel({ title, action, children, style }) {
  return (
    <section className="panel" style={{ padding: 20, ...style }}>
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

/* ─── Main Dashboard ───────────────────────────────────────── */
export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [chartSymbol, setChartSymbol] = useState('AAPL');
  const [streamSymbol, setStreamSymbol] = useState('AAPL');

  const handleSelect = (sym) => {
    setChartSymbol(sym);
    setStreamSymbol(sym);
  };

  const demoBalance = Number(user?.demo_balance || 100000).toLocaleString('en-US');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header Strip */}
      <div className="page-hero">
        <div className="hero-glow" />
        <div style={{ position: 'relative', padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div className="section-kicker" style={{ marginBottom: 8 }}>Trading Workspace</div>
              <h1 style={{ fontSize: 28, fontWeight: 300, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {isAuthenticated ? `Welcome back, ${user?.full_name?.split(' ')[0] || 'Trader'}` : 'Market Overview'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '8px 0 0', maxWidth: 480 }}>
                Monitor live signals, track your demo portfolio, and execute paper trades in real time.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Active Symbol', value: chartSymbol, sub: 'Chart & stream' },
                { label: 'Demo Balance', value: `$${demoBalance}`, sub: 'Paper trading' },
                { label: 'Signal Engine', value: '6 Agents', sub: 'Live WebSocket' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10, minWidth: 120,
                }}>
                  <div className="section-kicker" style={{ marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                <Link to="/markets" className="btn-primary" style={{ fontSize: 13 }}>Browse Markets</Link>
                <Link to="/portfolio" className="btn-ghost" style={{ textAlign: 'center', fontSize: 12 }}>Portfolio</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Ticker */}
      <Panel title="Market Grid" action={<Link to="/markets" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textDecoration: 'none' }}>All Markets →</Link>}>
        <MarketTicker onSelect={handleSelect} selected={chartSymbol} />
      </Panel>

      {/* Main 3-col row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16 }}>

        {/* Signal Stream */}
        <Panel
          title={`Signal Stream · ${streamSymbol}`}
          action={<span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>WebSocket</span>}
          style={{ minHeight: 420 }}
        >
          <SignalStream symbol={streamSymbol} />
        </Panel>

        {/* Portfolio */}
        <Panel
          title="Portfolio"
          action={<Link to="/portfolio" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textDecoration: 'none' }}>Details →</Link>}
        >
          <PortfolioOverview />
        </Panel>

        {/* Agents */}
        <Panel
          title="AI Agents"
          action={<Link to="/agents" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textDecoration: 'none' }}>All →</Link>}
          style={{ minWidth: 220 }}
        >
          <AgentPanel />
        </Panel>
      </div>

      {/* Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <Panel
          title={`Price Chart · ${chartSymbol}`}
          action={<Link to={`/markets/${chartSymbol}`} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textDecoration: 'none' }}>Full Page →</Link>}
        >
          <CandlestickChart symbol={chartSymbol} height={360} />
        </Panel>

        {/* Learning */}
        <Panel title="Learning Hub" action={<Link to="/learn" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textDecoration: 'none' }}>All →</Link>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px' }}>
              Understand the logic behind each signal before placing a trade.
            </p>
            {[
              { title: 'Momentum Trading', color: 'var(--accent-cyan)' },
              { title: 'Mean Reversion', color: 'var(--accent-green)' },
              { title: 'Risk Management', color: 'var(--accent-amber)' },
              { title: 'Factor Investing', color: '#b388ff' },
            ].map(lesson => (
              <Link key={lesson.title} to="/learn" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8, textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              >
                <div style={{ width: 3, height: 28, background: lesson.color, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{lesson.title}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>→</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {/* Recent Trades */}
      <Panel
        title="Recent Trades"
        action={<Link to="/portfolio" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textDecoration: 'none' }}>Full History →</Link>}
      >
        <RecentTrades />
      </Panel>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
