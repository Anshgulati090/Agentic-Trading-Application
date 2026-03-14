import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { SYMBOLS, getMarketProfile } from "../data/marketCatalog";

const ACTIONS = ["BUY", "SELL"];

function fmtMoney(value) {
  return `$${Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LearningLab({ initialSymbol = "AAPL", compact = false }) {
  const [account, setAccount] = useState(null);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("momentum");
  const [symbol, setSymbol] = useState(initialSymbol);
  const [action, setAction] = useState("BUY");
  const [quantity, setQuantity] = useState(5);
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [quote, setQuote] = useState(null);

  const symbolOptions = useMemo(() => {
    const merged = Array.from(new Set([initialSymbol.toUpperCase(), ...SYMBOLS]));
    return merged.sort();
  }, [initialSymbol]);

  const profile = useMemo(() => getMarketProfile(symbol), [symbol]);
  const briefing = useMemo(() => agents.find((agent) => agent.id === selectedAgent), [agents, selectedAgent]);

  useEffect(() => {
    setSymbol(initialSymbol.toUpperCase());
  }, [initialSymbol]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextAccount, nextAgents] = await Promise.all([
        api.getLearningAccount(),
        api.getLearningAgents(),
      ]);
      setAccount(nextAccount);
      setAgents(nextAgents);
      if (nextAgents[0] && !nextAgents.some((agent) => agent.id === selectedAgent)) {
        setSelectedAgent(nextAgents[0].id);
      }
    } catch (err) {
      setError(err?.message ?? "Unable to load learning workspace");
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  const loadQuote = useCallback(async () => {
    try {
      const nextQuote = await api.getMarketPrice(symbol, "1D");
      setQuote(nextQuote);
    } catch {
      setQuote(null);
    }
  }, [symbol]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    loadQuote();
    const timer = window.setInterval(loadQuote, 15000);
    return () => window.clearInterval(timer);
  }, [loadQuote]);

  const submitTrade = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const response = await api.executeLearningTrade({
        symbol,
        action,
        quantity: Number(quantity),
        agent_id: selectedAgent,
        market_mode: "live_practice",
        understood,
      });
      setAccount(response.account);
      setResult(response);
      await loadQuote();
    } catch (err) {
      setError(err?.message ?? "Trade failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !account) {
    return <div className="text-zinc-500 text-sm font-mono">Loading learning lab...</div>;
  }

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 xl:grid-cols-5 gap-3`}>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Demo Credits</div>
          <div className="text-xl text-zinc-100 mt-1">{fmtMoney(account?.demo_balance)}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Equity</div>
          <div className="text-xl text-cyan-300 mt-1">{fmtMoney(account?.portfolio_equity)}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Realized P&L</div>
          <div className={`text-xl mt-1 ${(account?.realized_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtMoney(account?.realized_pnl)}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Wins</div>
          <div className="text-xl text-emerald-400 mt-1">{account?.wins ?? 0}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Losses</div>
          <div className="text-xl text-red-400 mt-1">{account?.losses ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <form onSubmit={submitTrade} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Practice Trade</div>
              <div className="text-zinc-400 text-sm mt-1">Use live pricing with fake credits. Review the agent brief, then place the practice trade.</div>
            </div>
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Live Practice Price</div>
              <div className="text-lg text-zinc-100">{fmtMoney(quote?.price ?? 0)}</div>
              <div className={`${(quote?.change ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"} text-xs`}>
                {Number(quote?.change ?? 0).toFixed(2)} ({(Number(quote?.changePct ?? 0) * 100).toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={selectedAgent} onChange={(e) => { setSelectedAgent(e.target.value); setUnderstood(false); }} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.label}</option>)}
            </select>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
              {symbolOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
              {ACTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-zinc-100">{profile.name}</div>
                <div className="text-xs text-zinc-500 mt-1">{profile.symbol} - {profile.type} - {profile.exchange}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(profile.tags || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-400">{tag}</span>
                ))}
              </div>
            </div>
            <div className="text-xs text-zinc-400 mt-3">{profile.description}</div>
          </div>

          {briefing && (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
              <div className="text-sm text-cyan-300">{briefing.label}</div>
              <div className="text-xs text-zinc-300 mt-2 leading-relaxed">{briefing.crux}</div>
              <div className="text-xs text-zinc-500 mt-2">Learning goal: {briefing.learning_goal}</div>
              <label className="mt-3 flex items-start gap-2 text-xs text-zinc-300">
                <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5" />
                <span>I understand what this agent will do before I use it.</span>
              </label>
              {!understood && <div className="mt-2 text-[11px] text-amber-300">Tick the confirmation box to unlock live practice trading.</div>}
            </div>
          )}

          {error && <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
          {result && <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Trade executed at {fmtMoney(result.price)} with outcome {result.outcome}. Your learning account updated immediately.</div>}

          <button type="submit" disabled={submitting || !understood} className="rounded border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-40">
            {submitting ? "Placing..." : `Place ${action} Practice Trade`}
          </button>
        </form>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Hands-On Progress</div>
          <div>
            <div className="text-xs text-zinc-500 mb-2">Open Practice Positions</div>
            <div className="space-y-2">
              {(account?.positions?.length ? account.positions : []).map((position) => (
                <div key={position.symbol} className="grid grid-cols-4 gap-2 rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs">
                  <span className="text-cyan-300">{position.symbol}</span>
                  <span className="text-zinc-300">{position.quantity} sh</span>
                  <span className="text-zinc-400">{fmtMoney(position.market_value)}</span>
                  <span className={`${position.unrealized_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtMoney(position.unrealized_pnl)}</span>
                </div>
              ))}
              {!account?.positions?.length && <div className="text-xs text-zinc-500">No open practice positions yet. Place a guided trade to watch your balance move in real time.</div>}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500 mb-2">Recent Learning Trades</div>
            <div className={`space-y-2 ${compact ? "max-h-48" : "max-h-56"} overflow-auto`}>
              {(account?.recent_trades?.length ? account.recent_trades : []).map((trade) => (
                <div key={trade.id} className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200">{trade.action} {trade.symbol}</span>
                    <span className={`${trade.realized_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtMoney(trade.realized_pnl)}</span>
                  </div>
                  <div className="text-zinc-500 mt-1">{trade.agent_id ?? "manual"} - {trade.outcome}</div>
                </div>
              ))}
              {!account?.recent_trades?.length && <div className="text-xs text-zinc-500">Your learning history will appear here after your first practice trade.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
