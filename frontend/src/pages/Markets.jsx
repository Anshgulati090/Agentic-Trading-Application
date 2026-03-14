import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, SYMBOLS } from '../services/api';

const POPULAR = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Auto' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
  { symbol: 'BTC-USD', name: 'Bitcoin', sector: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', sector: 'Crypto' },
  { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'ETF' },
];

function PriceCard({ symbol, name, sector }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMarketPrice(symbol)
      .then(d => setData(d?.data || d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  const price = data?.price ?? data;
  const change = data?.change;
  const changePct = data?.change_pct;
  const isPos = (change ?? 0) >= 0;

  return (
    <Link
      to={`/markets/${symbol}`}
      className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-all hover:bg-zinc-900 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-mono font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">{symbol}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{name}</div>
        </div>
        <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">{sector}</span>
      </div>
      {loading ? (
        <div className="h-7 w-24 bg-zinc-800 animate-pulse rounded" />
      ) : price ? (
        <div className="flex items-end justify-between">
          <div className="text-xl font-light text-zinc-100 tabular-nums font-mono">
            ${typeof price === 'number' ? price.toFixed(2) : price}
          </div>
          {change != null && (
            <div className={`text-xs font-mono tabular-nums ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPos ? '+' : ''}{change.toFixed(2)} ({isPos ? '+' : ''}{((changePct ?? 0) * 100).toFixed(2)}%)
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-zinc-600 font-mono">No data</div>
      )}
    </Link>
  );
}

export default function Markets() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.searchSymbols(q);
      setSearchResults(res?.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, handleSearch]);

  const showResults = query.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-light tracking-tight">Markets</h1>
              <p className="text-sm text-zinc-500 font-mono mt-0.5">Search any symbol to view live data & signals</p>
            </div>
            <Link to="/dashboard" className="text-sm text-zinc-400 hover:text-cyan-400 transition-colors">← Dashboard</Link>
          </div>

          {/* Search */}
          <div className="relative max-w-lg">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search symbol or company… (AAPL, Tesla, BTC)"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 text-zinc-100 rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none transition-colors placeholder:text-zinc-600"
            />
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                {searching ? (
                  <div className="px-4 py-3 text-xs text-zinc-500 font-mono">Searching…</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(r => (
                    <Link
                      key={r.symbol}
                      to={`/markets/${r.symbol}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition-colors"
                      onClick={() => setQuery('')}
                    >
                      <div>
                        <span className="font-mono font-semibold text-cyan-400">{r.symbol}</span>
                        <span className="text-xs text-zinc-500 ml-2">{r.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">{r.sector}</span>
                    </Link>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-zinc-500 font-mono">No results for "{query}"</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">Popular Markets</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {POPULAR.map(p => (
            <PriceCard key={p.symbol} {...p} />
          ))}
        </div>
      </div>
    </div>
  );
}
