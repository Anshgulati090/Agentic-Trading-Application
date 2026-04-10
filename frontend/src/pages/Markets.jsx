import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import MiniSparkline from '../components/MiniSparkline';
import { searchMarkets } from '../data/marketCatalog';
import { api } from '../services/api';
import { safeArray } from '../utils/safeApi';
import { useLiveMarket } from '../hooks/useLiveMarket';

/* ─── market catalog ─────────────────────────────────────── */
const MARKET_GROUPS = [
  {
    id: 'world-indices',
    title: 'World Indices',
    icon: '🌐',
    groups: [
      { title: 'Americas', symbols: ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX'] },
      { title: 'Europe',   symbols: ['VGK', 'FEZ', 'EZU', 'EWU', 'EWL'] },
      { title: 'Asia',     symbols: ['EWJ', 'MCHI', 'EWA', 'INDA', 'EWH'] },
    ],
  },
  {
    id: 'assets',
    title: 'Assets',
    icon: '📦',
    groups: [
      { title: 'Commodities',    symbols: ['GLD', 'SLV', 'XOM', 'CVX'] },
      { title: 'Currencies',     symbols: ['UUP', 'FXE', 'FXY', 'FXB'] },
      { title: 'Treasury Bonds', symbols: ['TLT', 'IEF', 'SHY', 'BIL'] },
    ],
  },
  {
    id: 'crypto',
    title: 'Crypto Markets',
    icon: '₿',
    groups: [
      { title: 'Digital Assets', symbols: ['BTC', 'ETH', 'SOL'] },
    ],
  },
];

const QUICK_PICKS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'BTC-USD', 'ETH-USD', 'SPY'];

/* ─── helpers ─────────────────────────────────────────────── */
function useDebouncedValue(v, ms = 350) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

function normalizeQuote(payload) {
  const q = payload?.data || payload || {};
  const history = safeArray(q.history).map((r) => Number(r?.close ?? r?.price ?? 0)).filter(Number.isFinite);
  return { symbol: q.symbol, price: Number(q.price), change: Number(q.change), changePct: Number(q.change_pct ?? 0), history };
}

const fmtP = (v) => {
  const n = Number(v); if (!Number.isFinite(n)) return '—';
  return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : n.toFixed(2);
};
const fmtC = (v, isDecimal = false) => {
  const n = Number(v) * (isDecimal ? 100 : 1);
  if (!Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}${isDecimal ? '%' : ''}`;
};

/* ─── SectionTable ─────────────────────────────────────────── */
function SectionTable({ title, items, quotes }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(0,183,255,0.08)' }}>
        <span style={{ fontWeight: 600, color: '#e8f4ff', fontSize: 14 }}>{title}</span>
        <span style={{ fontSize: 10, color: '#3d607a', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.2em' }}>{items.length} symbols</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Symbol</th><th>Name</th><th>Trend</th>
            <th style={{ textAlign: 'right' }}>Price</th>
            <th style={{ textAlign: 'right' }}>Change</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const q = quotes[item.symbol];
            const pos = (q?.change ?? 0) >= 0;
            const hasData = q?.price != null && Number.isFinite(q.price);
            return (
              <tr key={item.symbol}>
                <td>
                  <Link to={`/markets/${item.symbol}`} style={{
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 13,
                    color: '#00d4ff', textDecoration: 'none', transition: 'color 0.15s',
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#00e676'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#00d4ff'}
                  >
                    {item.symbol}
                  </Link>
                </td>
                <td style={{ color: '#7a9ab5', fontSize: 12 }}>{item.name}</td>
                <td><MiniSparkline points={q?.history || []} positive={pos} className="h-8 w-16" /></td>
                <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: '#e8f4ff' }}>
                  {hasData ? `$${fmtP(q.price)}` : <span style={{ color: '#3d607a' }}>$—</span>}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: pos ? '#00e676' : '#ff3d57' }}>
                  {hasData
                    ? `${fmtC(q.change)} (${fmtC(q.changePct, true)})`
                    : <span style={{ color: '#3d607a' }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── QuickPick card ──────────────────────────────────────── */
function QuickCard({ symbol, quote }) {
  const pos = (quote?.change ?? 0) >= 0;
  const hasData = quote?.price != null && Number.isFinite(quote.price);
  return (
    <Link to={`/markets/${symbol}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s',
        position: 'relative', overflow: 'hidden',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'none'; }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#00d4ff' }}>{symbol}</span>
          {hasData && (
            <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: pos ? '#00e676' : '#ff3d57',
              background: pos ? 'rgba(0,230,118,0.1)' : 'rgba(255,61,87,0.1)',
              padding: '2px 6px', borderRadius: 4 }}>
              {fmtC(quote.changePct, true)}
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: hasData ? (pos ? '#00e676' : '#ff3d57') : '#3d607a', marginBottom: 6 }}>
          {hasData ? `$${fmtP(quote.price)}` : '$—'}
        </div>
        <MiniSparkline points={quote?.history || []} positive={pos} className="h-8 w-full" />
      </div>
    </Link>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function Markets() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [results, setResults] = useState([]);
  const liveTicks = useLiveMarket();
  const [historyQuotes, setHistoryQuotes] = useState({});
  const dq = useDebouncedValue(query, 350);

  const allSymbols = useMemo(() => {
    const fromGroups = MARKET_GROUPS.flatMap((s) => s.groups.flatMap((g) => g.symbols));
    const fromResults = results.map((r) => r.symbol);
    const fromQuick = QUICK_PICKS;
    return Array.from(new Set([...fromGroups, ...fromResults, ...fromQuick]));
  }, [results]);

  const loadQuotes = useCallback(async () => {
    if (!allSymbols.length) return;
    try {
      const payload = await api.getMarketPrices(allSymbols);
      const data = payload?.data || payload || {};
      setHistoryQuotes((prev) => {
        const next = { ...prev };
        Object.entries(data).forEach(([s, q]) => {
          if (q && Number.isFinite(Number(q.price))) {
            next[s] = normalizeQuote(q);
          }
        });
        return next;
      });
    } catch (e) {
      console.warn("Bulk market fetch failed", e);
    }
  }, [allSymbols]);

  // Only load purely historical data ONCE on mount or when search changes 
  // (so sparklines render). Live updates come from the websocket.
  useEffect(() => { loadQuotes(); }, [loadQuotes]);

  const quotes = useMemo(() => {
    const merged = { ...historyQuotes };
    for (const sym of Object.keys(liveTicks)) {
      if (merged[sym]) {
         merged[sym] = { ...merged[sym], ...liveTicks[sym] };
      } else {
         merged[sym] = liveTicks[sym];
      }
    }
    return merged;
  }, [historyQuotes, liveTicks]);

  useEffect(() => {
    const trimmed = dq.trim();
    if (!trimmed) { setResults([]); return; }
    let active = true;
    (async () => {
      try {
        const resp = await api.searchSymbols(trimmed);
        const remote = resp?.data?.results || resp?.results || [];
        const local = searchMarkets(trimmed);
        if (active) setResults(Array.from(new Map([...local, ...remote].map((i) => [i.symbol, i])).values()).slice(0, 8));
      } catch { if (active) setResults(searchMarkets(trimmed).slice(0, 8)); }
    })();
    return () => { active = false; };
  }, [dq]);

  const trending = useMemo(() =>
    Object.entries(quotes)
      .sort((a, b) => Math.abs(b[1]?.changePct ?? 0) - Math.abs(a[1]?.changePct ?? 0))
      .slice(0, 5)
      .map(([s, q]) => ({ symbol: s, ...q })),
    [quotes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero search ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(10,21,32,0.95) 0%, rgba(7,16,24,0.98) 100%)',
        border: '1px solid rgba(0,183,255,0.15)',
        borderRadius: 16, padding: '28px 28px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(0,212,255,0.06)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 60% 80% at 0% 50%, rgba(0,100,200,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10, color: '#3d607a', textTransform: 'uppercase', letterSpacing: '0.3em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>Markets Overview</div>
          <h1 style={{ font: '300 32px/1.2 Inter, sans-serif', color: '#e8f4ff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Global Market Dashboard
          </h1>
          <p style={{ fontSize: 13, color: '#4d7a96', margin: '0 0 20px', maxWidth: 500, lineHeight: 1.7 }}>
            Scan world indices, macro assets, and crypto. Then drill into any symbol for advanced charts, AI signals, and demo trading.
          </p>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 560 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4d7a96" strokeWidth={2} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Apple, Nvidia, Bitcoin, TATASTEEL..."
              style={{
                width: '100%', background: 'rgba(4,12,18,0.8)', border: '1px solid rgba(0,183,255,0.2)',
                borderRadius: 10, padding: '12px 14px 12px 42px', fontSize: 14,
                color: '#e8f4ff', outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(0,212,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(0,183,255,0.2)'; e.target.style.boxShadow = 'none'; }}
            />

            {/* Results dropdown */}
            {results.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: '#071018', border: '1px solid rgba(0,183,255,0.2)',
                borderRadius: 10, overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.7)', zIndex: 50,
              }}>
                {results.map((item) => {
                  const q = quotes[item.symbol];
                  const pos = (q?.change ?? 0) >= 0;
                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => navigate(`/markets/${item.symbol}`)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        width: '100%', padding: '11px 16px', background: 'transparent',
                        border: 'none', borderBottom: '1px solid rgba(0,183,255,0.05)',
                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,183,255,0.06)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#00d4ff', fontWeight: 700 }}>{item.symbol}</div>
                        <div style={{ fontSize: 11, color: '#4d7a96', marginTop: 2 }}>{item.name}</div>
                      </div>
                      {q?.price != null && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#e8f4ff', fontWeight: 600 }}>${fmtP(q.price)}</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: pos ? '#00e676' : '#ff3d57' }}>{fmtC(q.changePct, true)}</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Picks ──────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 10, color: '#3d607a', textTransform: 'uppercase', letterSpacing: '0.3em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>Quick Access · Top Markets</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {QUICK_PICKS.map((s) => <QuickCard key={s} symbol={s} quote={quotes[s]} />)}
        </div>
      </div>

      {/* ── Main grid: sections + trending sidebar ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {MARKET_GROUPS.map((section) => (
            <div key={section.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 18 }}>{section.icon}</span>
                <h2 style={{ font: '300 22px/1 Inter, sans-serif', color: '#e8f4ff', margin: 0 }}>{section.title}</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
                {section.groups.map((group) => {
                  const items = group.symbols.map((s) => searchMarkets(s)[0] || { symbol: s, name: s }).filter(Boolean);
                  return <SectionTable key={group.title} title={group.title} items={items} quotes={quotes} />;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ─ Trending sidebar ─ */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel" style={{ padding: '16px 18px' }}>
            <div className="panel-title">🔥 Trending</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trending.length ? trending.map((item) => {
                const pos = (item?.change ?? 0) >= 0;
                return (
                  <Link key={item.symbol} to={`/markets/${item.symbol}`} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                    background: 'rgba(0,183,255,0.03)', border: '1px solid rgba(0,183,255,0.08)',
                    transition: 'all 0.2s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,183,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(0,183,255,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,183,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(0,183,255,0.08)'; }}
                  >
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#00d4ff', fontWeight: 700 }}>{item.symbol}</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4d7a96', marginTop: 1 }}>${fmtP(item.price)}</div>
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: pos ? '#00e676' : '#ff3d57', fontWeight: 600 }}>
                      {fmtC(item.changePct, true)}
                    </span>
                  </Link>
                );
              }) : (
                <div style={{ fontSize: 12, color: '#3d607a', textAlign: 'center', padding: '12px 0' }}>Loading market data...</div>
              )}
            </div>
          </div>

          <div className="panel" style={{ padding: '16px 18px' }}>
            <div className="panel-title">How to Use</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { n: '1', text: 'Search any company or ticker' },
                { n: '2', text: 'Open market page for charts, signals & demo trades' },
                { n: '3', text: 'Track performance in Dashboard & Portfolio' },
              ].map(({ n, text }) => (
                <div key={n} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(0,183,255,0.05)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00d4ff', fontWeight: 700, flexShrink: 0 }}>{n}.</span>
                  <span style={{ fontSize: 12, color: '#4d7a96', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
