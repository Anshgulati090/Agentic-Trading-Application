import { useState } from 'react';
import { SYMBOLS } from '../services/api';
import { formatPrice } from '../utils/format';
import { useLiveMarket } from '../hooks/useLiveMarket';

export default function MarketTicker({ onSelectSymbol }) {
  const liveTicks = useLiveMarket();
  const [selected, setSelected] = useState(null);

  const handleSelect = (sym) => {
    setSelected(sym);
    onSelectSymbol?.(sym);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-7 gap-2.5">
      {SYMBOLS.map((sym) => {
        const p = liveTicks[sym];
        const isPos = (p?.change ?? 0) >= 0;
        const isSelected = selected === sym;
        const loading = !p;

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
            <div className="flex justify-between items-center w-full">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{sym}</span>
              {p?.source === 'websocket_engine' && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              )}
            </div>
            
            {loading ? (
              <span className="h-4 w-16 bg-zinc-800 animate-pulse rounded mt-1" />
            ) : (
              <>
                <span className="text-sm font-light tabular-nums text-zinc-100 mt-0.5">
                  {formatPrice(p?.price, sym)}
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
