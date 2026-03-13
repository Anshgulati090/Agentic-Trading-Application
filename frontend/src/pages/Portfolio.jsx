import { useCallback } from 'react';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import AnalyticsChart from '../components/AnalyticsChart';
import TradeTable from '../components/TradeTable';

function StatCard({ label, value, sub, color = 'text-zinc-100' }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-1">{label}</div>
      <div className={`text-2xl font-light tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-600 font-mono mt-0.5">{sub}</div>}
    </div>
  );
}

function fmt(n, prefix = '$') {
  if (n == null) return '—';
  return prefix + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n) {
  if (n == null) return '—';
  const v = (Number(n) * 100).toFixed(2);
  return (n >= 0 ? '+' : '') + v + '%';
}

export default function Portfolio() {
  const fetchMetrics = useCallback(() => api.getPortfolioMetrics(), []);
  const { data: m, loading } = usePolling(fetchMetrics, 8000);

  const pnl = m?.unrealized_pnl ?? m?.pnl ?? null;
  const isPos = pnl >= 0;

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <h2 className="text-zinc-100 font-light text-xl tracking-tight">Portfolio Overview</h2>
        <p className="text-zinc-500 text-xs font-mono mt-0.5">Live metrics from /portfolio/metrics</p>
      </div>

      {loading && !m ? (
        <div className="text-zinc-600 text-sm font-mono animate-pulse p-4">Loading portfolio data...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Value" value={fmt(m?.portfolio_value ?? m?.total_value)} />
            <StatCard label="Cash" value={fmt(m?.cash)} />
            <StatCard
              label="Unrealized P&L"
              value={fmt(pnl)}
              sub={m?.pnl_pct ? fmtPct(m.pnl_pct) : undefined}
              color={pnl == null ? 'text-zinc-100' : isPos ? 'text-emerald-400' : 'text-red-400'}
            />
            <StatCard label="Exposure" value={m?.exposure != null ? fmtPct(m.exposure) : '—'} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Sharpe Ratio" value={m?.sharpe_ratio != null ? Number(m.sharpe_ratio).toFixed(3) : '—'} />
            <StatCard label="Volatility" value={m?.volatility != null ? fmtPct(m.volatility) : '—'} />
            <StatCard label="Max Drawdown" value={m?.max_drawdown != null ? fmtPct(m.max_drawdown) : '—'} color="text-red-400" />
            <StatCard label="Alpha" value={m?.alpha != null ? Number(m.alpha).toFixed(4) : '—'} color="text-cyan-400" />
          </div>

          {/* Positions Table */}
          {m?.positions && Object.keys(m.positions).length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-3">Open Positions</div>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-zinc-600 border-b border-zinc-800">
                    <th className="text-left pb-2 pr-4">Symbol</th>
                    <th className="text-right pb-2 pr-4">Quantity</th>
                    <th className="text-right pb-2 pr-4">Avg Cost</th>
                    <th className="text-right pb-2 pr-4">Market Value</th>
                    <th className="text-right pb-2">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(m.positions).map(([sym, pos]) => (
                    <tr key={sym} className="border-b border-zinc-900 hover:bg-zinc-800/20">
                      <td className="py-2 pr-4 text-cyan-400">{sym}</td>
                      <td className="py-2 pr-4 text-right text-zinc-300 tabular-nums">{pos.qty ?? pos.quantity ?? '—'}</td>
                      <td className="py-2 pr-4 text-right text-zinc-400 tabular-nums">{pos.avg_cost ? fmt(pos.avg_cost) : '—'}</td>
                      <td className="py-2 pr-4 text-right text-zinc-300 tabular-nums">{pos.value ? fmt(pos.value) : fmt(pos.market_value) ?? '—'}</td>
                      <td className={`py-2 text-right tabular-nums ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pos.pnl != null ? fmt(pos.pnl, pos.pnl >= 0 ? '+$' : '-$') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Analytics Chart */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-3">Performance Analytics</div>
        <AnalyticsChart />
      </div>

      {/* Trade History */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-3">Trade History</div>
        <div style={{ height: 340 }}>
          <TradeTable maxRows={12} />
        </div>
      </div>
    </div>
  );
}
