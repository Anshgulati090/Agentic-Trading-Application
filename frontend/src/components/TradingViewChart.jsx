import { useEffect, useMemo, useState } from 'react';

/**
 * TradingView Advanced Chart Widget
 *
 * ⚠️ Why no useEffect + manual DOM? The old approach used
 * document.createElement('iframe') + container.removeChild() in useEffect,
 * which crashes under React StrictMode (double-invoke) because the cleanup
 * function tries to remove an iframe that was already removed by the second
 * invocation.
 *
 * ✅ Fix: render the <iframe> as a JSX element with srcdoc. React owns the
 * lifecycle; no manual DOM operations needed.
 */
export default function TradingViewChart({
  symbol = 'AAPL',
  theme = 'dark',
  interval = 'D',
  height = 600,
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Reset states when key props change
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [symbol, theme, interval]);

  const resolveTVSymbol = (sym) => {
    const s = sym.toUpperCase();
    // Indian exchanges
    if (s.endsWith('.NS')) return `BSE:${s.replace('.NS', '')}`;
    if (s.endsWith('.BO')) return `BSE:${s.replace('.BO', '')}`;
    // Crypto pairs (BTC-USD -> CRYPTO:BTCUSD)
    if (s === 'BTC-USD') return 'CRYPTO:BTCUSD';
    if (s === 'ETH-USD') return 'CRYPTO:ETHUSD';
    if (s === 'SOL-USD') return 'CRYPTO:SOLUSD';
    if (s.includes('-USD')) return `CRYPTO:${s.replace('-USD', 'USD')}`;
    // Index symbols (Yahoo ^VIX -> CBOE:VIX, ^GSPC -> SP:SPX, etc.)
    const indexMap = {
      '^VIX': 'CBOE:VIX',
      'VIX': 'CBOE:VIX',
      '%5EVIX': 'CBOE:VIX',
      '^GSPC': 'SP:SPX',
      'GSPC': 'SP:SPX',
      '^DJI': 'DJ:DJI',
      'DJI': 'DJ:DJI',
      '^IXIC': 'NASDAQ:IXIC',
      'IXIC': 'NASDAQ:IXIC',
      '^RUT': 'TVC:RUT',
      'RUT': 'TVC:RUT',
      '^FTSE': 'TVC:UKX',
      'FTSE': 'TVC:UKX',
      '^N225': 'TVC:NI225',
      'N225': 'TVC:NI225',
      '^HSI': 'TVC:HSI',
      'HSI': 'TVC:HSI',
    };
    if (indexMap[s]) return indexMap[s];
    // Forex (EURUSD=X -> FX:EURUSD)
    if (s.endsWith('=X')) return `FX:${s.replace('=X', '')}`;
    // Futures (GC=F -> COMEX:GC1!, CL=F -> NYMEX:CL1!)
    const futuresMap = {
      'GC=F': 'COMEX:GC1!',
      'CL=F': 'NYMEX:CL1!',
      'NG=F': 'NYMEX:NG1!',
    };
    if (futuresMap[s]) return futuresMap[s];
    // Default: pass through as-is (works for AAPL, MSFT, etc.)
    return s;
  };

  const srcdoc = useMemo(() => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; box-sizing: border-box; overflow: hidden; background: ${theme === 'dark' ? '#09090b' : '#ffffff'}; }
    .tv-container { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div class="tv-container">
    <div id="tradingview_chart" style="height:100%;width:100%;"></div>
    <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
    <script type="text/javascript">
      new TradingView.widget({
        "autosize": true,
        "symbol": "${resolveTVSymbol(symbol)}",
        "interval": "${interval}",
        "timezone": "Etc/UTC",
        "theme": "${theme}",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "container_id": "tradingview_chart"
      });
    </script>
  </div>
</body>
</html>`, [symbol, theme, interval]);

  // Reset loading state whenever symbol changes
  const handleLoad = () => setLoaded(true);
  const handleError = () => setError(true);

  return (
    <div className="relative w-full">
      <div
        className="relative rounded-xl overflow-hidden border border-zinc-800"
        style={{ height: `${height}px` }}
      >
        {/* Loading overlay */}
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10 pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-500 font-mono">Loading TradingView Chart...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/95 z-20">
            <div className="text-xs font-mono text-amber-300">Chart failed to load.</div>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('chartType', 'legacy');
                window.dispatchEvent(
                  new CustomEvent('chartTypeChange', { detail: { chartType: 'legacy' } })
                );
              }}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300"
            >
              Switch to Simple Candles
            </button>
          </div>
        )}

        {/* Pure JSX iframe — React manages the DOM, no manual removeChild */}
        <iframe
          key={`${symbol}-${theme}-${interval}`}
          title={`TradingView chart for ${symbol}`}
          srcDoc={srcdoc}
          onLoad={handleLoad}
          onError={handleError}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
        />
      </div>

      <div className="mt-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live Data
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            100+ Indicators
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.open(`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(resolveTVSymbol(symbol))}`, '_blank')}
          className="text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors"
        >
          Open Full Screen →
        </button>
      </div>
    </div>
  );
}
