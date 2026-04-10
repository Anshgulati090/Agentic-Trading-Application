import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, BROKERS } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSignalStream } from '../hooks/useSignalStream';
import { WS_STATUS } from '../services/websocket';
import CandlestickChart from '../components/CandlestickChart';
import TradingViewChart from '../components/TradingViewChart';
import { safeArray } from '../utils/safeApi';
import { formatPrice, formatBigNumbers } from '../utils/format';
import { useBinanceLive } from '../hooks/useBinanceLive';

/* ─── helpers ────────────────────────────────────────────── */
const fmt = (v, decimals = 2) => (v == null ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
const fmtVol = (v) => {
  if (v == null) return '—';
  const n = Number(v);
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
};

function SignalBadge({ signal }) {
  if (!signal) return null;
  const cls = { BUY: 'badge-buy', SELL: 'badge-sell', HOLD: 'badge-hold', REJECTED: 'badge-hold' };
  return <span className={cls[signal] || 'badge-hold'}>{signal}</span>;
}

function StatRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(0,183,255,0.06)' }}>
      <span style={{ fontSize: 11, color: '#4d7a96', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: valueColor || '#e8f4ff', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function DemoTradePanel({ symbol, currentPrice }) {
  const { isAuthenticated } = useAuth();
  const [action, setAction] = useState('BUY');
  const [quantity, setQuantity] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const total = (Number(quantity) || 0) * (currentPrice || 0);

  const execute = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const resp = await api.executeDemoTrade({ symbol, action, quantity: Number(quantity), price: currentPrice });
      setResult(resp);
    } catch (err) {
      setError(err?.message || 'Unable to place trade');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div style={{ fontSize: 13, color: '#4d7a96', marginBottom: 16 }}>Sign in to place demo trades on {symbol}</div>
        <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>Sign In</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* BUY / SELL toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {['BUY', 'SELL'].map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => setAction(side)}
            style={{
              padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', transition: 'all 0.2s',
              background: action === side
                ? side === 'BUY'
                  ? 'linear-gradient(135deg, #004422, #007744)'
                  : 'linear-gradient(135deg, #440011, #880022)'
                : 'rgba(0,183,255,0.04)',
              color: action === side
                ? side === 'BUY' ? '#00e676' : '#ff3d57'
                : '#4d7a96',
              boxShadow: action === side && side === 'BUY' ? '0 2px 16px rgba(0,230,118,0.2)' :
                         action === side && side === 'SELL' ? '0 2px 16px rgba(255,61,87,0.2)' : 'none',
            }}
          >
            {side}
          </button>
        ))}
      </div>

      {/* Quantity */}
      <div>
        <div style={{ fontSize: 10, color: '#3d607a', textTransform: 'uppercase', letterSpacing: '0.25em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>Quantity</div>
        <input
          type="number" min="0.001" step="1" value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="input"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600 }}
        />
      </div>

      {/* Order Preview */}
      <div style={{
        background: 'rgba(0,183,255,0.04)', border: '1px solid rgba(0,183,255,0.1)',
        borderRadius: 8, padding: '12px 14px',
      }}>
        {[
          { label: 'Side', value: action, color: action === 'BUY' ? '#00e676' : '#ff3d57' },
          { label: 'Price', value: formatPrice(currentPrice, symbol) },
          { label: 'Est. Total', value: total > 0 ? formatPrice(total, symbol) : '—' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ fontSize: 11, color: '#4d7a96' }}>{label}</span>
            <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: color || '#e8f4ff', fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(255,61,87,0.08)', border: '1px solid rgba(255,61,87,0.2)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#ff3d57' }}>
          ⚠ {error}
        </div>
      )}
      {result && (
        <div style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#00e676' }}>
          ✓ Order filled · Balance: {formatPrice(result.new_balance, symbol)}
        </div>
      )}

      <button
        type="button" onClick={execute}
        disabled={loading || !currentPrice || !Number(quantity)}
        style={{
          padding: '12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontWeight: 700, fontSize: 14, letterSpacing: '0.06em', transition: 'all 0.2s',
          background: action === 'BUY'
            ? 'linear-gradient(135deg, #006633, #009950)'
            : 'linear-gradient(135deg, #660022, #990033)',
          color: action === 'BUY' ? '#00e676' : '#ff3d57',
          boxShadow: action === 'BUY' ? '0 4px 20px rgba(0,230,118,0.2)' : '0 4px 20px rgba(255,61,87,0.2)',
          opacity: (loading || !currentPrice || !Number(quantity)) ? 0.4 : 1,
        }}
      >
        {loading ? 'Executing...' : `${action} ${quantity || '0'} ${symbol}`}
      </button>
    </div>
  );
}

export default function MarketDetail() {
  const { symbol } = useParams();
  const activeSymbol = (symbol || 'AAPL').toUpperCase();
  const [priceData, setPriceData] = useState(null);
  const [info, setInfo] = useState(null);
  const [technicals, setTechnicals] = useState(null);
  const [loading, setLoading] = useState(true);
  // Default to simple candles — loads instantly. User can switch to TradingView Pro.
  const [chartType, setChartType] = useState(() => localStorage.getItem('chartType') || 'simple');
  const { messages, status } = useSignalStream(activeSymbol, 20);
  
  // High-performance Binance WebSocket Engine hook
  const { trade, kline } = useBinanceLive(activeSymbol);

  const loadQuoteRef = useRef(null);
  const loadPrice = useCallback(async () => {
    const payload = await api.getMarketPrice(activeSymbol).catch(() => null);
    if (payload) setPriceData(payload?.data || payload);
    setLoading(false);
  }, [activeSymbol]);

  useEffect(() => { loadQuoteRef.current = loadPrice; }, [loadPrice]);

  useEffect(() => {
    setPriceData(null); setInfo(null); setLoading(true);
    loadQuoteRef.current?.();
  }, [activeSymbol]);

  useEffect(() => {
    api.getSymbolInfo(activeSymbol).then((p) => setInfo(p?.data || p)).catch(() => {});
    // Load technicals (real RSI/SMA data)
    api.getTechnicals(activeSymbol).then((p) => setTechnicals(p?.data || p)).catch(() => {});
  }, [activeSymbol]);

  useEffect(() => {
    const h = (e) => setChartType(e.detail.chartType);
    window.addEventListener('chartTypeChange', h);
    return () => window.removeEventListener('chartTypeChange', h);
  }, []);

  // Merge live trade ticks over REST baseline
  const price = trade ? trade.price : priceData?.price;
  let change = priceData?.change;
  let changePct = priceData?.change_pct;
  
  if (trade && priceData?.prev_close) {
      change = trade.price - priceData.prev_close;
      changePct = change / priceData.prev_close;
  }

  const positive = (change ?? 0) >= 0;
  const latestSignal = messages[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(10, 21, 32, 0.8)',
        border: '1px solid rgba(0,183,255,0.12)',
        borderRadius: 14,
        padding: '18px 24px',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 24,
        alignItems: 'center',
        boxShadow: '0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,212,255,0.06)',
      }}>
        {/* Left: Symbol + Price */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ font: '700 32px/1 "JetBrains Mono", monospace', color: '#e8f4ff', margin: 0, letterSpacing: '-0.02em' }}>
                {activeSymbol}
              </h1>
              {latestSignal?.signal && <SignalBadge signal={latestSignal.signal} />}
            </div>
            <div style={{ fontSize: 12, color: '#4d7a96' }}>{info?.name || '—'}</div>
          </div>

          <div>
            {loading && !priceData ? (
              <div className="skeleton" style={{ width: 140, height: 44 }} />
            ) : (
              <>
                <div style={{
                  font: `700 40px/1 "JetBrains Mono", monospace`,
                  color: positive ? '#00e676' : '#ff3d57',
                  letterSpacing: '-0.03em',
                  textShadow: positive ? '0 0 20px rgba(0,230,118,0.3)' : '0 0 20px rgba(255,61,87,0.3)',
                }}>
                  {formatPrice(price, activeSymbol)}
                </div>
                <div style={{ font: '500 13px "JetBrains Mono", monospace', color: positive ? '#00e676' : '#ff3d57', marginTop: 4 }}>
                  {change != null
                    ? `${positive ? '+' : ''}${fmt(change, 2)} (${positive ? '+' : ''}${((changePct ?? 0) * 100).toFixed(2)}%)`
                    : 'Loading quote...'}
                </div>
              </>
            )}
          </div>

          {/* OHLV stats */}
          {priceData && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'OPEN',   value: formatPrice(priceData.open, activeSymbol) },
                { label: 'HIGH',   value: formatPrice(priceData.high, activeSymbol) },
                { label: 'LOW',    value: formatPrice(priceData.low, activeSymbol) },
                { label: 'VOL',    value: fmtVol(priceData.volume) },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: 'rgba(0,183,255,0.04)', border: '1px solid rgba(0,183,255,0.1)',
                  borderRadius: 8, padding: '6px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 9, color: '#3d607a', letterSpacing: '0.2em', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 14, fontFamily: 'JetBrains Mono, monospace', color: '#e8f4ff', fontWeight: 600, marginTop: 3 }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Signal snapshot */}
        <div style={{
          minWidth: 260, background: 'rgba(0,183,255,0.04)',
          border: '1px solid rgba(0,183,255,0.12)', borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 9, color: '#3d607a', textTransform: 'uppercase', letterSpacing: '0.25em', fontFamily: 'JetBrains Mono, monospace' }}>Signal Snapshot</span>
            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: status === WS_STATUS.CONNECTED ? '#00e676' : '#3d607a' }}>
              {status === WS_STATUS.CONNECTED ? '● LIVE' : '○ RECONNECTING'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#4d7a96', marginBottom: 8 }}>Latest agent action</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {latestSignal?.signal ? <SignalBadge signal={latestSignal.signal} /> : <span style={{ fontSize: 12, color: '#3d607a' }}>No signal yet</span>}
          </div>
          <div style={{ fontSize: 12, color: '#4d7a96', lineHeight: 1.6, marginBottom: 12 }}>
            {latestSignal?.explanation || 'Waiting for signal engine...'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Link to="/dashboard" className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', padding: '7px', fontSize: 12 }}>Dashboard</Link>
            <Link to="/agents" className="btn-ghost" style={{ textDecoration: 'none', textAlign: 'center' }}>Agents</Link>
          </div>
        </div>
      </div>

      {/* ── Main 2-col grid ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

        {/* Left: Chart + signals + stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* Chart type selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['tradingview', '📊 TradingView Pro'], ['legacy', '🕯 Simple Candles']].map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setChartType(type); localStorage.setItem('chartType', type); }}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer', transition: 'all 0.2s',
                    letterSpacing: '0.05em', border: '1px solid',
                    ...(chartType === type
                      ? { background: 'rgba(0,212,255,0.1)', borderColor: 'rgba(0,212,255,0.3)', color: '#00d4ff' }
                      : { background: 'transparent', borderColor: 'rgba(0,183,255,0.1)', color: '#3d607a' }),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {chartType === 'tradingview' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#00e676', fontFamily: 'JetBrains Mono, monospace' }}>
                <span className="live-dot" />
                Professional Charting Active
              </div>
            )}
          </div>

          {/* Chart panel */}
          <div className="panel" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: '#3d607a', textTransform: 'uppercase', letterSpacing: '0.25em', fontFamily: 'JetBrains Mono, monospace' }}>PRICE CHART · {activeSymbol}</span>
              <span style={{ fontSize: 10, color: '#3d607a', fontFamily: 'JetBrains Mono, monospace' }}>
                {chartType === 'tradingview' ? 'ADVANCED TECHNICAL ANALYSIS' : 'SIMPLE CANDLESTICK'}
              </span>
            </div>
            {chartType === 'tradingview'
              ? <TradingViewChart symbol={activeSymbol} height={520} theme="dark" interval="D" />
              : <CandlestickChart symbol={activeSymbol} height={400} liveKline={kline} />
            }
          </div>

          {/* Stats + signal feed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Fundamentals */}
            <div className="panel" style={{ padding: '16px 18px' }}>
              <div className="panel-title">Company & Market Stats</div>
              {[
                { label: 'Sector',      value: info?.sector || '—' },
                { label: 'Industry',    value: info?.industry || '—' },
                { label: 'Market Cap',  value: formatBigNumbers(info?.market_cap, activeSymbol) },
                { label: 'P/E Ratio',   value: info?.pe_ratio ? fmt(info.pe_ratio, 2) : '—' },
                { label: 'EPS',         value: info?.eps ? formatPrice(info.eps, activeSymbol) : '—' },
                { label: '52W High',    value: formatPrice(info?.['52w_high'], activeSymbol), valueColor: '#00e676' },
                { label: '52W Low',     value: formatPrice(info?.['52w_low'], activeSymbol),  valueColor: '#ff3d57' },
                { label: 'Avg Volume',  value: fmtVol(info?.avg_volume) },
              ].map((r) => <StatRow key={r.label} {...r} />)}
              {info?.description && (
                <div style={{ marginTop: 12, fontSize: 11, color: '#4d7a96', lineHeight: 1.7, padding: '10px', background: 'rgba(0,183,255,0.03)', borderRadius: 6 }}>
                  {info.description}
                </div>
              )}
            </div>

            {/* Live signal feed */}
            <div className="panel" style={{ padding: '16px 18px' }}>
              <div className="panel-title">
                <span>Live Signal Feed</span>
                {status === WS_STATUS.CONNECTED && <span className="live-dot" />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
                {safeArray(messages).length ? safeArray(messages).map((msg, i) => (
                  <div key={i} style={{
                    background: 'rgba(0,183,255,0.03)', border: '1px solid rgba(0,183,255,0.08)',
                    borderRadius: 8, padding: '10px 12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: '#3d607a', fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(msg._ts).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                      {msg.signal && <SignalBadge signal={msg.signal} />}
                      {msg.confidence != null && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#4d7a96' }}>
                          {(msg.confidence * 100).toFixed(0)}% conf.
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#7a9ab5', lineHeight: 1.6 }}>
                      {msg.explanation || 'Agent update received.'}
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '2rem', fontSize: 12, color: '#3d607a' }}>
                    Connecting signal stream for {activeSymbol}...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Demo Trade */}
          <div className="panel" style={{ padding: '16px 18px' }}>
            <div className="panel-title">
              <span>Demo Trade</span>
              <span style={{ fontSize: 9, color: '#3d607a', fontFamily: 'JetBrains Mono, monospace' }}>PAPER ONLY</span>
            </div>
            <DemoTradePanel symbol={activeSymbol} currentPrice={price} />
          </div>

          {/* Technical view — REAL RSI/SMA data */}
          <div className="panel" style={{ padding: '16px 18px' }}>
            <div className="panel-title">Technical View
              {technicals && <span style={{ marginLeft: 8, fontSize: 9, color: '#3d607a', fontFamily: 'JetBrains Mono,monospace' }}>RSI-14 · SMA</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {technicals ? (
                <>
                  <StatRow label="Trend Bias"
                    value={technicals.trend_bias || '—'}
                    valueColor={
                      technicals.trend_bias?.includes('Bullish') ? '#00e676' :
                      technicals.trend_bias?.includes('Bearish') ? '#ff3d57' : '#7a9ab5'
                    }
                  />
                  <StatRow label="Signal"
                    value={technicals.signal_state || '—'}
                    valueColor={
                      technicals.signal_state === 'BUY' ? '#00e676' :
                      technicals.signal_state === 'SELL' ? '#ff3d57' : '#7a9ab5'
                    }
                  />
                  <StatRow label="RSI-14"
                    value={technicals.rsi_14 != null ? technicals.rsi_14.toFixed(1) : '—'}
                    valueColor={
                      technicals.rsi_14 >= 65 ? '#ff3d57' :
                      technicals.rsi_14 <= 35 ? '#00e676' : '#e8f4ff'
                    }
                  />
                  <StatRow label="SMA-20"    value={technicals.sma_20 != null ? formatPrice(technicals.sma_20, activeSymbol) : '—'} />
                  <StatRow label="SMA-50"    value={technicals.sma_50 != null ? formatPrice(technicals.sma_50, activeSymbol) : '—'} />
                  <StatRow label="Support"   value={formatPrice(technicals.support, activeSymbol)}  valueColor="#00e676" />
                  <StatRow label="Resistance" value={formatPrice(technicals.resistance, activeSymbol)} valueColor="#ff3d57" />
                  <StatRow label="Volatility" value={technicals.volatility_pct != null ? `${technicals.volatility_pct}%` : '—'} />
                </>
              ) : (
                // Fallback while loading — use today's price movement
                <>
                  <StatRow label="Trend Bias"   value={positive ? 'Day Bullish' : 'Day Bearish'} valueColor={positive ? '#00e676' : '#ff3d57'} />
                  <StatRow label="Signal State" value={latestSignal?.signal || 'Waiting'} />
                  <StatRow label="Session High" value={formatPrice(priceData?.high, activeSymbol)} valueColor="#00e676" />
                  <StatRow label="Session Low"  value={formatPrice(priceData?.low, activeSymbol)}  valueColor="#ff3d57" />
                  <StatRow label="Prev Close"   value={formatPrice(priceData?.prev_close, activeSymbol)} />
                  <div style={{ fontSize: 10, color: '#3d607a', fontFamily: 'JetBrains Mono,monospace', marginTop: 8 }}>Loading RSI/SMA indicators...</div>
                </>
              )}
            </div>
          </div>

          {/* Real broker redirect */}
          <div className="panel" style={{ padding: '16px 18px' }}>
            <div className="panel-title">Real Brokers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BROKERS.slice(0, 3).map((b) => (
                <a
                  key={b.name} href={b.url} target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 12px', borderRadius: 8,
                    background: 'rgba(0,183,255,0.03)', border: '1px solid rgba(0,183,255,0.08)',
                    textDecoration: 'none', transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,183,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(0,183,255,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,183,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(0,183,255,0.08)'; }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: '#e8f4ff', fontWeight: 500 }}>{b.name}</div>
                    <div style={{ fontSize: 10, color: '#4d7a96', marginTop: 1 }}>{b.description}</div>
                  </div>
                  <span style={{ fontSize: 12, color: '#00d4ff' }}>→</span>
                </a>
              ))}
            </div>
          </div>

          {/* Learn links */}
          <div className="panel" style={{ padding: '16px 18px' }}>
            <div className="panel-title">Learning Hub</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Momentum Trading', to: '/learn' },
                { label: 'Risk Management', to: '/learn' },
                { label: 'Signal Interpretation', to: '/learn' },
              ].map(({ label, to }) => (
                <Link key={label} to={to} style={{
                  padding: '8px 12px', borderRadius: 7,
                  background: 'rgba(0,183,255,0.03)', border: '1px solid rgba(0,183,255,0.07)',
                  textDecoration: 'none', fontSize: 12, color: '#7a9ab5',
                  display: 'flex', justifyContent: 'space-between',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#00d4ff'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#7a9ab5'; e.currentTarget.style.borderColor = 'rgba(0,183,255,0.07)'; }}
                >
                  {label}
                  <span>›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
