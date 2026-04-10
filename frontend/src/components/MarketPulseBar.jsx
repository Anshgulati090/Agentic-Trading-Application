import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../utils/format';
import { useLiveMarket } from '../hooks/useLiveMarket';

const PULSE_SYMBOLS = [
  { symbol: 'SPY',     label: 'S&P 500' },
  { symbol: 'QQQ',     label: 'NASDAQ' },
  { symbol: 'DIA',     label: 'DOW' },
  { symbol: 'BTC-USD', label: 'BITCOIN' },
  { symbol: 'GLD',     label: 'GOLD' },
  { symbol: '^VIX',    label: 'VIX' },
  { symbol: 'ETH-USD', label: 'ETHEREUM' },
  { symbol: 'NVDA',    label: 'NVDA' },
  { symbol: 'AAPL',    label: 'AAPL' },
  { symbol: 'TSLA',    label: 'TSLA' },
];

export default function MarketPulseBar() {
  const liveTicks = useLiveMarket();
  const prevTicks = useRef({});
  const [flashState, setFlashState] = useState({});

  useEffect(() => {
    const flashes = {};
    let hasFlash = false;
    for (const { symbol } of PULSE_SYMBOLS) {
      const p = liveTicks[symbol]?.price;
      const prev = prevTicks.current[symbol]?.price;
      if (p != null && prev != null && p !== prev) {
         flashes[symbol] = p > prev ? 'up' : 'down';
         hasFlash = true;
      }
    }
    
    if (hasFlash) {
      setFlashState(flashes);
      const t = setTimeout(() => setFlashState({}), 600);
      prevTicks.current = { ...liveTicks }; 
      return () => clearTimeout(t);
    } else {
      prevTicks.current = { ...liveTicks };
    }
  }, [liveTicks]);

  const items = PULSE_SYMBOLS.map(({ symbol, label }) => ({
    symbol, label, ...(liveTicks[symbol] || {}),
  }));

  return (
    <div style={{
      background: 'rgba(4, 12, 18, 0.98)',
      borderBottom: '1px solid rgba(0, 183, 255, 0.08)',
      overflow: 'hidden',
      height: 38,
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{
        display: 'flex',
        animation: 'ticker-scroll 50s linear infinite',
        whiteSpace: 'nowrap',
      }}>
        {[...items, ...items].map((item, idx) => {
          const hasData = item.price != null;
          const positive = (item.change ?? 0) >= 0;
          const flash = flashState[item.symbol];
          const priceColor = !hasData ? '#3d607a' : positive ? '#00e676' : '#ff3d57';
          const flashColor = flash === 'up' ? '#00e676' : flash === 'down' ? '#ff3d57' : priceColor;

          return (
            <a
              key={idx}
              href={`/markets/${item.symbol}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0 20px', textDecoration: 'none',
                borderRight: '1px solid rgba(0,183,255,0.06)',
                height: 38, flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,183,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase', letterSpacing: '0.15em',
                color: '#4d7a96', fontWeight: 600,
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                color: flashColor, fontWeight: 600,
                transition: 'color 0.3s',
                textShadow: flash ? `0 0 8px ${flashColor}` : 'none',
              }}>
                {hasData
                  ? formatPrice(item.price, item.symbol)
                  : formatPrice(null, item.symbol)}
              </span>
              {hasData && (
                <span style={{
                  fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                  color: positive ? '#00e676' : '#ff3d57',
                  fontWeight: 500,
                }}>
                  {positive ? '+' : ''}{((item.changePct ?? 0) * 100).toFixed(2)}%
                </span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
