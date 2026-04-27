import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, getMockPriceHistory } from '../services/api';
import { formatPrice } from '../utils/format';
import { safeArray } from '../utils/safeApi';

const PERIODS = ['1D', '1W', '1M', '3M', '1Y'];
const PERIOD_TO_DAYS = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365 };

function normalizeSeries(raw) {
  const rows = safeArray(raw);
  return rows
    .map((row, index) => ({
      index,
      time: row.time ?? Math.floor(new Date(row.timestamp || row.date || Date.now()).getTime() / 1000),
      label: row.date || row.label || new Date((row.time ?? 0) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      open: Number(row.open ?? row.close ?? 0),
      high: Number(row.high ?? row.close ?? 0),
      low: Number(row.low ?? row.close ?? 0),
      close: Number(row.close ?? row.open ?? 0),
      volume: Number(row.volume ?? 0),
    }))
    .filter((row) => Number.isFinite(row.open) && Number.isFinite(row.high) && Number.isFinite(row.low) && Number.isFinite(row.close))
    .sort((a, b) => a.time - b.time);
}

function ChartTooltip({ point, symbol }) {
  if (!point) return null;

  return (
    <div className="absolute left-3 top-3 rounded-lg border border-zinc-700/80 bg-zinc-950/95 px-3 py-2 text-[11px] font-mono shadow-lg shadow-black/30">
      <div className="text-zinc-500">{point.label}</div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
        <span className="text-zinc-600">O</span><span className="text-zinc-200">{formatPrice(point.open, symbol)}</span>
        <span className="text-zinc-600">H</span><span className="text-emerald-400">{formatPrice(point.high, symbol)}</span>
        <span className="text-zinc-600">L</span><span className="text-red-400">{formatPrice(point.low, symbol)}</span>
        <span className="text-zinc-600">C</span><span className="text-zinc-100">{formatPrice(point.close, symbol)}</span>
      </div>
    </div>
  );
}

export default function CandlestickChart({ symbol = 'AAPL', height = 320, liveKline = null }) {
  const containerRef = useRef(null);
  const [period, setPeriod] = useState('1M');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ohlcv, setOhlcv] = useState([]);
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const loadTimeoutRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setUsedFallback(false);
    try {
      const timeoutPromise = new Promise((_, reject) => {
        loadTimeoutRef.current = window.setTimeout(() => reject(new Error('timeout')), 8000);
      });
      const response = await Promise.race([api.getOHLCV(symbol, period), timeoutPromise]);
      const rows =
        response?.data?.prices ||
        response?.prices ||
        response?.history ||
        [];
      const next = normalizeSeries(rows);
      if (next.length) {
        setOhlcv(next);
      } else {
        const fallback = normalizeSeries(getMockPriceHistory(symbol, PERIOD_TO_DAYS[period] || 30));
        setOhlcv(fallback);
        setUsedFallback(true);
        setError('Live chart unavailable. Showing fallback data.');
      }
    } catch {
      const fallback = normalizeSeries(getMockPriceHistory(symbol, PERIOD_TO_DAYS[period] || 30));
      setOhlcv(fallback);
      setUsedFallback(true);
      setError('Live chart unavailable. Showing fallback data.');
    } finally {
      if (loadTimeoutRef.current) {
        window.clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      setLoading(false);
    }
  }, [period, symbol]);

  useEffect(() => {
    loadData();
  }, [loadData, period]);
  
  // High-frequency partial kline rendering loop
  useEffect(() => {
    // 1m Binance partial bars should only mutate the 1D view, otherwise
    // they distort higher-timeframe candle history.
    if (period !== '1D' || !liveKline || !ohlcv.length) return;
    setOhlcv(prev => {
        if (!prev.length) return prev;
        const out = [...prev];
        const lastCandle = out[out.length - 1];
        
        const klineTime = Math.floor(liveKline.time / 1000);
        
        if (klineTime === lastCandle.time) {
            // Morph the active bar seamlessly
            out[out.length - 1] = {
                ...lastCandle,
                close: liveKline.close,
                high: Math.max(lastCandle.high, liveKline.high),
                low: Math.min(lastCandle.low, liveKline.low),
                volume: liveKline.volume
            };
        } else if (klineTime > lastCandle.time) {
            // Append a new bar on the minute transition
            // To prevent charts from scrolling off to infinity endlessly in DOM, enforce a soft limit like 150 items
            if (out.length > 200) out.shift(); 
            out.push({
                index: out[out.length - 1].index + 1,
                time: klineTime,
                label: new Date(liveKline.time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                open: liveKline.open,
                high: liveKline.high,
                low: liveKline.low,
                close: liveKline.close,
                volume: liveKline.volume
            });
        }
        return out;
    });
  }, [liveKline]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const updateWidth = () => {
      const newWidth = containerRef.current?.clientWidth || 0;
      setWidth((prev) => (newWidth && newWidth !== prev ? newWidth : prev));
    };

    updateWidth();

    let resizeTimeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateWidth, 120);
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(resizeTimeout);
      observer.disconnect();
    };
  }, []);

  const chart = useMemo(() => {
    if (!ohlcv.length || !width) return null;

    const padding = { top: 16, right: 12, bottom: 24, left: 12 };
    const volumeHeight = Math.max(56, Math.round(height * 0.18));
    const candleHeight = height - padding.top - padding.bottom - volumeHeight - 22;
    const candleTop = padding.top;
    const volumeTop = candleTop + candleHeight + 22;
    const innerWidth = Math.max(1, width - padding.left - padding.right);
    const slotWidth = innerWidth / ohlcv.length;
    const candleWidth = Math.max(1, Math.min(16, slotWidth * 0.7));
    const maxPrice = Math.max(...ohlcv.map((row) => row.high));
    const minPrice = Math.min(...ohlcv.map((row) => row.low));
    const priceRange = Math.max(maxPrice - minPrice, 1);
    const maxVolume = Math.max(...ohlcv.map((row) => row.volume || 0), 1);

    const priceToY = (value) => {
      const normalized = (value - minPrice) / priceRange;
      return candleTop + candleHeight - normalized * candleHeight;
    };
    const volumeToHeight = (value) => (value / maxVolume) * volumeHeight;

    return {
      padding,
      candleHeight,
      volumeHeight,
      volumeTop,
      innerWidth,
      candleWidth,
      maxPrice,
      minPrice,
      priceToY,
      volumeToHeight,
      points: ohlcv.map((row, index) => {
        const x = padding.left + slotWidth * index + slotWidth / 2;
        return {
          ...row,
          x,
          openY: priceToY(row.open),
          closeY: priceToY(row.close),
          highY: priceToY(row.high),
          lowY: priceToY(row.low),
          volumeBarHeight: volumeToHeight(row.volume),
          bullish: row.close >= row.open,
        };
      }),
      yTicks: Array.from({ length: 4 }, (_, idx) => {
        const ratio = idx / 3;
        const value = maxPrice - priceRange * ratio;
        return {
          value,
          y: candleTop + candleHeight * ratio,
        };
      }),
      xTicks: ohlcv.filter((_, index) => index === 0 || index === ohlcv.length - 1 || index === Math.floor(ohlcv.length / 2)),
    };
  }, [height, ohlcv, width]);

  // Reset hover index when chart data changes to prevent stale tooltips
  useEffect(() => {
    setHoverIndex(null);
  }, [ohlcv, period]);

  const activePoint = chart && hoverIndex != null 
    ? (chart.points[hoverIndex] ?? null) 
    : (chart?.points?.[chart?.points?.length - 1] ?? null);
  const first = ohlcv.length ? ohlcv[0] : null;
  const last = ohlcv.length ? ohlcv[ohlcv.length - 1] : null;
  const totalReturn = first && last ? ((last.close - first.close) / Math.max(first.close, 1e-9)) * 100 : 0;
  const isPos = totalReturn >= 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {PERIODS.map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border transition-colors ${
                period === item
                  ? 'border-zinc-600 text-zinc-200 bg-zinc-800'
                  : 'border-transparent text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        {last && (
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-zinc-200">{formatPrice(last.close, symbol)}</span>
            <span className={isPos ? 'text-emerald-400' : 'text-red-400'}>
              {isPos ? '+' : ''}{totalReturn.toFixed(2)}%
            </span>
            <span className="text-zinc-600">Vol {(last.volume / 1e6).toFixed(1)}M</span>
            <span className="text-cyan-400/80">{period === '1D' ? 'live 5s' : period === '1W' ? 'live 10s' : period === '1M' ? 'live 15s' : 'static'}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] font-mono text-amber-300">
          {error}
        </div>
      )}

      <div ref={containerRef} className="relative w-full overflow-hidden" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded bg-zinc-950/65">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {!chart ? (
          <div className="flex items-center justify-center rounded-lg border border-zinc-800/70 bg-zinc-950/40 text-sm text-zinc-600" style={{ height }}>
            {usedFallback ? 'Rendering fallback data...' : 'Loading chart...'}
          </div>
        ) : (
          <div className="relative rounded-lg border border-zinc-800/70 bg-zinc-950/35 overflow-hidden" style={{ height }}>
            <ChartTooltip point={activePoint} symbol={symbol} />
            <svg width={width} height={height} className="block">
              {chart.yTicks.map((tick) => (
                <g key={tick.y}>
                  <line x1={chart.padding.left} x2={width - chart.padding.right} y1={tick.y} y2={tick.y} stroke="#27272a" strokeWidth="1" />
                  <text x={width - chart.padding.right - 4} y={tick.y - 4} textAnchor="end" fill="#52525b" fontSize="10" fontFamily="JetBrains Mono">
                    {formatPrice(tick.value, symbol)}
                  </text>
                </g>
              ))}

              {chart.points.map((point, index) => {
                const bodyTop = Math.min(point.openY, point.closeY);
                const bodyHeight = Math.max(2, Math.abs(point.openY - point.closeY));
                const fill = point.bullish ? '#34d399' : '#f87171';
                const volumeFill = point.bullish ? 'rgba(52, 211, 153, 0.28)' : 'rgba(248, 113, 113, 0.28)';
                return (
                  <g key={`${point.time}-${index}`} onMouseEnter={() => setHoverIndex(index)} onMouseLeave={() => setHoverIndex(null)}>
                    <line x1={point.x} x2={point.x} y1={point.highY} y2={point.lowY} stroke={fill} strokeWidth="1.4" />
                    <rect
                      x={point.x - chart.candleWidth / 2}
                      y={bodyTop}
                      width={chart.candleWidth}
                      height={bodyHeight}
                      rx="1.5"
                      fill={fill}
                    />
                    <rect
                      x={point.x - Math.max(2, chart.candleWidth * 0.42)}
                      y={chart.volumeTop + chart.volumeHeight - point.volumeBarHeight}
                      width={Math.max(4, chart.candleWidth * 0.84)}
                      height={Math.max(2, point.volumeBarHeight)}
                      fill={volumeFill}
                    />
                  </g>
                );
              })}

              {chart.xTicks.map((tick, i) => {
                const point = chart.points.find((item) => item.time === tick.time);
                if (!point) return null;
                const isFirst = i === 0;
                const isLast = i === chart.xTicks.length - 1;
                return (
                  <text
                    key={tick.time}
                    x={isFirst ? point.x + 4 : isLast ? point.x - 4 : point.x}
                    y={height - 6}
                    textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
                    fill="#52525b"
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                  >
                    {tick.label}
                  </text>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {last && (
        <div className="grid grid-cols-4 gap-3 pt-2 border-t border-zinc-800 font-mono text-xs">
          {[
            { label: 'O', value: last.open.toFixed(2), color: 'text-zinc-300' },
            { label: 'H', value: last.high.toFixed(2), color: 'text-emerald-400' },
            { label: 'L', value: last.low.toFixed(2), color: 'text-red-400' },
            { label: 'C', value: last.close.toFixed(2), color: 'text-zinc-100' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <span className="text-zinc-600">{label} </span>
              <span className={color}>{formatPrice(value, symbol)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
