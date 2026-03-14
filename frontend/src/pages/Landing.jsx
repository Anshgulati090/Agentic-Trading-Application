import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="space-y-20">
      <section className="grid lg:grid-cols-2 gap-10 items-center py-12">
        <div>
          <div className="text-cyan-400 font-mono text-xs uppercase tracking-[0.35em] mb-4">Learn AI Assisted Trading</div>
          <h1 className="text-5xl sm:text-6xl font-light tracking-tight text-zinc-100">Train like a trader. Practice like a quant.</h1>
          <p className="mt-5 text-zinc-400 text-lg max-w-xl">
            AgenticTrading combines market discovery, real-time signals, agent explanations, and demo trading credits into one learning-first trading experience.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-sm text-cyan-300 hover:bg-cyan-500/20">Start Demo Trading</Link>
            <Link to="/markets" className="rounded-lg border border-zinc-700 px-5 py-3 text-sm text-zinc-300 hover:border-zinc-500">Explore Markets</Link>
          </div>
        </div>
        <div className="rounded-3xl border border-zinc-800 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_40%),linear-gradient(180deg,rgba(24,24,27,0.95),rgba(9,9,11,0.95))] p-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Multi-Agent Trading", "Hands-on workflows for momentum, mean reversion, factor, risk, and execution agents."],
              ["Real-Time Signals", "Stream market direction and agent insight with live-updating practice flows."],
              ["Portfolio Analytics", "Track your demo credits, open positions, realized P&L, and learning progress."],
              ["Practice Trading", "Use fake money against live prices before ever touching a real broker."]
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="text-zinc-100">{title}</div>
                <div className="text-zinc-500 text-sm mt-2">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {[
          "Connect to a market page, study live candles and signal flow.",
          "Read each agent's crux before you use it.",
          "Place demo trades, learn from wins and losses, and build discipline.",
        ].map((step, idx) => (
          <div key={step} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="text-cyan-300 font-mono text-xs mb-3">0{idx + 1}</div>
            <div className="text-zinc-300">{step}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
