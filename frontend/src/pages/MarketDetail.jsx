import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, BROKERS } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSignalStream } from '../hooks/useSignalStream';
import { WS_STATUS } from '../services/websocket';
import CandlestickChart from '../components/CandlestickChart';

function SignalBadge({ signal }) {
  if (!signal) return null;
  const cls = { BUY: 'badge-buy', SELL: 'badge-sell', HOLD: 'badge-hold', REJECTED: 'badge-hold' };
  return <span className={cls[signal] || 'badge-hold'}>{signal}</span>;
}

function StatRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <span className="section-kicker">{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{value ?? '—'}</span>
    </div>
  );
}

function BrokerRedirect() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: open ? 10 : 0 }}>
        {open ? 'Hide Brokers' : 'Connect Real Broker'}
      </button>
      {open && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {BROKERS.map(broker => (
            <a key={broker.name} href={broker.url} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8, textDecoration: 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
            >
              <span style={{ fontSize: 20 }}>{broker.logo}</span>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{broker.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{broker.description}</div>
              </div>
              <svg style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      )}
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
      const res = await api.executeDemoTrade({ symbol, action, quantity: Number(quantity), price: currentPrice });
      setResult(res);
    } catch (err) { setError(err?.message || 'Trade failed'); }
    finally { setLoading(false); }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Sign in to place paper trades on {symbol}</div>
        <Link to="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* BUY / SELL toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {['BUY', 'SELL'].map(side => (
          <button key={side} onClick={() => setAction(side)} style={{
            padding: '10px',
            background: action === side
              ? (side === 'BUY' ? 'rgba(0,230,118,0.12)' : 'rgba(255,71,87,0.12)')
              : 'var(--bg-elevated)',
            border: `1px solid ${action === side
              ? (side === 'BUY' ? 'rgba(0,230,118,0.4)' : 'rgba(255,71,87,0.4)')
              : 'var(--border-subtle)'}`,
            borderRadius: 8, cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)',
            color: action === side
              ? (side === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)')
              : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>{side}</button>
        ))}
      </div>

      {/* Quantity */}
      <div>
        <label className="section-kicker" style={{ display: 'block', marginBottom: 6 }}>Quantity (shares)</label>
        <input
          type="number" min="0.001" step="1" value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="input"
        />
      </div>

      {/* Order Preview */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '12px' }}>
        <div className="section-kicker" style={{ marginBottom: 8 }}>Order Preview</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: 'Action', value: action, color: action === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)' },
            { label: 'Price', value: currentPrice ? `$${currentPrice.toFixed(2)}` : '—' },
            { label: 'Est. Total', value: `$${total.toFixed(2)}`, color: 'var(--text-primary)' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.label}</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: row.color || 'var(--text-secondary)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: 'var(--accent-red-dim)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: 6, fontSize: 12, color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}
      {result && (
        <div style={{ padding: '8px 12px', background: 'var(--accent-green-dim)', border: '1px solid rgba(0,230,118,0.25)', borderRadius: 6, fontSize: 12, color: 'var(--accent-green)' }}>
          ✓ Trade executed · Balance: ${Number(result.new_balance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>
      )}

      <button onClick={execute} disabled={loading || !currentPrice || !Number(quantity)}
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', opacity: (loading || !currentPrice || !Number(quantity)) ? 0.4 : 1 }}
      >
        {loading ? 'Executing…' : `Place ${action} Order`}
      </button>
    </div>
  );
}

export default function MarketDetail() {
  const { symbol } = useParams();
  const activeSymbol = (symbol || 'AAPL').toUpperCase();
  const [priceData, setPriceData] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const { messages, status } = useSignalStream(activeSymbol, 20);

  const loadQuote = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api.getMarketPrice(activeSymbol);
      setPriceData(payload?.data || payload);
    } catch { setPriceData(null); }
    finally { setLoading(false); }
  }, [activeSymbol]);

  useEffect(() => {
    setPriceData(null); setInfo(null);
    loadQuote();
    const timer = window.setInterval(loadQuote, 7000);
    return () => window.clearInterval(timer);
  }, [loadQuote]);

  useEffect(() => {
    api.getSymbolInfo(activeSymbol)
      .then(p => setInfo(p?.data || p))
      .catch(() => setInfo(null));
  }, [activeSymbol]);

  const price = priceData?.price;
  const change = priceData?.change;
  const changePct = priceData?.change_pct;
  const positive = (change ?? 0) >= 0;
  const latestSignal = messages[0];
  const isLive = status === WS_STATUS.CONNECTED;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div className="page-hero">
        <div className="hero-glow" />
        <div style={{ position: 'relative', padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>

            {/* Left: Symbol + price */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Link to="/markets" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>← Markets</Link>
                <span style={{ color: 'var(--border-default)' }}>/</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{activeSymbol}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: 32, fontWeight: 300, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                    {activeSymbol}
                  </h1>
                  {info?.name && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{info.name}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  {loading && !priceData ? (
                    <div className="skeleton" style={{ width: 120, height: 40 }} />
                  ) : (
                    <>
                      <span style={{ fontSize: 36, fontFamily: 'var(--font-mono)', fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                        {price != null ? `$${Number(price).toFixed(2)}` : '—'}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: positive ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 500 }}>
                          {change != null ? `${positive ? '+' : ''}${Number(change).toFixed(2)}` : ''}
                        </span>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: positive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {changePct != null ? `${positive ? '+' : ''}${(changePct * 100).toFixed(2)}%` : ''}
                        </span>
                      </div>
                    </>
                  )}
                  {latestSignal?.signal && <SignalBadge signal={latestSignal.signal} />}
                </div>
              </div>
            </div>

            {/* Right: OHLC chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {[
                { label: 'Open', value: priceData?.open != null ? `$${Number(priceData.open).toFixed(2)}` : null },
                { label: 'High', value: priceData?.high != null ? `$${Number(priceData.high).toFixed(2)}` : null, color: 'var(--accent-green)' },
                { label: 'Low', value: priceData?.low != null ? `$${Number(priceData.low).toFixed(2)}` : null, color: 'var(--accent-red)' },
                { label: 'Volume', value: priceData?.volume != null ? `${(Number(priceData.volume) / 1e6).toFixed(1)}M` : null },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                }}>
                  <div className="section-kicker" style={{ marginBottom: 3 }}>{s.label}</div>
                  {loading && !priceData ? (
                    <div className="skeleton" style={{ width: 52, height: 16 }} />
                  ) : (
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: s.color || 'var(--text-primary)', fontWeight: 400 }}>
                      {s.value || '—'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content: Chart + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Chart */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title">
              <span>Price Chart</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isLive && <><span className="live-dot" /><span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>Live</span></>}
              </div>
            </div>
            <CandlestickChart symbol={activeSymbol} height={440} />
          </div>

          {/* Company info + Signal Feed side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Company Stats */}
            <div className="panel" style={{ padding: 20 }}>
              <div className="panel-title"><span>Company Stats</span></div>
              <div>
                <StatRow label="Sector" value={info?.sector} />
                <StatRow label="Industry" value={info?.industry} />
                <StatRow label="Market Cap" value={info?.market_cap ? `$${(Number(info.market_cap) / 1e9).toFixed(1)}B` : null} />
                <StatRow label="P/E Ratio" value={info?.pe_ratio != null ? Number(info.pe_ratio).toFixed(2) : null} />
                <StatRow label="EPS" value={info?.eps != null ? `$${Number(info.eps).toFixed(2)}` : null} />
                <StatRow label="52W High" value={info?.['52w_high'] != null ? `$${Number(info['52w_high']).toFixed(2)}` : null} />
                <StatRow label="52W Low" value={info?.['52w_low'] != null ? `$${Number(info['52w_low']).toFixed(2)}` : null} />
                <StatRow label="Avg Volume" value={info?.avg_volume ? `${(Number(info.avg_volume) / 1e6).toFixed(1)}M` : null} />
              </div>
              {info?.description && (
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  {info.description}
                </div>
              )}
            </div>

            {/* Signal Feed */}
            <div className="panel" style={{ padding: 20 }}>
              <div className="panel-title">
                <span>Live Signals</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isLive ? <span className="live-dot" /> : <span className="live-dot-amber" />}
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: isLive ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                    {isLive ? 'LIVE' : 'CONNECTING'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                {messages.length ? messages.map((msg, i) => (
                  <div key={`${msg._ts}-${i}`} style={{
                    padding: '10px 12px',
                    background: i === 0 ? 'rgba(0,212,255,0.04)' : 'var(--bg-elevated)',
                    border: `1px solid ${i === 0 ? 'rgba(0,212,255,0.2)' : 'var(--border-subtle)'}`,
                    borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {new Date(msg._ts).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                      {msg.signal && <SignalBadge signal={msg.signal} />}
                      {msg.price && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)' }}>
                          ${Number(msg.price).toFixed(2)}
                        </span>
                      )}
                      {msg.confidence != null && (
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{(msg.confidence * 100).toFixed(0)}%</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {msg.explanation || 'Agent signal received.'}
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    Waiting for {activeSymbol} signals…
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Demo Trade */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title"><span>Paper Trade</span><span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Demo only</span></div>
            <DemoTradePanel symbol={activeSymbol} currentPrice={price} />
          </div>

          {/* Technical snapshot */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title"><span>Technical View</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Trend Bias', value: positive ? 'Positive' : 'Negative', color: positive ? 'var(--accent-green)' : 'var(--accent-red)' },
                { label: 'Signal State', value: latestSignal?.signal || 'Awaiting' },
                { label: 'Session Range', value: (priceData?.high != null && priceData?.low != null) ? `$${Number(priceData.low).toFixed(2)} – $${Number(priceData.high).toFixed(2)}` : '—' },
                { label: 'Volume', value: priceData?.volume ? `${(Number(priceData.volume) / 1e6).toFixed(1)}M` : '—' },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                }}>
                  <span className="section-kicker">{row.label}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: row.color || 'var(--text-secondary)', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Broker redirect */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title"><span>Live Trading</span></div>
            <BrokerRedirect />
          </div>

          {/* Related navigation */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title"><span>Explore</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Link to="/dashboard" className="btn-ghost" style={{ justifyContent: 'center', width: '100%' }}>Open Dashboard</Link>
              <Link to="/agents" className="btn-ghost" style={{ justifyContent: 'center', width: '100%' }}>Review Agents</Link>
              <Link to="/learn" className="btn-ghost" style={{ justifyContent: 'center', width: '100%' }}>Learning Hub</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
