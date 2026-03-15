import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MiniSparkline from '../components/MiniSparkline';
import { searchMarkets } from '../data/marketCatalog';
import { api } from '../services/api';

const MARKET_GROUPS = [
  {
    id: 'us-equities',
    label: 'US Equities',
    groups: [
      { title: 'Large Cap Tech', symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'] },
      { title: 'Financial', symbols: ['JPM', 'GS', 'V'] },
      { title: 'Consumer & Energy', symbols: ['WMT', 'COST', 'XOM', 'CVX'] },
    ],
  },
  {
    id: 'indices-etfs',
    label: 'Indices & ETFs',
    groups: [
      { title: 'US Indices', symbols: ['SPY', 'QQQ', 'DIA', 'IWM'] },
      { title: 'Commodities', symbols: ['GLD'] },
    ],
  },
  {
    id: 'crypto',
    label: 'Crypto',
    groups: [
      { title: 'Digital Assets', symbols: ['BTC', 'ETH', 'SOL'] },
    ],
  },
];

const FEATURED = ['AAPL', 'NVDA', 'TSLA', 'BTC', 'SPY', 'META'];

function fmt(n) {
  if (!Number.isFinite(n)) return '—';
  return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toFixed(2);
}

function changeFmt(n) {
  if (!Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;
}

/* ─── Market Row (table row) ──────────────────────────────── */
function MarketRow({ item, quote, loading }) {
  const pos = (quote?.change ?? 0) >= 0;
  return (
    <tr>
      <td style={{ padding: '10px 16px' }}>
        <Link to={`/markets/${item.symbol}`} style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent-cyan)' }}>{item.symbol}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.name}</div>
        </Link>
      </td>
      <td style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {item.sector || item.type || '—'}
          </span>
        </div>
      </td>
      <td style={{ padding: '10px 16px' }}>
        {quote?.sparkline?.length > 2 ? (
          <MiniSparkline points={quote.sparkline} positive={pos} className="h-8 w-16" />
        ) : loading ? (
          <div className="skeleton" style={{ width: 64, height: 30, borderRadius: 4 }} />
        ) : null}
      </td>
      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
        {loading && !quote ? (
          <div className="skeleton" style={{ width: 60, height: 16, marginLeft: 'auto' }} />
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            ${fmt(quote?.price)}
          </span>
        )}
      </td>
      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
        {loading && !quote ? (
          <div className="skeleton" style={{ width: 50, height: 16, marginLeft: 'auto' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: pos ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 500 }}>
              {changeFmt(quote?.change)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: pos ? 'var(--accent-green)' : 'var(--accent-red)', opacity: 0.75 }}>
              {changeFmt((quote?.changePct ?? 0) * 100)}%
            </span>
          </div>
        )}
      </td>
      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
        <Link to={`/markets/${item.symbol}`} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>View</Link>
      </td>
    </tr>
  );
}

/* ─── Section Table ────────────────────────────────────────── */
function SectionTable({ title, symbols, quotes, loading }) {
  const items = useMemo(() =>
    symbols.map(sym => searchMarkets(sym)[0] || { symbol: sym, name: sym }).filter(Boolean),
    [symbols]
  );

  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</div>
        <div className="section-kicker">{symbols.length} symbols</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 500 }}>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Sector</th>
              <th>Trend</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Change</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <MarketRow key={item.symbol} item={item} quote={quotes[item.symbol]} loading={loading} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Featured Card ────────────────────────────────────────── */
function FeaturedCard({ symbol, quote, loading }) {
  const pos = (quote?.change ?? 0) >= 0;
  const item = searchMarkets(symbol)[0] || { symbol, name: symbol };

  return (
    <Link to={`/markets/${symbol}`} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: '16px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'none'; }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>{symbol}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 80, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
          </div>
          {loading && !quote ? null : (
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: pos ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
              {changeFmt((quote?.changePct ?? 0) * 100)}%
            </span>
          )}
        </div>
        {quote?.sparkline?.length > 2 && (
          <MiniSparkline points={quote.sparkline} positive={pos} className="h-10 w-full" />
        )}
        {loading && !quote ? (
          <div className="skeleton" style={{ width: '80%', height: 20, marginTop: 8 }} />
        ) : (
          <div style={{ marginTop: 8, fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            ${fmt(quote?.price)}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ─── Markets Page ─────────────────────────────────────────── */
export default function Markets() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [results, setResults] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const allSymbols = useMemo(() => {
    const grouped = MARKET_GROUPS.flatMap(g => g.groups.flatMap(s => s.symbols));
    const featured = FEATURED;
    return Array.from(new Set([...featured, ...grouped]));
  }, []);

  const loadQuotes = useCallback(async () => {
    const values = await Promise.allSettled(
      allSymbols.map(sym =>
        api.getMarketPrice(sym).then(p => [sym, {
          price: Number(p?.data?.price ?? p?.price),
          change: Number(p?.data?.change ?? p?.change),
          changePct: Number(p?.data?.change_pct ?? p?.data?.changePct ?? p?.changePct),
          sparkline: (p?.data?.history || p?.history || []).map(r => Number(r.close ?? r.price)).filter(Number.isFinite),
        }])
      )
    );
    setQuotes(prev => {
      const next = { ...prev };
      values.forEach(r => { if (r.status === 'fulfilled') { const [s, q] = r.value; next[s] = q; } });
      return next;
    });
    setLoadingQuotes(false);
  }, [allSymbols]);

  // Search
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const t = query.trim();
      if (!t) { setResults([]); return; }
      try {
        const [remote] = await Promise.allSettled([api.searchSymbols(t)]);
        const local = searchMarkets(t);
        const rem = remote.status === 'fulfilled' ? (remote.value?.results || []) : [];
        setResults(Array.from(new Map([...local, ...rem].map(i => [i.symbol, i])).values()).slice(0, 10));
      } catch {
        setResults(searchMarkets(t).slice(0, 10));
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => { loadQuotes(); const t = setInterval(loadQuotes, 15000); return () => clearInterval(t); }, [loadQuotes]);

  const trending = useMemo(() =>
    Object.entries(quotes)
      .map(([sym, q]) => ({ symbol: sym, ...q }))
      .sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0))
      .slice(0, 6),
    [quotes]
  );

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'us-equities', label: 'Equities' },
    { id: 'indices-etfs', label: 'Indices' },
    { id: 'crypto', label: 'Crypto' },
  ];

  const activeGroups = activeTab === 'overview'
    ? MARKET_GROUPS
    : MARKET_GROUPS.filter(g => g.id === activeTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div className="page-hero">
        <div className="hero-glow" />
        <div style={{ position: 'relative', padding: '28px 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div className="section-kicker" style={{ marginBottom: 8 }}>Market Overview</div>
                <h1 style={{ fontSize: 28, fontWeight: 300, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Global Markets</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '8px 0 0' }}>
                  Equities, indices, and digital assets — updated live.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="live-dot" />
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Auto-refresh 15s</span>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', maxWidth: 560 }}>
              <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search Apple, Nvidia, Bitcoin…"
                className="input"
                style={{ paddingLeft: 42, paddingTop: 12, paddingBottom: 12, fontSize: 14 }}
              />
              {results.length > 0 && query && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  marginTop: 6,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 12,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                }}>
                  {results.map((item, i) => {
                    const q = quotes[item.symbol];
                    const pos = (q?.change ?? 0) >= 0;
                    return (
                      <Link key={item.symbol} to={`/markets/${item.symbol}`}
                        onClick={() => { setQuery(''); setResults([]); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 16px', textDecoration: 'none',
                          borderBottom: i < results.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', gap: 10 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent-cyan)', minWidth: 52 }}>{item.symbol}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>${fmt(q?.price)}</div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: pos ? 'var(--accent-green)' : 'var(--accent-red)' }}>{changeFmt((q?.changePct ?? 0) * 100)}%</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Featured */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="section-kicker">Featured</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {FEATURED.map(sym => <FeaturedCard key={sym} symbol={sym} quote={quotes[sym]} loading={loadingQuotes} />)}
        </div>
      </div>

      {/* Tabs + Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start' }}>

        {/* Tables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: activeTab === tab.id ? 500 : 400,
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent-cyan)' : 'transparent'}`,
                  marginBottom: -1, transition: 'all 0.15s',
                }}
              >{tab.label}</button>
            ))}
          </div>

          {activeGroups.flatMap(g => g.groups).map(group => (
            <SectionTable key={group.title} title={group.title} symbols={group.symbols} quotes={quotes} loading={loadingQuotes} />
          ))}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Trending */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title"><span>Most Active</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {trending.map(item => {
                const pos = (item.change ?? 0) >= 0;
                return (
                  <Link key={item.symbol} to={`/markets/${item.symbol}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, textDecoration: 'none', transition: 'all 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent-cyan)' }}>{item.symbol}</div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 1 }}>${fmt(item.price)}</div>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: pos ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                      {changeFmt((item.changePct ?? 0) * 100)}%
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* How to use */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title"><span>How to Use</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                '1. Search or browse to find a symbol.',
                '2. Open the market page for chart & signals.',
                '3. Place a paper trade to practice.',
                '4. Monitor performance in Portfolio.',
              ].map((step, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
