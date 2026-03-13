import { useState, useMemo, useCallback, useEffect } from 'react';
import { api, SYMBOLS, getMockPriceHistory } from '../services/api';

const RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 60 },
];

const CHART_TYPES = [
  { id: 'candle', label: 'Candles' },
  { id: 'line',   label: 'Line' },
];

export default function PriceChart({ defaultSymbol = 'AAPL' }) {
  const [symbol,    setSymbol]    = useState(defaultSymbol);
  const [range,     setRange]     = useState(RANGES[1]);
  const [chartType, setChartType] = useState('candle');
  const [hover,     setHover]     = useState(null);
  const [data,      setData]      = useState([]);

  // Fetch real market data or fall back to deterministic mock
  const loadData = useCallback(async () => {
    // Try REST endpoint first; fall back to generated mock
    const raw = await api.getMarketPrice(symbol).catch(() => null);
    // Real API might return full OHLCV array or just latest price
    if (Array.isArray(raw?.history)) {
      setData(raw.history.slice(-range.days));
    } else {
      setData(getMockPriceHistory(symbol, range.days));
    }
  }, [symbol, range.days]);

  useEffect(() => { loadData(); }, [loadData]);

  const candles = data.slice(-range.days);

  // --- SVG geometry ---
  const W = 700, H = 200;
  const PAD = { top: 12, right: 16, bottom: 28, left: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const { minP, maxP } = useMemo(() => {
    if (!candles.length) return { minP: 0, maxP: 1 };
    const lows  = candles.map((c) => c.low  ?? c.close);
    const highs = candles.map((c) => c.high ?? c.close);
    const minP = Math.min(...lows);
    const maxP = Math.max(...highs);
    const pad  = (maxP - minP) * 0.06;
    return { minP: minP - pad, maxP: maxP + pad };
  }, [candles]);

  const pRange = maxP - minP || 1;
  const toY = (price) => PAD.top + chartH * (1 - (price - minP) / pRange);
  const toX = (i)     => PAD.left + (i / (candles.length - 1 || 1)) * chartW;

  const candleW = Math.max(1, (chartW / (candles.length || 1)) * 0.55);

  // Tick marks
  const yTicks = 4;
  const xTickIdxs = candles.length <= 8
    ? candles.map((_, i) => i)
    : [0, Math.floor(candles.length * 0.25), Math.floor(candles.length * 0.5), Math.floor(candles.length * 0.75), candles.length - 1];

  const isUp      = (c) => c.close >= c.open;
  const lastClose = candles[candles.length - 1]?.close;
  const firstClose= candles[0]?.close;
  const totalReturn = lastClose && firstClose ? ((lastClose - firstClose) / firstClose * 100) : 0;
  const isProfit  = totalReturn >= 0;
  const lineColor = isProfit ? '#34d399' : '#f87171';

  // Line path
  const linePath = candles.map((c, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(c.close).toFixed(1)}`).join(' ');
  const areaPath = candles.length > 1
    ? `${linePath} L${toX(candles.length - 1).toFixed(1)},${(PAD.top + chartH).toFixed(1)} L${PAD.left},${(PAD.top + chartH).toFixed(1)} Z`
    : '';

  const hoverCandle = hover != null ? candles[hover] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono px-2 py-1 rounded focus:outline-none focus:border-cyan-500"
          >
            {SYMBOLS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="flex gap-0.5">
            {CHART_TYPES.map((t) => (
              <button key={t.id} onClick={() => setChartType(t.id)}
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-colors ${chartType === t.id ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/5' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5">
            {RANGES.map((r) => (
              <button key={r.label} onClick={() => setRange(r)}
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-colors ${range.label === r.label ? 'border-zinc-600 text-zinc-300' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {hoverCandle ? (
            <>
              <span className="text-zinc-500">O <span className="text-zinc-300">${hoverCandle.open?.toFixed(2)}</span></span>
              <span className="text-zinc-500">H <span className="text-emerald-400">${hoverCandle.high?.toFixed(2)}</span></span>
              <span className="text-zinc-500">L <span className="text-red-400">${hoverCandle.low?.toFixed(2)}</span></span>
              <span className="text-zinc-500">C <span className="text-zinc-100">${hoverCandle.close?.toFixed(2)}</span></span>
            </>
          ) : (
            <>
              {lastClose && <span className="text-zinc-200 text-sm">${lastClose.toFixed(2)}</span>}
              <span className={isProfit ? 'text-emerald-400' : 'text-red-400'}>
                {isProfit ? '+' : ''}{totalReturn.toFixed(2)}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full select-none"
          style={{ height: H }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`lineGrad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={lineColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y grid + labels */}
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const frac  = i / yTicks;
            const price = maxP - frac * pRange;
            const y     = PAD.top + frac * chartH;
            return (
              <g key={i}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#27272a" strokeWidth="1" />
                <text x={PAD.left - 6} y={y + 4} textAnchor="end" fill="#52525b" fontSize="9" fontFamily="monospace">
                  ${price.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* X labels */}
          {xTickIdxs.map((idx) => {
            if (!candles[idx]) return null;
            return (
              <text key={idx} x={toX(idx)} y={H - 6} textAnchor="middle" fill="#52525b" fontSize="9" fontFamily="monospace">
                {candles[idx].date}
              </text>
            );
          })}

          {/* Chart body */}
          {chartType === 'line' ? (
            <>
              <path d={areaPath} fill={`url(#lineGrad-${symbol})`} />
              <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            </>
          ) : (
            candles.map((c, i) => {
              const up   = isUp(c);
              const col  = up ? '#34d399' : '#f87171';
              const bodyTop  = toY(Math.max(c.open, c.close));
              const bodyBot  = toY(Math.min(c.open, c.close));
              const bodyH    = Math.max(1, bodyBot - bodyTop);
              const cx       = toX(i);
              return (
                <g key={i}>
                  {/* Wick */}
                  <line x1={cx} y1={toY(c.high ?? c.close)} x2={cx} y2={toY(c.low ?? c.close)} stroke={col} strokeWidth="1" opacity="0.7" />
                  {/* Body */}
                  <rect
                    x={cx - candleW / 2}
                    y={bodyTop}
                    width={candleW}
                    height={bodyH}
                    fill={up ? col : col}
                    opacity={hover === i ? 1 : 0.75}
                    rx="0.5"
                  />
                </g>
              );
            })
          )}

          {/* Hover line */}
          {hover != null && candles[hover] && (
            <line
              x1={toX(hover)} y1={PAD.top}
              x2={toX(hover)} y2={PAD.top + chartH}
              stroke="#52525b" strokeWidth="1" strokeDasharray="3,3"
            />
          )}

          {/* Invisible hover targets */}
          {candles.map((_, i) => (
            <rect
              key={`ht-${i}`}
              x={toX(i) - chartW / candles.length / 2}
              y={PAD.top}
              width={chartW / candles.length}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      </div>

      {/* Volume bar row */}
      {candles.some((c) => c.volume) && (
        <div className="flex gap-px h-6 items-end">
          {candles.map((c, i) => {
            const vols = candles.map((x) => x.volume || 0);
            const maxV = Math.max(...vols) || 1;
            const pct  = ((c.volume || 0) / maxV) * 100;
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-opacity ${isUp(c) ? 'bg-emerald-400/30' : 'bg-red-400/30'} ${hover === i ? 'opacity-100' : 'opacity-60'}`}
                style={{ height: `${Math.max(4, pct)}%` }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
