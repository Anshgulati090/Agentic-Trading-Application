import { useState, useMemo } from 'react';
import { formatPrice } from '../utils/format';

function generateMockTrades() {
  const symbols  = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'AMZN'];
  const statuses = ['FILLED', 'FILLED', 'FILLED', 'PARTIAL', 'REJECTED'];
  const agents   = ['momentum', 'mean_rev', 'llm', 'factor'];
  // Use deterministic values so the table doesn't flicker on re-render
  return Array.from({ length: 25 }, (_, i) => {
    const side   = i % 3 === 2 ? 'SELL' : 'BUY';
    const sym    = symbols[i % symbols.length];
    const qty    = (i * 7 + 10) % 100 + 5;
    const price  = +(150 + (i * 13.7) % 700).toFixed(2);
    const status = statuses[i % statuses.length];
    const ts     = new Date(Date.now() - i * 1000 * 60 * (i + 1));
    return { id: `TRD-${1000 + i}`, symbol: sym, side, qty, price, status, agent: agents[i % agents.length], ts };
  });
}

const MOCK_TRADES = generateMockTrades();

const SIDE_STYLE   = { BUY:  'text-emerald-400', SELL: 'text-red-400' };
const STATUS_STYLE = { FILLED: 'text-emerald-400', PARTIAL: 'text-amber-400', REJECTED: 'text-red-400', PENDING: 'text-zinc-400' };

const FILTERS = ['ALL', 'BUY', 'SELL'];
const SORT_KEYS = ['ts', 'symbol', 'price'];

export default function TradeTable({ trades = MOCK_TRADES, maxRows = 15 }) {
  const [filter,  setFilter]  = useState('ALL');
  const [sortKey, setSortKey] = useState('ts');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const displayed = useMemo(() => {
    let rows = filter === 'ALL' ? trades : trades.filter((t) => t.side === filter);
    rows = [...rows].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ?  1 : -1;
      return 0;
    });
    return rows.slice(0, maxRows);
  }, [trades, filter, sortKey, sortAsc, maxRows]);

  const SortIcon = ({ k }) => sortKey !== k ? null : (
    <span className="ml-0.5 text-zinc-500">{sortAsc ? '↑' : '↓'}</span>
  );

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Filter bar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded border transition-colors ${
                filter === f ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/5' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-mono text-zinc-600">{displayed.length} rows</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-zinc-950">
            <tr className="text-[10px] uppercase tracking-widest text-zinc-600 border-b border-zinc-800">
              <th className="text-left pb-2 pr-3 font-normal">ID</th>
              <th className="text-left pb-2 pr-3 font-normal cursor-pointer hover:text-zinc-400" onClick={() => handleSort('symbol')}>
                Symbol <SortIcon k="symbol" />
              </th>
              <th className="text-left pb-2 pr-3 font-normal">Side</th>
              <th className="text-right pb-2 pr-3 font-normal">Qty</th>
              <th className="text-right pb-2 pr-3 font-normal cursor-pointer hover:text-zinc-400" onClick={() => handleSort('price')}>
                Price <SortIcon k="price" />
              </th>
              <th className="text-left pb-2 pr-3 font-normal hidden sm:table-cell">Agent</th>
              <th className="text-left pb-2 pr-3 font-normal">Status</th>
              <th className="text-right pb-2 font-normal cursor-pointer hover:text-zinc-400" onClick={() => handleSort('ts')}>
                Time <SortIcon k="ts" />
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((t) => (
              <tr key={t.id} className="border-b border-zinc-900/80 hover:bg-zinc-800/20 transition-colors">
                <td className="py-1.5 pr-3 text-zinc-600">{t.id}</td>
                <td className="py-1.5 pr-3 text-cyan-400">{t.symbol}</td>
                <td className={`py-1.5 pr-3 font-semibold ${SIDE_STYLE[t.side] ?? 'text-zinc-400'}`}>{t.side}</td>
                <td className="py-1.5 pr-3 text-right text-zinc-300 tabular-nums">{t.qty}</td>
                <td className="py-1.5 pr-3 text-right text-zinc-300 tabular-nums">{formatPrice(t.price, t.symbol)}</td>
                <td className="py-1.5 pr-3 text-zinc-500 hidden sm:table-cell">{t.agent}</td>
                <td className={`py-1.5 pr-3 ${STATUS_STYLE[t.status] ?? 'text-zinc-400'}`}>{t.status}</td>
                <td className="py-1.5 text-right text-zinc-600 tabular-nums">
                  {new Date(t.ts).toLocaleTimeString('en-US', { hour12: false })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
