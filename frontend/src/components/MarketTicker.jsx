import { useState, useEffect, useCallback, useRef } from 'react';
import { api, SYMBOLS } from '../services/api';

// Stable mock baseline — doesn't re-randomize on every render
const MOCK_BASES = { AAPL: 189.5, MSFT: 378.2, GOOGL: 141.8, AMZN: 182.4, TSLA: 248.7, META: 503.1, NVDA: 875.4 };

function makeMock(sym, prev) {
  const base  = prev?.price ?? MOCK_BASES[sym] ?? 100;
  const delta = (Math.random() - 0.48) * base * 0.008;
  const price = +(base + delta).toFixed(2);
  return { price, change: +(price - (MOCK_BASES[sym] ?? price)).toFixed(2), changePct: delta / base };
}

export default function MarketTicker({ onSelectSymbol }) {
  const [prices,   setPrices]  = useState({});
  const [loading,  setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const prevRef = useRef({});

  const fetchPrices = useCallback(async () => {
    const results = await Promise.allSettled(
      SYMBOLS.map((sym) => api.getMarketPrice(sym).then((d) => [sym, d]))
    );
    setPrices((old) => {
      const next = { ...old };
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          const [sym, data] = r.value;
          next[sym] = data ?? makeMock(sym, old[sym]);
        } else {
          const sym = SYMBOLS[results.indexOf(r)];
          next[sym] = makeMock(sym, old[sym]);
        }
      });
      prevRef.current = next;
      return next;
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrices();
    const t = setInterval(fetchPrices, 6000);
    return () => clearInterval(t);
  }, [fetchPrices]);

  const handleSelect = (sym) => {
    setSelected(sym);
    onSelectSymbol?.(sym);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-7 gap-2.5">
      {SYMBOLS.map((sym) => {
        const p = prices[sym];
        const isPos = (p?.change ?? 0) >= 0;
        const isSelected = selected === sym;
        return (
          <button
            key={sym}
            onClick={() => handleSelect(sym)}
            className={`flex min-h-[84px] flex-col justify-between p-3 rounded-xl border transition-all text-left ${
              isSelected
                ? 'border-cyan-500/50 bg-cyan-500/8 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]'
                : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 hover:bg-zinc-900/80'
            }`}
          >
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{sym}</span>
            {loading && !p ? (
              <span className="h-4 w-16 bg-zinc-800 animate-pulse rounded mt-1" />
            ) : (
              <>
                <span className="text-sm font-light tabular-nums text-zinc-100 mt-0.5">
                  ${Number(p?.price ?? p ?? 0).toFixed(2)}
                </span>
                {p?.change != null && (
                  <span className={`text-[10px] font-mono tabular-nums ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPos ? '+' : ''}{p.change.toFixed(2)}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
