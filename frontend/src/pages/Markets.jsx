import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getFeaturedMarkets, getMarketProfile, searchMarkets } from "../data/marketCatalog";
import { api } from "../services/api";

const FILTERS = ["All", "Equity", "ETF", "Crypto"];

export default function Markets() {
  const [params, setParams] = useSearchParams();
  const queryParam = params.get("q") ?? "";
  const [query, setQuery] = useState(queryParam);
  const [filter, setFilter] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  const matches = useMemo(() => {
    const searched = searchMarkets(query);
    if (filter === "All") return searched;
    return searched.filter((item) => item.type === filter);
  }, [filter, query]);

  const featured = useMemo(() => getFeaturedMarkets(), []);

  const submit = async (event) => {
    event.preventDefault();
    const nextQuery = query.trim();
    setParams(nextQuery ? { q: nextQuery } : {});

    const resolved = nextQuery ? await api.resolveSymbol(nextQuery).catch(() => null) : null;
    const exact = resolved ?? searchMarkets(nextQuery).find((item) => item.symbol === nextQuery.toUpperCase());
    if (nextQuery && exact?.symbol) {
      navigate(`/markets/${exact.symbol}`);
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid lg:grid-cols-[1.2fr,0.8fr] gap-6 items-start">
        <div>
          <div className="text-cyan-400 font-mono text-xs uppercase tracking-[0.3em] mb-3">Markets</div>
          <h1 className="text-4xl font-light text-zinc-100">Search live instruments and compare how each market trades.</h1>
          <p className="text-zinc-400 mt-3 max-w-2xl">
            Explore equities, ETFs, and crypto. Open a dedicated market page for real-time pricing, interactive chart views from minutes to months, signals, and guided demo execution.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">What feels different now</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-zinc-300">Minute, hour, day, week, month, and year chart views</div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-zinc-300">Dedicated market identity with sector, type, and context</div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-zinc-300">Signal stream and learning trade entry on each market page</div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-zinc-300">Broader market coverage instead of a tiny static list</div>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search AAPL, TSLA, NVDA, BTC, SPY, QQQ"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
          />
          <button className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-cyan-300 hover:bg-cyan-500/20">
            Search Markets
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest ${filter === item ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-zinc-100 text-xl">Featured Markets</div>
            <div className="text-zinc-500 text-sm">Fast jump into the most useful practice symbols.</div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {featured.map((item) => (
            <Link key={item.symbol} to={`/markets/${item.symbol}`} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-cyan-500/40 transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-zinc-100 text-xl">{item.symbol}</div>
                  <div className="text-zinc-400 mt-1">{item.name}</div>
                </div>
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-400">{item.type}</span>
              </div>
              <div className="text-zinc-500 text-sm mt-3">{item.description}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-zinc-100 text-xl">Search Results</div>
          <div className="text-zinc-500 text-sm">{matches.length} market{matches.length === 1 ? "" : "s"} matched.</div>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {matches.map((item) => (
            <Link key={item.symbol} to={`/markets/${item.symbol}`} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-cyan-500/40 transition">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-zinc-100 text-xl">{item.symbol}</div>
                  <div className="text-zinc-400 mt-1">{item.name}</div>
                </div>
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-400">{item.exchange}</span>
              </div>
              <div className="text-zinc-500 text-sm mt-3">{item.sector} - {item.type}</div>
              <div className="flex gap-2 flex-wrap mt-4">
                {(item.tags || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-400">{tag}</span>
                ))}
              </div>
            </Link>
          ))}
          {!matches.length && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-500">
              No direct matches yet. Try a ticker like <span className="text-zinc-300">AAPL</span>, <span className="text-zinc-300">SPY</span>, or <span className="text-zinc-300">BTC</span>.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
