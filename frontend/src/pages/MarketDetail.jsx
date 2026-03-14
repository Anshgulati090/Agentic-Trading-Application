import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
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

function StatRow({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0">
      <span className="text-xs text-zinc-500 font-mono">{label}</span>
      <div className="text-right">
        <span className="text-xs text-zinc-200 font-mono">{value ?? '—'}</span>
        {sub && <div className="text-[10px] text-zinc-600 font-mono">{sub}</div>}
      </div>
    </div>
  );
}

function BrokerRedirect({ symbol }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button
        onClick={() => setShow(s => !s)}
        className="w-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:border-amber-400/50 text-amber-400 font-semibold py-3 rounded-xl text-sm transition-all"
      >
        💰 Trade Real Money →
      </button>
      {show && (
        <div className="mt-3 p-4 bg-zinc-900 border border-zinc-700 rounded-xl animate-slide-up">
          <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
            AgenticTrading is for <strong className="text-zinc-200">learning only</strong>. To trade real money, use a licensed broker:
          </p>
          <div className="space-y-2">
            {BROKERS.map(b => (
              <a
                key={b.name}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <span className="text-xl">{b.logo}</span>
                <div>
                  <div className="text-sm font-medium text-zinc-100">{b.name}</div>
                  <div className="text-xs text-zinc-500">{b.description}</div>
                </div>
                <span className="ml-auto text-zinc-600">↗</span>
              </a>
            ))}
          </div>
          <p className="text-[10px] text-zinc-700 font-mono mt-3">
            AgenticTrading is not affiliated with these brokers. Use at your own risk.
          </p>
        </div>
      )}
    </div>
  );
}

function DemoTradePanel({ symbol, currentPrice }) {
  const { isAuthenticated } = useAuth();
  const [action, setAction] = useState('BUY');
  const [qty, setQty] = useState('10');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleTrade = async () => {
    if (!currentPrice) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.executeDemoTrade({
        symbol,
        action,
        quantity: parseFloat(qty),
        price: currentPrice,
      });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-zinc-500 mb-3">Sign in to paper trade {symbol}</p>
        <Link to="/login" className="btn-primary text-sm">Sign In to Trade</Link>
      </div>
    );
  }

  const total = (parseFloat(qty) || 0) * (currentPrice || 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {['BUY', 'SELL'].map(a => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              action === a
                ? a === 'BUY'
                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                  : 'bg-red-500/20 border border-red-500/50 text-red-400'
                : 'bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {a}
          </button>
        ))}
      </div>
      <div>
        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">Quantity</label>
        <input
          type="number"
          min="0.001"
          step="1"
          value={qty}
          onChange={e => setQty(e.target.value)}
          className="input"
          placeholder="10"
        />
      </div>
      {currentPrice && (
        <div className="flex justify-between text-xs font-mono text-zinc-500">
          <span>@ ${currentPrice.toFixed(2)}</span>
          <span className="text-zinc-300">Total: ${total.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
        </div>
      )}
      {error && <div className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
      {result && (
        <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          ✓ {result.action} {result.quantity} {result.symbol} @ ${result.price?.toFixed(2)} — Balance: ${result.new_balance?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </div>
      )}
      <button
        onClick={handleTrade}
        disabled={loading || !currentPrice || !parseFloat(qty)}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          action === 'BUY'
            ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-900'
            : 'bg-red-500 hover:bg-red-400 text-zinc-100'
        }`}
      >
        {loading ? 'Executing…' : `Paper ${action} ${qty || '?'} ${symbol}`}
      </button>
    </div>
  );
}

export default function MarketDetail() {
  const { symbol } = useParams();
  const sym = symbol?.toUpperCase() || 'AAPL';
  const [priceData, setPriceData] = useState(null);
  const [info, setInfo] = useState(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const { messages, status } = useSignalStream(sym, 30);

  const loadPrice = useCallback(async () => {
    try {
      const res = await api.getMarketPrice(sym);
      setPriceData(res?.data || res);
    } catch {}
    finally { setPriceLoading(false); }
  }, [sym]);

  useEffect(() => { loadPrice(); const t = setInterval(loadPrice, 5000); return () => clearInterval(t); }, [loadPrice]);

  useEffect(() => {
    api.getSymbolInfo(sym).then(r => setInfo(r?.data)).catch(() => {});
  }, [sym]);

  const price = priceData?.price;
  const change = priceData?.change;
  const changePct = priceData?.change_pct;
  const isPos = (change ?? 0) >= 0;

  const latestSignal = messages[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/markets" className="text-zinc-600 hover:text-zinc-400 transition-colors text-sm">← Markets</Link>
              <span className="text-zinc-800">/</span>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-mono font-bold text-zinc-100">{sym}</h1>
                  {latestSignal?.signal && <SignalBadge signal={latestSignal.signal} />}
                </div>
                {info?.name && <p className="text-sm text-zinc-500 mt-0.5">{info.name}</p>}
              </div>
            </div>
            <div className="text-right">
              {priceLoading ? (
                <div className="h-9 w-28 skeleton" />
              ) : price ? (
                <>
                  <div className="text-3xl font-light font-mono text-zinc-100">${price.toFixed(2)}</div>
                  <div className={`text-sm font-mono ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPos ? '+' : ''}{change?.toFixed(2)} ({isPos ? '+' : ''}{((changePct ?? 0) * 100).toFixed(2)}%)
                  </div>
                </>
              ) : <div className="text-zinc-600 text-sm font-mono">No price data</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* Left: Chart + Signals */}
          <div className="xl:col-span-3 space-y-6">
            {/* Chart */}
            <div className="panel p-5">
              <div className="panel-title">
                <span>Price Chart · {sym}</span>
                <span className={`flex items-center gap-1.5 text-[10px] ${status === WS_STATUS.CONNECTED ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status === WS_STATUS.CONNECTED ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                  {status === WS_STATUS.CONNECTED ? 'Live' : 'Stream'}
                </span>
              </div>
              <CandlestickChart symbol={sym} height={360} />
            </div>

            {/* Live signals stream */}
            <div className="panel p-5">
              <div className="panel-title">
                <span>Live Signal Stream</span>
                <span className="text-zinc-600">{messages.length} signals</span>
              </div>
              {messages.length === 0 ? (
                <div className="text-center py-10 text-zinc-600 font-mono text-sm">
                  {status === WS_STATUS.CONNECTING ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
                      Connecting to signal stream…
                    </div>
                  ) : 'Awaiting signals…'}
                </div>
              ) : (
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono ${i === 0 ? 'bg-zinc-800/80' : 'hover:bg-zinc-800/30'}`}>
                      <span className="text-zinc-600 tabular-nums">{new Date(msg._ts).toLocaleTimeString('en-US', { hour12: false })}</span>
                      {msg.signal && <SignalBadge signal={msg.signal} />}
                      {msg.price && <span className="text-zinc-300">${Number(msg.price).toFixed(2)}</span>}
                      {msg.confidence != null && (
                        <span className="text-zinc-500 ml-auto">{(msg.confidence * 100).toFixed(0)}% conf</span>
                      )}
                      {msg.explanation && (
                        <span className="text-zinc-600 truncate max-w-xs">{msg.explanation}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Company info */}
            {info && (
              <div className="panel p-5">
                <div className="panel-title"><span>Company Info</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <StatRow label="Sector" value={info.sector} />
                    <StatRow label="Industry" value={info.industry} />
                    <StatRow label="Market Cap" value={info.market_cap ? `$${(info.market_cap / 1e9).toFixed(1)}B` : null} />
                    <StatRow label="P/E Ratio" value={info.pe_ratio?.toFixed(2)} />
                  </div>
                  <div>
                    <StatRow label="EPS" value={info.eps?.toFixed(2)} />
                    <StatRow label="52W High" value={info['52w_high']?.toFixed(2)} />
                    <StatRow label="52W Low" value={info['52w_low']?.toFixed(2)} />
                    <StatRow label="Avg Volume" value={info.avg_volume ? `${(info.avg_volume / 1e6).toFixed(1)}M` : null} />
                  </div>
                </div>
                {info.description && (
                  <p className="text-xs text-zinc-500 mt-4 leading-relaxed border-t border-zinc-800 pt-4">{info.description}</p>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* OHLC quick stats */}
            <div className="panel p-4">
              <div className="panel-title"><span>Today</span></div>
              <div className="space-y-0">
                <StatRow label="Open" value={priceData?.open?.toFixed(2) ? `$${priceData.open.toFixed(2)}` : null} />
                <StatRow label="High" value={priceData?.high?.toFixed(2) ? `$${priceData.high.toFixed(2)}` : null} />
                <StatRow label="Low" value={priceData?.low?.toFixed(2) ? `$${priceData.low.toFixed(2)}` : null} />
                <StatRow label="Prev Close" value={priceData?.prev_close?.toFixed(2) ? `$${priceData.prev_close.toFixed(2)}` : null} />
                <StatRow label="Volume" value={priceData?.volume ? `${(priceData.volume / 1e6).toFixed(1)}M` : null} />
              </div>
            </div>

            {/* Agent recommendation */}
            {latestSignal && (
              <div className={`panel p-4 ${
                latestSignal.signal === 'BUY' ? 'border-emerald-500/30' :
                latestSignal.signal === 'SELL' ? 'border-red-500/30' : ''
              }`}>
                <div className="panel-title"><span>Agent Insight</span></div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <SignalBadge signal={latestSignal.signal} />
                    {latestSignal.confidence != null && (
                      <div className="text-xs font-mono text-zinc-500">
                        {(latestSignal.confidence * 100).toFixed(0)}% confidence
                      </div>
                    )}
                  </div>
                  {latestSignal.explanation && (
                    <p className="text-xs text-zinc-400 leading-relaxed">{latestSignal.explanation}</p>
                  )}
                </div>
              </div>
            )}

            {/* Paper trade */}
            <div className="panel p-4">
              <div className="panel-title"><span>Paper Trade</span></div>
              <DemoTradePanel symbol={sym} currentPrice={price} />
            </div>

            {/* Broker redirect */}
            <div className="panel p-4">
              <div className="panel-title"><span>Live Trading</span></div>
              <BrokerRedirect symbol={sym} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
