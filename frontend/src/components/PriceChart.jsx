import { useState, useMemo, useCallback, useEffect } from "react";
import { api, getMockPriceHistory } from "../services/api";
import { SYMBOLS } from "../data/marketCatalog";

const RANGES = [
  { label: "15M", points: 32 },
  { label: "1H", points: 48 },
  { label: "4H", points: 42 },
  { label: "1D", points: 78 },
  { label: "1W", points: 45 },
  { label: "1M", points: 30 },
  { label: "3M", points: 90 },
  { label: "1Y", points: 52 },
];

const CHART_TYPES = [
  { id: "candle", label: "Candles" },
  { id: "line", label: "Line" },
];

function fallbackPointLabel(rangeLabel, index) {
  if (rangeLabel === "15M") return `T-${(31 - index) * 15}m`;
  if (rangeLabel === "1H") return `H-${47 - index}`;
  if (rangeLabel === "4H") return `4H-${41 - index}`;
  if (rangeLabel === "1D") return `M${index + 1}`;
  if (rangeLabel === "1W") return `D${index + 1}`;
  return `P${index + 1}`;
}

function fallbackHistory(symbol, rangeLabel, points) {
  const dailyBase = getMockPriceHistory(symbol, Math.max(points, 60));
  return dailyBase.slice(-points).map((row, index) => ({
    ...row,
    date: row?.date ?? fallbackPointLabel(rangeLabel, index),
  }));
}

function normalizeCandles(rows, symbol, rangeLabel, points) {
  const fallback = fallbackHistory(symbol, rangeLabel, points);
  if (!Array.isArray(rows) || rows.length === 0) {
    return fallback;
  }

  const normalized = rows
    .map((row, index) => {
      const close = Number(row?.close ?? row?.price ?? 0);
      const open = Number(row?.open ?? close);
      const high = Number(row?.high ?? Math.max(open, close));
      const low = Number(row?.low ?? Math.min(open, close));
      if (!Number.isFinite(close) || close <= 0) return null;

      return {
        date: row?.date ?? fallback[Math.min(index, fallback.length - 1)]?.date ?? fallbackPointLabel(rangeLabel, index),
        timestamp: row?.timestamp ?? Date.now() - (rows.length - index) * 3600000,
        open,
        high,
        low,
        close,
        volume: Number(row?.volume ?? 0),
      };
    })
    .filter(Boolean);

  return normalized.length > 1 ? normalized.slice(-points) : fallback;
}

export default function PriceChart({
  defaultSymbol = "AAPL",
  compact = false,
  lockSymbol = false,
  defaultRange = "1D",
}) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [rangeLabel, setRangeLabel] = useState(defaultRange);
  const [chartType, setChartType] = useState("candle");
  const [hover, setHover] = useState(null);
  const [data, setData] = useState(() => fallbackHistory(defaultSymbol, defaultRange, 78));
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const range = useMemo(
    () => RANGES.find((item) => item.label === rangeLabel) ?? RANGES[3],
    [rangeLabel]
  );

  useEffect(() => {
    setSymbol(defaultSymbol);
    setData(fallbackHistory(defaultSymbol, rangeLabel, range.points));
    setLastUpdated(null);
    setHover(null);
  }, [defaultSymbol]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await api.getMarketPrice(symbol, range.label).catch(() => null);
      setData(normalizeCandles(raw?.history, symbol, range.label, range.points));
      setLastUpdated(raw?.timestamp ?? new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, [symbol, range]);

  useEffect(() => {
    setData(fallbackHistory(symbol, range.label, range.points));
    setHover(null);
  }, [symbol, range.label, range.points]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadData();
    }, 20000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const candles = useMemo(
    () => normalizeCandles(data, symbol, range.label, range.points),
    [data, symbol, range]
  );

  const W = 760;
  const H = compact ? 180 : 300;
  const PAD = { top: 14, right: 16, bottom: 30, left: 62 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const { minP, maxP } = useMemo(() => {
    if (!candles.length) return { minP: 0, maxP: 1 };
    const lows = candles.map((c) => c.low ?? c.close);
    const highs = candles.map((c) => c.high ?? c.close);
    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);
    const pad = (maxPrice - minPrice || 1) * 0.06;
    return { minP: minPrice - pad, maxP: maxPrice + pad };
  }, [candles]);

  const pRange = maxP - minP || 1;
  const toY = (price) => PAD.top + chartH * (1 - (price - minP) / pRange);
  const toX = (i) => PAD.left + (i / (candles.length - 1 || 1)) * chartW;
  const candleW = Math.max(1, (chartW / (candles.length || 1)) * 0.55);

  const xTickIdxs = candles.length <= 8
    ? candles.map((_, i) => i)
    : [0, Math.floor(candles.length * 0.25), Math.floor(candles.length * 0.5), Math.floor(candles.length * 0.75), candles.length - 1];

  const isUp = (c) => c.close >= c.open;
  const lastClose = candles[candles.length - 1]?.close;
  const firstClose = candles[0]?.close;
  const totalReturn = lastClose && firstClose ? ((lastClose - firstClose) / firstClose) * 100 : 0;
  const isProfit = totalReturn >= 0;
  const lineColor = isProfit ? "#34d399" : "#f87171";
  const linePath = candles.map((c, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(c.close).toFixed(1)}`).join(" ");
  const areaPath = candles.length > 1
    ? `${linePath} L${toX(candles.length - 1).toFixed(1)},${(PAD.top + chartH).toFixed(1)} L${PAD.left},${(PAD.top + chartH).toFixed(1)} Z`
    : "";
  const hoverCandle = hover != null ? candles[hover] : null;
  const activePrice = hoverCandle?.close ?? lastClose ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {!lockSymbol && (
            <select
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono px-2 py-1 rounded focus:outline-none focus:border-cyan-500"
            >
              {SYMBOLS.map((item) => <option key={item}>{item}</option>)}
            </select>
          )}
          <div className="flex gap-0.5">
            {CHART_TYPES.map((item) => (
              <button
                key={item.id}
                onClick={() => setChartType(item.id)}
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-colors ${chartType === item.id ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/5" : "border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 flex-wrap">
            {RANGES.map((item) => (
              <button
                key={item.label}
                onClick={() => setRangeLabel(item.label)}
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-colors ${range.label === item.label ? "border-zinc-600 text-zinc-300 bg-zinc-800/80" : "border-transparent text-zinc-600 hover:text-zinc-400"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs flex-wrap justify-end">
          {loading && <span className="text-zinc-500">Refreshing...</span>}
          <span className="text-zinc-200 text-sm">${Number(activePrice).toFixed(symbol === "BTC" || symbol === "ETH" ? 0 : 2)}</span>
          <span className={isProfit ? "text-emerald-400" : "text-red-400"}>
            {isProfit ? "+" : ""}{totalReturn.toFixed(2)}%
          </span>
          <span className="text-zinc-500">View {range.label}</span>
          {lastUpdated && (
            <span className="text-zinc-600">
              Updated {new Date(lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      <div className="relative rounded-xl border border-zinc-800 bg-zinc-950/50 p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ height: H }} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`lineGrad-${symbol}-${range.label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {Array.from({ length: 5 }, (_, i) => {
            const frac = i / 4;
            const price = maxP - frac * pRange;
            const y = PAD.top + frac * chartH;
            return (
              <g key={i}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#27272a" strokeWidth="1" />
                <text x={PAD.left - 6} y={y + 4} textAnchor="end" fill="#52525b" fontSize="9" fontFamily="monospace">
                  ${price.toFixed(symbol === "BTC" || symbol === "ETH" ? 0 : 2)}
                </text>
              </g>
            );
          })}

          {xTickIdxs.map((idx) => candles[idx] ? (
            <text key={idx} x={toX(idx)} y={H - 6} textAnchor="middle" fill="#52525b" fontSize="9" fontFamily="monospace">
              {candles[idx].date}
            </text>
          ) : null)}

          {chartType === "line" ? (
            <>
              <path d={areaPath} fill={`url(#lineGrad-${symbol}-${range.label})`} />
              <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            </>
          ) : (
            candles.map((c, i) => {
              const color = isUp(c) ? "#34d399" : "#f87171";
              const bodyTop = toY(Math.max(c.open, c.close));
              const bodyBottom = toY(Math.min(c.open, c.close));
              const bodyHeight = Math.max(1, bodyBottom - bodyTop);
              const cx = toX(i);

              return (
                <g key={i}>
                  <line x1={cx} y1={toY(c.high ?? c.close)} x2={cx} y2={toY(c.low ?? c.close)} stroke={color} strokeWidth="1" opacity="0.7" />
                  <rect x={cx - candleW / 2} y={bodyTop} width={candleW} height={bodyHeight} fill={color} opacity={hover === i ? 1 : 0.78} rx="0.5" />
                </g>
              );
            })
          )}

          {hover != null && candles[hover] && (
            <line x1={toX(hover)} y1={PAD.top} x2={toX(hover)} y2={PAD.top + chartH} stroke="#52525b" strokeWidth="1" strokeDasharray="3,3" />
          )}

          {candles.map((_, i) => (
            <rect
              key={`target-${i}`}
              x={toX(i) - chartW / Math.max(candles.length, 1) / 2}
              y={PAD.top}
              width={chartW / Math.max(candles.length, 1)}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      </div>

      {hoverCandle && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-zinc-400">Open <span className="text-zinc-100 ml-2">${hoverCandle.open?.toFixed(2)}</span></div>
          <div className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-zinc-400">High <span className="text-emerald-400 ml-2">${hoverCandle.high?.toFixed(2)}</span></div>
          <div className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-zinc-400">Low <span className="text-red-400 ml-2">${hoverCandle.low?.toFixed(2)}</span></div>
          <div className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-zinc-400">Close <span className="text-zinc-100 ml-2">${hoverCandle.close?.toFixed(2)}</span></div>
          <div className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-zinc-400">Volume <span className="text-zinc-100 ml-2">{Number(hoverCandle.volume ?? 0).toLocaleString()}</span></div>
        </div>
      )}

      {candles.some((c) => c.volume) && (
        <div className="flex gap-px h-10 items-end">
          {candles.map((c, i) => {
            const volumes = candles.map((x) => x.volume || 0);
            const maxVolume = Math.max(...volumes) || 1;
            const pct = ((c.volume || 0) / maxVolume) * 100;
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm ${isUp(c) ? "bg-emerald-400/30" : "bg-red-400/30"} ${hover === i ? "opacity-100" : "opacity-60"}`}
                style={{ height: `${Math.max(6, pct)}%` }}
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
