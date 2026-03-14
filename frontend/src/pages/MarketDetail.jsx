import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LearningLab from "../components/LearningLab";
import PriceChart from "../components/PriceChart";
import SignalStream from "../components/SignalStream";
import { getMarketProfile } from "../data/marketCatalog";
import { api } from "../services/api";

export default function MarketDetail() {
  const { symbol = "AAPL" } = useParams();
  const normalizedSymbol = symbol.toUpperCase();
  const profile = useMemo(() => getMarketProfile(normalizedSymbol), [normalizedSymbol]);
  const [quote, setQuote] = useState(null);
  const [signal, setSignal] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async ({ reset = false } = {}) => {
      setLoading(true);
      setError("");
      if (reset) {
        setQuote(null);
        setSignal(null);
      }
      try {
        const [nextQuote, nextSignal] = await Promise.all([
          api.getMarketPrice(normalizedSymbol, "1D"),
          api.getSignals(normalizedSymbol),
        ]);
        if (!active) return;
        setQuote(nextQuote);
        setSignal(nextSignal);
      } catch (err) {
        if (!active) return;
        setError(err?.message ?? "Unable to load market");
      } finally {
        if (active) setLoading(false);
      }
    };

    load({ reset: true });
    const timer = window.setInterval(() => load({ reset: false }), 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [normalizedSymbol]);

  const latestBar = quote?.history?.at(-1);

  return (
    <div className="space-y-6">
      <section className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6 items-start">
        <div>
          <div className="text-cyan-400 font-mono text-xs uppercase tracking-[0.3em] mb-2">Market Detail</div>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 flex items-center justify-center text-cyan-300 text-lg font-semibold">
              {normalizedSymbol.slice(0, 3)}
            </div>
            <div>
              <h1 className="text-4xl font-light text-zinc-100">{normalizedSymbol}</h1>
              <div className="text-zinc-300 mt-1">{profile.name}</div>
              <div className="text-zinc-500 mt-2">{profile.type} - {profile.exchange} - {profile.sector}</div>
              <div className="text-zinc-400 mt-3 max-w-2xl">{profile.description}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Live Snapshot</div>
          {loading && !quote ? (
            <>
              <div className="h-10 w-36 rounded bg-zinc-800 animate-pulse" />
              <div className="h-5 w-28 rounded bg-zinc-800 animate-pulse mt-3" />
            </>
          ) : (
            <>
              <div className="text-4xl text-zinc-100">${Number(quote?.price ?? 0).toFixed(2)}</div>
              <div className={`${(quote?.change ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"} mt-2`}>
                {Number(quote?.change ?? 0).toFixed(2)} ({(Number(quote?.changePct ?? 0) * 100).toFixed(2)}%)
              </div>
            </>
          )}
          <div className="flex gap-2 flex-wrap mt-4">
            {(profile.tags || []).map((tag) => (
              <span key={tag} className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-400">{tag}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="flex gap-2 flex-wrap">
        <Link to="/markets" className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-cyan-300">Back to Markets</Link>
        {[["Alpaca", "https://alpaca.markets/"], ["Interactive Brokers", "https://www.interactivebrokers.com/"], ["Binance", "https://www.binance.com/"]].map(([name, url]) => (
          <a key={name} href={url} target="_blank" rel="noreferrer" className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-cyan-300">
            Trade Real Money on {name}
          </a>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>}
      {loading && <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-zinc-500">Loading market view...</div>}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <PriceChart defaultSymbol={normalizedSymbol} lockSymbol defaultRange="1D" />
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Open</div>
          <div className="text-xl text-zinc-100">${Number(latestBar?.open ?? quote?.price ?? 0).toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">High</div>
          <div className="text-xl text-emerald-400">${Number(latestBar?.high ?? quote?.price ?? 0).toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Low</div>
          <div className="text-xl text-red-400">${Number(latestBar?.low ?? quote?.price ?? 0).toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Volume</div>
          <div className="text-xl text-zinc-100">{Number(latestBar?.volume ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.1fr,0.9fr] gap-4">
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Signal Snapshot</div>
            <div className="text-2xl text-zinc-100">{signal?.signal ?? "HOLD"}</div>
            <div className="text-zinc-400 mt-2">{signal?.explanation ?? "No live explanation available."}</div>
            <div className="mt-4 text-sm text-zinc-500">Confidence: {signal?.confidence != null ? `${(signal.confidence * 100).toFixed(1)}%` : "n/a"}</div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Live Signal Stream</div>
            <div className="h-72">
              <SignalStream initialSymbol={normalizedSymbol} compact hideSelector />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Agent Recommendations</div>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
              <div className="text-cyan-300">Momentum Agent</div>
              <div className="text-zinc-400 mt-1">Best when {normalizedSymbol} is trending and holding higher highs with strong participation.</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
              <div className="text-cyan-300">Mean Reversion Agent</div>
              <div className="text-zinc-400 mt-1">Best when {normalizedSymbol} is stretched far from recent balance and may snap back.</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
              <div className="text-cyan-300">Risk Manager</div>
              <div className="text-zinc-400 mt-1">Use it to think through sizing and loss limits before you commit demo credits.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Start Demo Trading</div>
        <LearningLab initialSymbol={normalizedSymbol} compact />
      </div>
    </div>
  );
}
