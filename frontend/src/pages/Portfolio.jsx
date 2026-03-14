import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import CandlestickChart from '../components/CandlestickChart';

function StatCard({ label, value, sub, color = 'text-zinc-100' }) {
  return (
    <div className="stat-tile">
      <div className="section-kicker mb-2">{label}</div>
      <div className={`text-2xl font-light font-mono tabular-nums ${color}`}>{value ?? '-'}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-500 font-mono">{sub}</div> : null}
    </div>
  );
}

const formatMoney = (value) =>
  value != null ? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
const formatPct = (value) => (value != null ? `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%` : '-');

export default function Portfolio() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const fetchAccount = useCallback(() => (isAuthenticated ? api.getDemoAccount() : api.getPortfolioMetrics()), [isAuthenticated]);
  const fetchTrades = useCallback(() => (isAuthenticated ? api.getDemoTrades(50) : Promise.resolve([])), [isAuthenticated]);
  const { data: account, loading, refetch } = usePolling(fetchAccount, 12000);
  const { data: trades = [] } = usePolling(fetchTrades, 15000);

  if (!isAuthenticated) {
    return (
      <div className="page-hero">
        <div className="hero-glow" />
        <div className="relative px-6 py-12 text-center">
          <div className="section-kicker mb-3">Portfolio</div>
          <h1 className="text-3xl font-light text-zinc-100">Sign in to unlock your paper trading ledger</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-zinc-500">
            Your portfolio page tracks balance, open positions, realized and unrealized PnL, and every simulated trade you have placed.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/login" className="btn-primary">Sign In</Link>
            <Link to="/markets" className="btn-ghost">Browse Markets</Link>
          </div>
        </div>
      </div>
    );
  }

  const pnl = account?.total_pnl ?? account?.pnl ?? 0;
  const pnlPositive = pnl >= 0;
  const positions = account?.positions || [];

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="hero-glow" />
        <div className="relative grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <div className="section-kicker mb-3">Portfolio</div>
            <h1 className="text-3xl font-light tracking-tight text-zinc-100">A complete view of your simulated capital, holdings, and execution history.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              This page is your training ledger. Review balance, concentration, open positions, and trade outcomes before you move to the next lesson or market idea.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <StatCard label="Cash Balance" value={formatMoney(account?.balance)} />
              <StatCard label="Total Value" value={formatMoney(account?.total_value)} />
              <StatCard label="PnL" value={formatMoney(pnl)} color={pnlPositive ? 'text-emerald-400' : 'text-red-400'} sub={formatPct(account?.total_pnl_pct)} />
              <StatCard label="Capital Invested" value={formatMoney(account?.total_invested)} />
            </div>
          </div>

          <div className="rounded-[26px] border border-zinc-800/80 bg-zinc-950/45 p-5">
            <div className="panel-title"><span>Account Controls</span></div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-4">
                <div className="section-kicker mb-2">Account mode</div>
                <div className="text-lg text-zinc-100">Demo / Paper Trading</div>
                <div className="mt-1 text-sm text-zinc-500">No real orders are sent to a broker from AgenticTrading.</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link to="/markets" className="btn-primary text-center">Open Markets</Link>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Reset your demo account back to $100,000?')) {
                      await api.resetDemoAccount();
                      window.location.reload();
                    }
                  }}
                  className="btn-ghost border-red-800 text-red-400 hover:border-red-600 hover:text-red-300"
                >
                  Reset account
                </button>
              </div>
              <button type="button" onClick={refetch} className="btn-ghost w-full">Refresh portfolio</button>
            </div>
          </div>
        </div>
      </section>

      {loading && !account ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => <div key={index} className="skeleton h-28 w-full rounded-2xl" />)}
        </div>
      ) : null}

      <div className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]">
        <section className="panel p-5">
          <div className="panel-title">
            <span>Open Positions</span>
            <span className="text-[10px] font-mono text-zinc-600">{positions.length} holdings</span>
          </div>
          {positions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500">
                    <th className="pb-3 pr-4 font-normal">Symbol</th>
                    <th className="pb-3 pr-4 text-right font-normal">Quantity</th>
                    <th className="pb-3 pr-4 text-right font-normal">Avg Cost</th>
                    <th className="pb-3 pr-4 text-right font-normal">Market Value</th>
                    <th className="pb-3 pr-4 text-right font-normal">Weight</th>
                    <th className="pb-3 text-right font-normal">Unrealized PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr
                      key={position.symbol}
                      className="cursor-pointer border-b border-zinc-900/70 transition-colors hover:bg-zinc-800/20"
                      onClick={() => navigate(`/markets/${position.symbol}`)}
                    >
                      <td className="py-3 pr-4 font-mono text-cyan-400">{position.symbol}</td>
                      <td className="py-3 pr-4 text-right font-mono text-zinc-300">{position.quantity}</td>
                      <td className="py-3 pr-4 text-right font-mono text-zinc-400">{formatMoney(position.avg_cost)}</td>
                      <td className="py-3 pr-4 text-right font-mono text-zinc-300">{formatMoney(position.market_value)}</td>
                      <td className="py-3 pr-4 text-right font-mono text-zinc-500">
                        {account?.total_value ? `${((Number(position.market_value || 0) / Number(account.total_value || 1)) * 100).toFixed(1)}%` : '-'}
                      </td>
                      <td className={`py-3 text-right font-mono ${Number(position.unrealized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatMoney(position.unrealized_pnl)} ({formatPct(position.unrealized_pnl_pct)})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/35 px-4 py-8 text-center text-sm text-zinc-500">
              You do not have open positions yet. Start with a liquid training market like AAPL, NVDA, or BTC.
            </div>
          )}
        </section>

        <section className="panel p-5">
          <div className="panel-title"><span>Portfolio Snapshot</span></div>
          <div className="space-y-3">
            {[
              { label: 'Positions', value: positions.length },
              { label: 'Winning trades', value: trades.filter((trade) => Number(trade.pnl || 0) > 0).length },
              { label: 'Losing trades', value: trades.filter((trade) => Number(trade.pnl || 0) < 0).length },
              { label: 'Last action', value: trades[0]?.action || '-' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-zinc-800 bg-zinc-950/45 px-4 py-4">
                <div className="section-kicker mb-2">{item.label}</div>
                <div className="text-2xl font-light font-mono text-zinc-100">{item.value}</div>
              </div>
            ))}
            <Link to="/learn" className="btn-ghost block text-center">Go back to learning hub</Link>
          </div>
        </section>
      </div>

      <section className="panel p-5">
        <div className="panel-title">
          <span>Benchmark Chart</span>
          <span className="text-[10px] font-mono text-zinc-600">SPY reference for market context</span>
        </div>
        <CandlestickChart symbol="SPY" height={320} />
      </section>

      <section className="panel p-5">
        <div className="panel-title">
          <span>Trade History</span>
          <span className="text-[10px] font-mono text-zinc-600">{trades.length} fills</span>
        </div>
        {trades.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500">
                  <th className="pb-3 pr-4 font-normal">Symbol</th>
                  <th className="pb-3 pr-4 font-normal">Side</th>
                  <th className="pb-3 pr-4 text-right font-normal">Qty</th>
                  <th className="pb-3 pr-4 text-right font-normal">Price</th>
                  <th className="pb-3 pr-4 text-right font-normal">Total</th>
                  <th className="pb-3 pr-4 text-right font-normal">PnL</th>
                  <th className="pb-3 text-right font-normal">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-zinc-900/70">
                    <td className="py-3 pr-4 font-mono text-cyan-400">{trade.symbol}</td>
                    <td className={`py-3 pr-4 font-mono ${trade.action === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{trade.action}</td>
                    <td className="py-3 pr-4 text-right font-mono text-zinc-300">{trade.quantity}</td>
                    <td className="py-3 pr-4 text-right font-mono text-zinc-300">${Number(trade.price || 0).toFixed(2)}</td>
                    <td className="py-3 pr-4 text-right font-mono text-zinc-400">{formatMoney(trade.total_value)}</td>
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
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/35 px-4 py-8 text-center text-sm text-zinc-500">
            No trades yet. Visit the market detail page to preview and place a paper trade.
          </div>
        )}
      </section>
    </div>
  );
}
