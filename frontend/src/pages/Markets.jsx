import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MiniSparkline from '../components/MiniSparkline';
import { searchMarkets } from '../data/marketCatalog';
import { api } from '../services/api';

const SIDEBAR_SECTIONS = [
  'Overview',
  'World Indices',
  'Global Markets',
  'Assets',
  'Crypto',
  'Trending',
];

const MARKET_GROUPS = [
  {
    id: 'world-indices',
    title: 'World Indices',
    groups: [
      { title: 'Americas', symbols: ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX'] },
      { title: 'Europe', symbols: ['VGK', 'FEZ', 'EZU', 'EWU', 'EWL'] },
      { title: 'Asia', symbols: ['EWJ', 'MCHI', 'EWA', 'INDA', 'EWH'] },
    ],
  },
  {
    id: 'assets',
    title: 'Assets',
    groups: [
      { title: 'Commodities', symbols: ['GLD', 'SLV', 'XOM', 'CVX'] },
      { title: 'Currencies', symbols: ['UUP', 'FXE', 'FXY', 'FXB'] },
      { title: 'Treasury Bonds', symbols: ['TLT', 'IEF', 'SHY', 'BIL'] },
    ],
  },
  {
    id: 'crypto',
    title: 'Crypto Markets',
    groups: [
      { title: 'Digital Assets', symbols: ['BTC', 'ETH', 'SOL'] },
    ],
  },
];

function normalizeQuote(payload) {
  const quote = payload?.data || payload || {};
  const history = (quote.history || []).map((row) => Number(row.close ?? row.value ?? row.price)).filter(Number.isFinite);
  return {
    symbol: quote.symbol,
    price: Number(quote.price),
    change: Number(quote.change),
    changePct: Number(quote.change_pct ?? quote.changePct),
    volume: Number(quote.volume ?? 0),
    history,
  };
}

function formatPrice(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '--';
  return numeric >= 1000
    ? numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : numeric.toFixed(2);
}

function formatChange(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '--';
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(2)}`;
}

function SectionTable({ title, items, quotes }) {
  return (
    <div className="rounded-[24px] border border-zinc-800/80 bg-zinc-900/55">
      <div className="flex items-center justify-between border-b border-zinc-800/70 px-4 py-3">
        <div className="text-lg text-zinc-100">{title}</div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">{items.length} symbols</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.28em] text-zinc-500">
              <th className="px-4 py-3 font-normal">Symbol</th>
              <th className="px-4 py-3 font-normal">Name</th>
              <th className="px-4 py-3 font-normal">Trend</th>
              <th className="px-4 py-3 font-normal text-right">Price</th>
              <th className="px-4 py-3 font-normal text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const quote = quotes[item.symbol];
              const positive = (quote?.change ?? 0) >= 0;
              return (
                <tr key={item.symbol} className="border-t border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/markets/${item.symbol}`} className="font-mono text-cyan-400 hover:text-cyan-300">
                      {item.symbol}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{item.name}</td>
                  <td className="px-4 py-3">
                    <MiniSparkline points={quote?.history || []} positive={positive} className="h-8 w-20" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-100">${formatPrice(quote?.price)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatChange(quote?.change)} ({formatChange((quote?.changePct ?? 0) * 100)}%)
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Markets() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [quotes, setQuotes] = useState({});

  const trackedSymbols = useMemo(() => {
    const groupSymbols = MARKET_GROUPS.flatMap((section) => section.groups.flatMap((group) => group.symbols));
    const resultSymbols = results.map((item) => item.symbol);
    return Array.from(new Set([...groupSymbols, ...resultSymbols]));
  }, [results]);

  const loadQuotes = useCallback(async () => {
    const values = await Promise.allSettled(
      trackedSymbols.map((symbol) => api.getMarketPrice(symbol).then((payload) => [symbol, normalizeQuote(payload)]))
    );

    setQuotes((prev) => {
      const next = { ...prev };
      values.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [symbol, quote] = result.value;
          next[symbol] = quote;
        }
      });
      return next;
    });
  }, [trackedSymbols]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        return;
      }

      try {
        const response = await api.searchSymbols(trimmed);
        const remote = response?.results || [];
        const local = searchMarkets(trimmed);
        setResults(Array.from(new Map([...local, ...remote].map((item) => [item.symbol, item])).values()).slice(0, 6));
      } catch {
        setResults(searchMarkets(trimmed).slice(0, 6));
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    loadQuotes();
    const timer = window.setInterval(loadQuotes, 12000);
    return () => window.clearInterval(timer);
  }, [loadQuotes]);

  const trending = useMemo(() => {
    return Object.values(quotes)
      .sort((left, right) => Math.abs(right.changePct ?? 0) - Math.abs(left.changePct ?? 0))
      .slice(0, 6);
  }, [quotes]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <aside className="hidden xl:block rounded-[24px] border border-zinc-800/80 bg-zinc-900/55 p-4">
          <div className="text-[10px] uppercase tracking-[0.35em] text-cyan-400">Markets</div>
          <div className="mt-4 space-y-1">
            {SIDEBAR_SECTIONS.map((item, index) => (
              <button
                key={item}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  index === 0 ? 'bg-cyan-500/15 text-cyan-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </aside>

        <div className="rounded-[28px] border border-zinc-800/80 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900/80 px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.35em] text-cyan-400">Markets Overview</div>
              <h1 className="mt-3 text-3xl font-light text-zinc-100 sm:text-4xl">Global market dashboard</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
                Scan world indices, macro assets, and crypto in one place, then drill into a symbol for deeper analysis and demo trading.
              </p>
            </div>
            <Link to="/dashboard" className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-cyan-300">
              Open Dashboard
            </Link>
          </div>

          <div className="relative mt-6">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Apple, Nvidia, Tesla, Bitcoin..."
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/85 pl-11 pr-4 py-4 text-sm text-zinc-100 outline-none transition focus:border-cyan-500"
            />
            {!!results.length && (
              <div className="absolute left-0 right-0 top-full z-40 mt-3 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-2xl shadow-black/40">
                {results.map((item) => (
                  <Link key={item.symbol} to={`/markets/${item.symbol}`} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/80">
                    <div>
                      <div className="font-mono text-cyan-400">{item.symbol}</div>
                      <div className="text-xs text-zinc-500">{item.name}</div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className="text-zinc-100">${formatPrice(quotes[item.symbol]?.price)}</div>
                      <div className={(quotes[item.symbol]?.change ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {formatChange((quotes[item.symbol]?.changePct ?? 0) * 100)}%
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-zinc-800/80 bg-zinc-900/55 p-4">
            <div className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">Trending tickers</div>
            <div className="mt-4 space-y-3">
              {trending.map((item) => (
                <Link key={item.symbol} to={`/markets/${item.symbol}`} className="flex items-center justify-between rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-3 py-3 hover:border-cyan-500/30">
                  <div>
                    <div className="font-mono text-cyan-400">{item.symbol}</div>
                    <div className="text-[11px] text-zinc-500">${formatPrice(item.price)}</div>
                  </div>
                  <div className={`font-mono text-xs ${(item.change ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatChange((item.changePct ?? 0) * 100)}%
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-800/80 bg-zinc-900/55 p-4">
            <div className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">How to use</div>
            <div className="mt-4 space-y-3 text-sm text-zinc-400">
              <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-3">1. Search a company or ticker.</div>
              <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-3">2. Open its market page for chart, signals, and demo trade tools.</div>
              <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-3">3. Use Dashboard and Portfolio to monitor your simulated performance.</div>
            </div>
          </div>
        </aside>
      </section>

      <section className="space-y-8">
        {MARKET_GROUPS.map((section) => (
          <div key={section.id} className="space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">{section.title}</div>
              <h2 className="mt-2 text-2xl font-light text-zinc-100">{section.title}</h2>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {section.groups.map((group) => {
                const items = group.symbols.map((symbol) => searchMarkets(symbol)[0] || { symbol, name: symbol }).filter(Boolean);
                return <SectionTable key={group.title} title={group.title} items={items} quotes={quotes} />;
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
