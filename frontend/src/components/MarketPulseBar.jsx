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
  const history = (quote.history || [])
    .map(row => Number(row.close ?? row.price ?? row.value))
    .filter(Number.isFinite);
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const results = await Promise.allSettled(
      PULSE_SYMBOLS.map(({ symbol }) =>
        api.getMarketPrice(symbol).then(payload => [symbol, normalize(payload)])
      )
    );
    setQuotes(prev => {
      const next = { ...prev };
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          const [symbol, value] = r.value;
          next[symbol] = value;
        }
      });
      return next;
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 14000);
    return () => window.clearInterval(timer);
  }, [load]);

  const rows = useMemo(() =>
    PULSE_SYMBOLS.map(item => ({ ...item, quote: quotes[item.symbol] })),
    [quotes]
  );

  return (
    <div style={{
      background: 'rgba(13,17,23,0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ maxWidth: 1680, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', padding: '0' }}
          className="scrollbar-thin">
          {rows.map(({ symbol, label, quote }, i) => {
            const positive = (quote?.change ?? 0) >= 0;
            const pct = quote?.changePct;
            const price = quote?.price;

            return (
              <div key={symbol} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 20px',
                borderRight: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                flexShrink: 0,
                minWidth: 160,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)',
                      fontWeight: 500, color: 'var(--text-muted)',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>{label}</span>
                    {!loading && Number.isFinite(pct) && (
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        color: positive ? 'var(--accent-green)' : 'var(--accent-red)',
                        fontWeight: 500,
                      }}>
                        {positive ? '+' : ''}{(pct * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    {loading && !quote ? (
                      <div className="skeleton" style={{ width: 64, height: 16 }} />
                    ) : (
                      <span style={{
                        fontSize: 13, fontFamily: 'var(--font-mono)',
                        fontWeight: 500, color: 'var(--text-primary)',
                        letterSpacing: '-0.01em',
                      }}>
                        {Number.isFinite(price) ? (price > 999 ? price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : price.toFixed(2)) : '—'}
                      </span>
                    )}
                    {quote?.sparkline?.length > 1 && (
                      <MiniSparkline
                        points={quote.sparkline}
                        positive={positive}
                        className="h-6 w-14"
                        style={{ opacity: 0.7 }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Live indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px',
            marginLeft: 'auto', flexShrink: 0,
          }}>
            <span className="live-dot" />
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
