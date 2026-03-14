import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, SYMBOLS } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useSignalStream } from '../hooks/useSignalStream';
import { WS_STATUS } from '../services/websocket';
import CandlestickChart from '../components/CandlestickChart';

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
    const results = await Promise.allSettled(
      SYMBOLS.map((symbol) => api.getMarketPrice(symbol).then((payload) => [symbol, payload?.data || payload])),
    );

    return results.reduce((acc, result) => {
      if (result.status === 'fulfilled') {
        const [symbol, quote] = result.value;
        acc[symbol] = quote;
      }
      return acc;
    }, {});
  };

  const { data: prices = {}, loading } = usePolling(fetchPrices, 12000);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {SYMBOLS.map((symbol) => {
        const quote = prices[symbol];
        const positive = (quote?.change ?? 0) >= 0;
        return (
          <button
            key={symbol}
            type="button"
            onClick={() => {
              setSelected(symbol);
              onSelect?.(symbol);
            }}
            className={`rounded-2xl border p-4 text-left transition-all ${
              selected === symbol
                ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(6,182,212,0.12)]'
                : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/70'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-mono tracking-[0.28em] text-zinc-500">{symbol}</span>
              {quote?.change_pct != null ? (
                <span className={`text-[10px] font-mono ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {positive ? '+' : ''}
                  {(quote.change_pct * 100).toFixed(2)}%
                </span>
              ) : null}
            </div>
            {loading && !quote ? (
              <div className="skeleton h-6 w-20 mt-3" />
            ) : (
              <>
                <div className="mt-3 text-xl font-light font-mono tabular-nums text-zinc-100">
                  ${typeof quote?.price === 'number' ? quote.price.toFixed(2) : '-'}
                </div>
                <div className={`mt-1 text-xs font-mono ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {quote?.change != null ? `${positive ? '+' : ''}${quote.change.toFixed(2)}` : 'Waiting for quote'}
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
  const { messages, status, reconnect } = useSignalStream(symbol, 24);
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
        <span className="text-[10px] font-mono text-zinc-600">latest {Math.min(messages.length, 24)}</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 text-center text-sm text-zinc-500">
            {status === WS_STATUS.CONNECTING ? 'Connecting to the live signal engine...' : `Watching ${symbol} for fresh agent signals.`}
          </div>
        ) : (
          messages.map((message, index) => (
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
  const fetch = async () => (isAuthenticated ? api.getDemoAccount() : api.getPortfolioMetrics());
  const { data: account, loading, error, refetch } = usePolling(fetch, 10000);

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
          account.positions.slice(0, 5).map((position) => (
            <div key={position.symbol} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/35 px-3 py-3 text-sm">
              <div>
                <div className="font-mono text-cyan-400">{position.symbol}</div>
                <div className="text-xs text-zinc-500">{position.quantity} shares</div>
              </div>
              <div className="text-right font-mono text-zinc-300">${Number(position.avg_cost || 0).toFixed(2)}</div>
              <div className={`text-right font-mono ${Number(position.unrealized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {Number(position.unrealized_pnl || 0) >= 0 ? '+' : ''}${Math.abs(Number(position.unrealized_pnl || 0)).toFixed(2)}
              </div>
            </div>
          ))
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
    <div className="grid gap-3">
      {AGENTS.map((agent) => {
        const state = states[agent.id] || 'idle';
        const dotClass = {
          running: 'bg-amber-400 animate-pulse',
          ready: 'bg-emerald-400',
          error: 'bg-red-400',
          idle: 'bg-zinc-600',
        }[state];

        return (
          <div key={agent.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/45 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                  <div className="truncate text-sm text-zinc-100">{agent.label}</div>
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">{agent.mode}</div>
              </div>
              <button type="button" onClick={() => runAgent(agent)} disabled={state === 'running'} className="btn-ghost shrink-0">
                {state === 'running' ? 'Running...' : 'Execute'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TradeHistory() {
  const { isAuthenticated } = useAuth();
  const fetch = async () => (isAuthenticated ? api.getDemoTrades(20) : []);
  const { data: trades = [], loading } = usePolling(fetch, 12000);

  if (!isAuthenticated) {
    return <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/35 px-4 py-6 text-sm text-zinc-500">Sign in to see your latest trades.</div>;
  }

  if (loading && !trades.length) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, index) => <div key={index} className="skeleton h-12 w-full rounded-2xl" />)}
      </div>
    );
  }

  if (!trades.length) {
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
          {trades.map((trade) => (
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
    <div className="space-y-6">
      <section className="page-hero">
        <div className="hero-glow" />
        <div className="relative grid gap-6 px-6 py-6 lg:grid-cols-[1.3fr_0.7fr] lg:px-8 lg:py-8">
          <div>
            <div className="section-kicker mb-3">Trading workspace</div>
            <h1 className="max-w-3xl text-3xl font-light tracking-tight text-zinc-100 sm:text-4xl">
              A cleaner command center for learning markets, tracking demo capital, and following AI agents live.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              Use the dashboard as your central workspace: scan live prices, watch agent signals, practice execution, and move into full market analysis without losing context.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {topStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/45 p-4">
                  <div className="section-kicker mb-2">{stat.label}</div>
                  <div className="text-lg font-light text-zinc-100">{stat.value}</div>
                  <div className="mt-1 text-xs text-zinc-500">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-zinc-800/80 bg-zinc-950/45 p-5">
            <div className="section-kicker mb-3">Session snapshot</div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-zinc-500">Trader</div>
                <div className="mt-1 text-xl text-zinc-100">{isAuthenticated ? (user?.full_name || user?.email) : 'Guest mode'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-4">
                  <div className="section-kicker mb-2">Demo balance</div>
                  <div className="text-xl font-light font-mono text-zinc-100">
                    ${Number(user?.demo_balance || 100000).toLocaleString('en-US')}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-4">
                  <div className="section-kicker mb-2">Quick route</div>
                  <div className="text-xl font-light text-zinc-100">{chartSymbol}</div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link to="/markets" className="btn-primary text-center">Browse Markets</Link>
                <Link to="/portfolio" className="btn-ghost text-center">Open Portfolio</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Panel
        title="Market Grid"
        action={<Link to="/markets" className="text-[10px] font-mono text-zinc-600 hover:text-cyan-400">full market overview</Link>}
      >
        <MarketTicker onSelect={(symbol) => { setChartSymbol(symbol); setStreamSymbol(symbol); }} />
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1.15fr_0.9fr]">
        <Panel
          title={`Signal Stream · ${streamSymbol}`}
          action={<span className="text-[10px] font-mono text-zinc-600">live websocket</span>}
        >
          <SignalStream symbol={streamSymbol} />
        </Panel>

        <Panel
          title="Portfolio Overview"
          action={<Link to="/portfolio" className="text-[10px] font-mono text-zinc-600 hover:text-cyan-400">open detailed view</Link>}
        >
          <PortfolioCard />
        </Panel>

        <Panel
          title="Agent Status"
          action={<Link to="/agents" className="text-[10px] font-mono text-zinc-600 hover:text-cyan-400">all agent docs</Link>}
        >
          <AgentStatus />
        </Panel>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.45fr_0.85fr]">
        <Panel
          title={`Price Chart · ${chartSymbol}`}
          action={<Link to={`/markets/${chartSymbol}`} className="text-[10px] font-mono text-zinc-600 hover:text-cyan-400">full market page</Link>}
        >
          <CandlestickChart symbol={chartSymbol} height={380} />
        </Panel>

        <Panel
          title="Learning Hub"
          action={<Link to="/learn" className="text-[10px] font-mono text-zinc-600 hover:text-cyan-400">all lessons</Link>}
        >
          <div className="mb-4 text-sm text-zinc-500">
            Learn why the platform is producing each signal before you place a paper trade.
          </div>
          <LearningRail />
        </Panel>
      </div>

      <Panel
        title="Recent Trades"
        action={<Link to="/portfolio" className="text-[10px] font-mono text-zinc-600 hover:text-cyan-400">portfolio ledger</Link>}
      >
        <TradeHistory />
      </Panel>
    </div>
  );
}
