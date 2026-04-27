import { Link } from 'react-router-dom';
import { memo } from 'react';
import MiniSparkline from '../MiniSparkline';
import { formatPercent, formatPrice, safeText, trendFromQuote } from '../../utils/marketData';
import type { MarketQuote } from '../../types/market';

type AssetCardProps = {
  symbol: string;
  name?: string;
  quote: MarketQuote;
  timeframe?: '1D' | '1W' | '1M';
};

function AssetCardBase({ symbol, name, quote, timeframe = '1D' }: AssetCardProps) {
  const trend = trendFromQuote(quote);
  const trendText = trend === 'up' ? 'UP' : trend === 'down' ? 'DOWN' : 'FLAT';
  const trendClass = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-400';

  return (
    <Link
      to={`/markets/${symbol}`}
      aria-label={`Open ${symbol} details`}
      className="market-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-xl font-semibold font-mono text-[var(--text-primary)]">{formatPrice(quote.price, symbol)}</div>
          <div className="text-xs font-mono tracking-[0.2em] text-cyan-400">{symbol}</div>
          <div className="mt-1 truncate text-xs text-[var(--text-secondary)]">{safeText(name, symbol)}</div>
        </div>
        <div className="text-right">
          <div className={`text-xs font-mono ${trendClass}`} title="Directional move from prior close">
            {trendText}
          </div>
          <div className={`text-xs font-mono ${trendClass}`}>{formatPercent(quote.changePct)}</div>
        </div>
      </div>

      <MiniSparkline points={quote.history} positive={trend !== 'down'} className="h-9 w-full" />

      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]" title="Sparkline timeframe labels">
        <span>{timeframe}</span>
        <span>1W</span>
        <span>1M</span>
      </div>
    </Link>
  );
}

export const AssetCard = memo(AssetCardBase);
