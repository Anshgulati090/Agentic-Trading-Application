import { useEffect, useRef, useState, useCallback } from 'react';
import { api, getMockPriceHistory } from '../services/api';

const PERIODS = ['1D', '1W', '1M', '3M', '1Y'];

export default function CandlestickChart({ symbol = 'AAPL', height = 320 }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volSeriesRef = useRef(null);
  const [period, setPeriod] = useState('1M');
  const [loading, setLoading] = useState(true);
  const [ohlcv, setOhlcv] = useState(null);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOHLCV(symbol, period);
      if (res?.data?.length) {
        setOhlcv(res.data);
      } else {
        // fallback to mock
        const days = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365 }[period] || 30;
        setOhlcv(getMockPriceHistory(symbol, days));
      }
    } catch {
      const days = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365 }[period] || 30;
      setOhlcv(getMockPriceHistory(symbol, days));
    } finally {
      setLoading(false);
    }
  }, [symbol, period]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!containerRef.current || !ohlcv?.length) return;

    // Lazy-load lightweight-charts
    import('lightweight-charts').then(({ createChart, CrosshairMode }) => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height,
        layout: {
          background: { color: 'transparent' },
          textColor: '#71717a',
        },
        grid: {
          vertLines: { color: '#27272a' },
          horzLines: { color: '#27272a' },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: '#27272a',
          textColor: '#71717a',
        },
        timeScale: {
          borderColor: '#27272a',
          textColor: '#71717a',
          timeVisible: true,
        },
        handleScroll: true,
        handleScale: true,
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#34d399',
        downColor: '#f87171',
        borderUpColor: '#34d399',
        borderDownColor: '#f87171',
        wickUpColor: '#34d399',
        wickDownColor: '#f87171',
      });

      // Format data for lightweight-charts
      const candleData = ohlcv.map(d => ({
        time: d.time || Math.floor(new Date(d.date || d.timestamp).getTime() / 1000),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })).sort((a, b) => a.time - b.time);

      candleSeries.setData(candleData);

      // Volume histogram
      const volSeries = chart.addHistogramSeries({
        color: '#3f3f46',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      const volData = ohlcv
        .filter(d => d.volume)
        .map(d => ({
          time: d.time || Math.floor(new Date(d.date || d.timestamp).getTime() / 1000),
          value: d.volume,
          color: d.close >= d.open ? '#34d39926' : '#f8717126',
        }))
        .sort((a, b) => a.time - b.time);

      if (volData.length) volSeries.setData(volData);

      chart.timeScale().fitContent();
      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volSeriesRef.current = volSeries;

      // Resize observer
      const ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      ro.observe(containerRef.current);

      return () => ro.disconnect();
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [ohlcv, height]);

  const last = ohlcv?.[ohlcv.length - 1];
  const first = ohlcv?.[0];
  const totalReturn = last && first ? ((last.close - first.close) / first.close * 100) : 0;
  const isPos = totalReturn >= 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Controls bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border transition-colors ${
                period === p
                  ? 'border-zinc-600 text-zinc-200 bg-zinc-800'
                  : 'border-transparent text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        {last && (
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-zinc-200">${last.close?.toFixed(2)}</span>
            <span className={isPos ? 'text-emerald-400' : 'text-red-400'}>
              {isPos ? '+' : ''}{totalReturn.toFixed(2)}%
            </span>
            {last.volume && (
              <span className="text-zinc-600">Vol {(last.volume / 1e6).toFixed(1)}M</span>
            )}
          </div>
        )}
      </div>

      {/* Chart container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 rounded z-10">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}
        <div ref={containerRef} style={{ height }} />
      </div>

      {/* OHLC summary */}
      {last && (
        <div className="grid grid-cols-4 gap-3 pt-2 border-t border-zinc-800 font-mono text-xs">
          {[
            { label: 'O', value: last.open?.toFixed(2), color: 'text-zinc-300' },
            { label: 'H', value: last.high?.toFixed(2), color: 'text-emerald-400' },
            { label: 'L', value: last.low?.toFixed(2), color: 'text-red-400' },
            { label: 'C', value: last.close?.toFixed(2), color: 'text-zinc-100' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <span className="text-zinc-600">{label} </span>
              <span className={color}>${value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
