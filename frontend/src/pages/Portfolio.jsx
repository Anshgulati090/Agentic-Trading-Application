import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import CandlestickChart from '../components/CandlestickChart';

function StatCard({ label, value, sub, color = 'text-zinc-100' }) {
  return (
    <div className="panel p-4">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-1">{label}</div>
      <div className={`text-2xl font-light tabular-nums font-mono ${color}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-zinc-600 font-mono mt-0.5">{sub}</div>}
    </div>
  );
}

const fmt = (n) => n != null ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
const fmtPct = (n) => n != null ? (n >= 0 ? '+' : '') + (n * 100).toFixed(2) + '%' : '—';

export default function Portfolio() {
  const { isAuthenticated } = useAuth();
  const fetchAccount = useCallback(() => isAuthenticated ? api.getDemoAccount() : api.getPortfolioMetrics(), [isAuthenticated]);
  const fetchTrades = useCallback(() => isAuthenticated ? api.getDemoTrades(50) : Promise.resolve([]), [isAuthenticated]);
  const { data: acct, loading } = usePolling(fetchAccount, 8000);
  const { data: trades } = usePolling(fetchTrades, 10000);

  const pnl = acct?.total_pnl ?? acct?.pnl ?? null;
  const isPos = (pnl ?? 0) >= 0;
  const tradeRows = trades || [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">💼</div>
          <h2 className="text-xl font-light">Sign in to view your portfolio</h2>
          <Link to="/login" className="btn-primary inline-block">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="panel p-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-light tracking-tight">Demo Portfolio</h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">Paper trading account — no real money</p>
        </div>
        <button
          onClick={() => { if (confirm('Reset demo account to $100,000?')) api.resetDemoAccount().then(() => window.location.reload()); }}
          className="btn-ghost text-xs text-red-400 border-red-800 hover:border-red-600 hover:text-red-300"
        >
          Reset Account
        </button>
      </div>

      {loading && !acct ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="panel p-4 h-20 skeleton" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Cash Balance" value={fmt(acct?.balance)} />
            <StatCard label="Total Value" value={fmt(acct?.total_value)} />
            <StatCard
              label="Total P&L"
              value={fmt(pnl)}
              sub={acct?.total_pnl_pct != null ? fmtPct(acct.total_pnl_pct) : undefined}
              color={pnl == null ? 'text-zinc-100' : isPos ? 'text-emerald-400' : 'text-red-400'}
            />
            <StatCard label="Invested" value={fmt(acct?.total_invested)} />
          </div>

          {/* Positions */}
          {acct?.positions?.length > 0 && (
            <div className="panel p-5">
              <div className="panel-title"><span>Open Positions</span></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-zinc-600 border-b border-zinc-800">
                      <th className="text-left pb-2 pr-4 font-normal">Symbol</th>
                      <th className="text-right pb-2 pr-4 font-normal">Quantity</th>
                      <th className="text-right pb-2 pr-4 font-normal">Avg Cost</th>
                      <th className="text-right pb-2 pr-4 font-normal">Market Value</th>
                      <th className="text-right pb-2 font-normal">Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acct.positions.map(pos => (
                      <tr key={pos.symbol} className="border-b border-zinc-900 hover:bg-zinc-800/20 cursor-pointer"
                        onClick={() => window.location.href = `/markets/${pos.symbol}`}>
                        <td className="py-2.5 pr-4 text-cyan-400 hover:text-cyan-300">{pos.symbol}</td>
                        <td className="py-2.5 pr-4 text-right text-zinc-300 tabular-nums">{pos.quantity}</td>
                        <td className="py-2.5 pr-4 text-right text-zinc-400 tabular-nums">{fmt(pos.avg_cost)}</td>
                        <td className="py-2.5 pr-4 text-right text-zinc-300 tabular-nums">{fmt(pos.market_value)}</td>
                        <td className={`py-2.5 text-right tabular-nums ${pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {fmt(pos.unrealized_pnl)} ({fmtPct(pos.unrealized_pnl_pct)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Chart */}
      <div className="panel p-5">
        <div className="panel-title"><span>Portfolio Performance Chart</span></div>
        <CandlestickChart symbol="SPY" height={280} />
      </div>

      {/* Trade history */}
      <div className="panel p-5">
        <div className="panel-title">
          <span>Trade History</span>
          <span className="text-zinc-600">{tradeRows.length} trades</span>
        </div>
        {tradeRows.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 font-mono text-sm">
            No trades yet — <Link to="/markets" className="text-cyan-400 hover:text-cyan-300">browse markets</Link> to start
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-zinc-900">
                <tr className="text-[10px] uppercase tracking-widest text-zinc-600 border-b border-zinc-800">
                  <th className="text-left pb-2 pr-4 font-normal">Symbol</th>
                  <th className="text-left pb-2 pr-4 font-normal">Side</th>
                  <th className="text-right pb-2 pr-4 font-normal">Qty</th>
                  <th className="text-right pb-2 pr-4 font-normal">Price</th>
                  <th className="text-right pb-2 pr-4 font-normal">Total</th>
                  <th className="text-right pb-2 pr-4 font-normal">P&L</th>
                  <th className="text-right pb-2 font-normal">Time</th>
                </tr>
              </thead>
              <tbody>
                {tradeRows.map(t => (
                  <tr key={t.id} className="border-b border-zinc-900/80 hover:bg-zinc-800/20">
                    <td className="py-2 pr-4 text-cyan-400">{t.symbol}</td>
                    <td className={`py-2 pr-4 font-semibold ${t.action === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{t.action}</td>
                    <td className="py-2 pr-4 text-right text-zinc-300 tabular-nums">{t.quantity}</td>
                    <td className="py-2 pr-4 text-right text-zinc-300 tabular-nums">${t.price?.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right text-zinc-400 tabular-nums">${t.total_value?.toFixed(2)}</td>
                    <td className={`py-2 pr-4 text-right tabular-nums ${t.pnl == null ? 'text-zinc-600' : t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${Math.abs(t.pnl).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 text-right text-zinc-600 tabular-nums">
                      {new Date(t.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
