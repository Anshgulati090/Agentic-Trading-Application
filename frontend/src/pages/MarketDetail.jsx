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
    <div className="flex items-center justify-between border-b border-zinc-800/80 py-3 text-sm last:border-0">
      <span className="section-kicker">{label}</span>
      <span className="font-mono text-zinc-200">{value ?? '-'}</span>
    </div>
  );
}

function BrokerRedirect() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setOpen((value) => !value)} className="btn-ghost w-full">
        Trade with Real Broker
      </button>
      {open ? (
        <div className="space-y-2">
          {BROKERS.map((broker) => (
            <a
              key={broker.name}
              href={broker.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-zinc-800 bg-zinc-950/45 px-4 py-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/70"
            >
              <div className="text-sm text-zinc-100">{broker.name}</div>
              <div className="mt-1 text-sm text-zinc-500">{broker.description}</div>
            </a>
          ))}
        </div>
      ) : null}
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
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await api.executeDemoTrade({
        symbol,
        action,
        quantity: Number(quantity),
        price: currentPrice,
      });
      setResult(response);
    } catch (err) {
      setError(err?.message || 'Unable to place paper trade');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/35 px-4 py-8 text-center">
        <div className="text-sm text-zinc-500">Sign in to place practice trades on {symbol}.</div>
        <Link to="/login" className="btn-primary mt-4 inline-flex">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {['BUY', 'SELL'].map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => setAction(side)}
            className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
              action === side
                ? side === 'BUY'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/40 bg-red-500/10 text-red-400'
                : 'border-zinc-800 bg-zinc-950/35 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            {side}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <label className="section-kicker mb-2 block">Quantity</label>
          <input type="number" min="0.001" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="input" />
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 px-4 py-4">
          <div className="section-kicker mb-2">Preview</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-zinc-500">Action</div>
            <div className="text-right font-mono text-zinc-200">{action}</div>
            <div className="text-zinc-500">Execution price</div>
            <div className="text-right font-mono text-zinc-200">{currentPrice ? `$${currentPrice.toFixed(2)}` : '-'}</div>
            <div className="text-zinc-500">Estimated total</div>
            <div className="text-right font-mono text-zinc-200">${total.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-300">{error}</div> : null}
      {result ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-300">
          Practice trade executed. New balance: ${Number(result.new_balance || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </div>
      ) : null}

      <button type="button" onClick={execute} disabled={loading || !currentPrice || !Number(quantity)} className="btn-primary w-full disabled:opacity-40">
        {loading ? 'Executing...' : `Place ${action} Practice Trade`}
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
    } catch {
      setPriceData(null);
    } finally {
      setLoading(false);
    }
  }, [activeSymbol]);

  useEffect(() => {
    setPriceData(null);
    setInfo(null);
    loadQuote();
    const timer = window.setInterval(loadQuote, 7000);
    return () => window.clearInterval(timer);
  }, [loadQuote]);

  useEffect(() => {
    api.getSymbolInfo(activeSymbol).then((payload) => setInfo(payload?.data || payload)).catch(() => setInfo(null));
  }, [activeSymbol]);

  const price = priceData?.price;
  const change = priceData?.change;
  const changePct = priceData?.change_pct;
  const positive = (change ?? 0) >= 0;
  const latestSignal = messages[0];

  const summaryStats = useMemo(
    () => [
      { label: 'Open', value: priceData?.open != null ? `$${Number(priceData.open).toFixed(2)}` : '-' },
      { label: 'Day high', value: priceData?.high != null ? `$${Number(priceData.high).toFixed(2)}` : '-' },
      { label: 'Day low', value: priceData?.low != null ? `$${Number(priceData.low).toFixed(2)}` : '-' },
      { label: 'Volume', value: priceData?.volume != null ? `${(Number(priceData.volume) / 1e6).toFixed(1)}M` : '-' },
    ],
    [priceData],
  );

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="hero-glow" />
        <div className="relative grid gap-6 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div>
            <div className="section-kicker mb-3">Market detail</div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-light tracking-tight text-zinc-100 sm:text-4xl">{activeSymbol}</h1>
              {latestSignal?.signal ? <SignalBadge signal={latestSignal.signal} /> : null}
            </div>
            <p className="mt-2 text-sm text-zinc-500">{info?.name || 'Live market view with charting, signals, and paper trading.'}</p>
            <div className="mt-5 flex flex-wrap items-end gap-4">
              <div>
                {loading && !priceData ? (
                  <div className="skeleton h-10 w-36" />
                ) : (
                  <div className="text-4xl font-light font-mono text-zinc-100">{price != null ? `$${Number(price).toFixed(2)}` : '-'}</div>
                )}
                <div className={`mt-1 text-sm font-mono ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {change != null ? `${positive ? '+' : ''}${Number(change).toFixed(2)} (${positive ? '+' : ''}${((changePct || 0) * 100).toFixed(2)}%)` : 'Waiting for quote'}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {summaryStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/45 px-4 py-3">
                    <div className="section-kicker mb-1">{stat.label}</div>
                    <div className="font-mono text-zinc-100">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-zinc-800/80 bg-zinc-950/45 p-5">
            <div className="panel-title">
              <span>Signal snapshot</span>
              <span className={`text-[10px] font-mono ${status === WS_STATUS.CONNECTED ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {status === WS_STATUS.CONNECTED ? 'live stream' : 'reconnecting'}
              </span>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/55 px-4 py-4">
                <div className="section-kicker mb-2">Latest agent action</div>
                <div className="flex items-center gap-2">
                  {latestSignal?.signal ? <SignalBadge signal={latestSignal.signal} /> : <span className="text-sm text-zinc-500">No active signal</span>}
                </div>
                <div className="mt-3 text-sm text-zinc-400">{latestSignal?.explanation || 'The signal engine will explain the latest setup here when a new event arrives.'}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link to="/dashboard" className="btn-primary text-center">Open dashboard</Link>
                <Link to="/agents" className="btn-ghost text-center">Review agents</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 2xl:grid-cols-[1.45fr_0.55fr]">
        <section className="space-y-5">
          <section className="panel p-5">
            <div className="panel-title">
              <span>Price Chart</span>
              <span className="text-[10px] font-mono text-zinc-600">1D · 1W · 1M · 3M · 1Y</span>
            </div>
            <CandlestickChart symbol={activeSymbol} height={400} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="panel p-5">
              <div className="panel-title"><span>Company and Market Stats</span></div>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <StatRow label="Sector" value={info?.sector} />
                  <StatRow label="Industry" value={info?.industry} />
                  <StatRow label="Market cap" value={info?.market_cap ? `$${(Number(info.market_cap) / 1e9).toFixed(1)}B` : '-'} />
                  <StatRow label="P/E ratio" value={info?.pe_ratio != null ? Number(info.pe_ratio).toFixed(2) : '-'} />
                </div>
                <div>
                  <StatRow label="EPS" value={info?.eps != null ? Number(info.eps).toFixed(2) : '-'} />
                  <StatRow label="52 week high" value={info?.['52w_high'] != null ? `$${Number(info['52w_high']).toFixed(2)}` : '-'} />
                  <StatRow label="52 week low" value={info?.['52w_low'] != null ? `$${Number(info['52w_low']).toFixed(2)}` : '-'} />
                  <StatRow label="Average volume" value={info?.avg_volume ? `${(Number(info.avg_volume) / 1e6).toFixed(1)}M` : '-'} />
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/35 px-4 py-4 text-sm leading-7 text-zinc-500">
                {info?.description || 'Description and richer fundamentals will appear here as more metadata becomes available.'}
              </div>
            </div>

            <div className="panel p-5">
              <div className="panel-title"><span>Live Signal Feed</span></div>
              <div className="space-y-3 max-h-[24rem] overflow-y-auto">
                {messages.length ? (
                  messages.map((message, index) => (
                    <div key={`${message._ts}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/45 px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-zinc-600">
                          {new Date(message._ts).toLocaleTimeString('en-US', { hour12: false })}
                        </span>
                        {message.signal ? <SignalBadge signal={message.signal} /> : null}
                        {message.confidence != null ? <span className="ml-auto text-[11px] font-mono text-zinc-500">{(message.confidence * 100).toFixed(0)}%</span> : null}
                      </div>
                      <div className="mt-3 text-sm text-zinc-400">{message.explanation || 'Agent update received for this symbol.'}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/35 px-4 py-8 text-center text-sm text-zinc-500">
                    Waiting for live signals on {activeSymbol}.
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="panel p-5">
            <div className="panel-title"><span>Demo Trade</span></div>
            <DemoTradePanel symbol={activeSymbol} currentPrice={price} />
          </section>

          <section className="panel p-5">
            <div className="panel-title"><span>Real Broker Redirect</span></div>
            <BrokerRedirect />
          </section>

          <section className="panel p-5">
            <div className="panel-title"><span>Technical View</span></div>
            <div className="space-y-3">
              {[
                { label: 'Trend bias', value: positive ? 'Positive' : 'Negative', tone: positive ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Signal state', value: latestSignal?.signal || 'Waiting', tone: 'text-zinc-100' },
                { label: 'Session range', value: priceData?.high != null && priceData?.low != null ? `$${Number(priceData.low).toFixed(2)} - $${Number(priceData.high).toFixed(2)}` : '-' },
              ].map((row) => (
                <div key={row.label} className="rounded-2xl border border-zinc-800 bg-zinc-950/45 px-4 py-4">
                  <div className="section-kicker mb-2">{row.label}</div>
                  <div className={`text-lg font-light ${row.tone || 'text-zinc-100'}`}>{row.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-5">
            <div className="panel-title"><span>News Feed</span></div>
            <div className="space-y-3">
              {[
                'Price action summary placeholder',
                'Agent insight note placeholder',
                'Macro context placeholder',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-zinc-800 bg-zinc-950/45 px-4 py-4 text-sm text-zinc-500">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
