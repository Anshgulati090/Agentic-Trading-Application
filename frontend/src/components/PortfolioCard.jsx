import { useCallback } from 'react';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';

function Metric({ label, value, sub, color = 'text-zinc-100', loading = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">{label}</span>
      {loading
        ? <span className="h-7 w-24 bg-zinc-800 animate-pulse rounded mt-0.5" />
        : <span className={`text-xl font-light tabular-nums ${color}`}>{value ?? '-'}</span>
      }
      {sub && !loading && <span className="text-xs text-zinc-600 font-mono">{sub}</span>}
    </div>
  );
}

const fmt = (n, pre = '$') => n == null ? null : pre + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => n == null ? null : (n >= 0 ? '+' : '') + (Number(n) * 100).toFixed(2) + '%';

export default function PortfolioCard() {
  const fetchMetrics = useCallback(() => api.getPortfolioMetrics(), []);
  const { data: m, loading, error, refetch } = usePolling(fetchMetrics, 8000);

  const pnl = m?.unrealized_pnl ?? m?.pnl ?? null;
  const pnlPct = m?.pnl_pct ?? null;
  const isPos = pnl >= 0;

  if (error && !m) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <div className="text-red-400 text-xs font-mono">Failed to load portfolio</div>
        <div className="text-zinc-600 text-[10px]">{error}</div>
        <button onClick={refetch} className="text-[10px] font-mono text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded hover:bg-cyan-500/10 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-2 gap-4">
        <Metric label="Portfolio Value" value={fmt(m?.portfolio_value ?? m?.total_value)} loading={loading && !m} />
        <Metric label="Cash" value={fmt(m?.cash)} loading={loading && !m} />
        <Metric
          label="Unrealized P&L"
          value={fmt(pnl)}
          sub={fmtPct(pnlPct) ?? undefined}
          color={pnl == null ? 'text-zinc-100' : isPos ? 'text-emerald-400' : 'text-red-400'}
          loading={loading && !m}
        />
        <Metric label="Exposure" value={fmtPct(m?.exposure)} loading={loading && !m} />
      </div>

      {m?.positions && Object.keys(m.positions).length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-2">Positions</div>
          <div className="space-y-1.5">
            {Object.entries(m.positions).map(([sym, pos]) => (
              <div key={sym} className="grid grid-cols-3 text-xs font-mono items-center">
                <span className="text-cyan-400">{sym}</span>
                <span className="text-zinc-400 text-center">{pos.qty ?? pos.quantity ?? '?'} sh</span>
                <span className="text-zinc-300 text-right">{fmt(pos.value ?? pos.market_value) ?? '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {m?.sharpe_ratio != null && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800">
          <Metric label="Sharpe" value={Number(m.sharpe_ratio).toFixed(2)} />
          <Metric label="Volatility" value={fmtPct(m.volatility)} />
          <Metric label="Max DD" value={fmtPct(m.max_drawdown)} color="text-red-400" />
        </div>
      )}

      {error && m && (
        <div className="text-[10px] font-mono text-amber-600 mt-auto">Live refresh temporarily unavailable</div>
      )}
    </div>
  );
}
