import { Link } from 'react-router-dom';
import { memo } from 'react';
import MiniSparkline from '../MiniSparkline';
import { formatChange, formatPercent, formatPrice, safeText, trendFromQuote } from '../../utils/marketData';
import type { MarketCatalogItem, MarketQuote } from '../../types/market';

type AssetTableProps = {
  title: string;
  items: MarketCatalogItem[];
  quotes: Record<string, MarketQuote>;
  loading?: boolean;
};

function AssetTableBase({ title, items, quotes, loading = false }: AssetTableProps) {
  if (!items.length) {
    return (
      <div className="panel rounded-xl p-4">
        <div className="panel-title">{title}</div>
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/35 p-4 text-sm text-zinc-500">No assets available for this section.</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{items.length} symbols</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Name</th>
            <th title="Recent trend over 1D, 1W, and 1M windows">Trend (1D / 1W / 1M)</th>
            <th className="text-right">Price</th>
            <th className="text-right">Change</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const quote = quotes[item.symbol];
            const trend = trendFromQuote(quote || { change: null });
            const trendClass = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-500';

            return (
              <tr key={item.symbol} className="focus-within:bg-[rgba(0,183,255,0.06)]">
                <td>
                  <Link
                    to={`/markets/${item.symbol}`}
                    className="font-mono font-semibold text-cyan-400 hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    aria-label={`Open ${item.symbol} detail page`}
                  >
                    {item.symbol}
                  </Link>
                </td>
                <td className="text-xs text-[var(--text-secondary)]">{safeText(item.name, item.symbol)}</td>
                <td>
                  <div className="flex min-w-[120px] items-center gap-2">
                    <MiniSparkline points={quote?.history || []} positive={trend !== 'down'} className="h-8 w-16" />
                    <span className={`text-[10px] font-mono ${trendClass}`}>
                      {trend === 'up' ? 'UP' : trend === 'down' ? 'DOWN' : 'FLAT'}
                    </span>
                  </div>
                </td>
                <td className="text-right font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                  {loading && quote?.price === null ? 'Loading...' : formatPrice(quote?.price ?? null, item.symbol)}
                </td>
                <td className={`text-right font-mono text-xs ${trendClass}`}>
                  {quote?.price === null
                    ? 'N/A'
                    : `${formatChange(quote?.change ?? null)} (${formatPercent(quote?.changePct ?? null)})`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const AssetTable = memo(AssetTableBase);
