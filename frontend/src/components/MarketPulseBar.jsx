import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import MiniSparkline from './MiniSparkline';

const PULSE_SYMBOLS = [
  { symbol: 'SPY', label: 'S&P 500' },
  { symbol: 'QQQ', label: 'Nasdaq' },
  { symbol: 'DIA', label: 'Dow' },
  { symbol: 'BTC-USD', label: 'Bitcoin' },
  { symbol: 'GLD', label: 'Gold' },
  { symbol: 'VIX', label: 'VIX' },
];

function normalize(payload) {
  const quote = payload?.data || payload || {};
  const history = (quote.history || []).map((row) => Number(row.close ?? row.price ?? row.value)).filter(Number.isFinite);
  return {
    symbol: quote.symbol,
    price: Number(quote.price),
    change: Number(quote.change),
    changePct: Number(quote.change_pct ?? quote.changePct),
    sparkline: history,
  };
}

export default function MarketPulseBar() {
  const [quotes, setQuotes] = useState({});

  const load = useCallback(async () => {
    const results = await Promise.allSettled(
      PULSE_SYMBOLS.map(({ symbol }) => api.getMarketPrice(symbol).then((payload) => [symbol, normalize(payload)]))
    );

    setQuotes((prev) => {
      const next = { ...prev };
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [symbol, value] = result.value;
          next[symbol] = value;
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 12000);
    return () => window.clearInterval(timer);
  }, [load]);

  const rows = useMemo(() => PULSE_SYMBOLS.map((item) => ({ ...item, quote: quotes[item.symbol] })), [quotes]);

  return (
    <div className="sticky top-[72px] z-40 border-b border-zinc-800/70 bg-zinc-950/92 backdrop-blur-xl">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-3 overflow-x-auto py-3 scrollbar-thin">
          {rows.map(({ symbol, label, quote }) => {
            const positive = (quote?.change ?? 0) >= 0;
            return (
              <div key={symbol} className="min-w-[170px] rounded-xl border border-zinc-800/70 bg-zinc-900/70 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{label}</div>
                  <div className={`text-[11px] font-mono ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {Number.isFinite(quote?.changePct) ? `${positive ? '+' : ''}${(quote.changePct * 100).toFixed(2)}%` : '--'}
                  </div>
                </div>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div className="text-sm font-mono text-zinc-100">
                    ${Number.isFinite(quote?.price) ? quote.price.toFixed(2) : '--'}
                  </div>
                  <MiniSparkline points={quote?.sparkline || []} positive={positive} className="h-8 w-16" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
