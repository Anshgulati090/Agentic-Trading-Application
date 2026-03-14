import { Link } from "react-router-dom";

const LESSONS = [
  {
    title: "Momentum Trading",
    crux: "Trend-following works when participation stays strong and buyers keep defending pullbacks.",
    when: "Use it in strong uptrends, breakouts, and persistent relative strength.",
    why: "It teaches confirmation, patience, and why strong names can stay strong longer than expected.",
    route: "/markets/NVDA",
  },
  {
    title: "Mean Reversion",
    crux: "Overextended prices often snap back toward a fairer short-term average.",
    when: "Use it after panic drops, euphoric spikes, or range extremes.",
    why: "It teaches timing, oversold and overbought behavior, and the risk of catching falling knives too early.",
    route: "/markets/AAPL",
  },
  {
    title: "Risk Management",
    crux: "Survival is a strategy. Position sizing matters as much as the entry.",
    when: "Use it before every trade and while managing open positions.",
    why: "It teaches how to limit damage, respect drawdowns, and stay in the game long enough to improve.",
    route: "/markets/SPY",
  },
  {
    title: "Factor Investing",
    crux: "A basket of strong signals can be more reliable than one isolated idea.",
    when: "Use it when comparing quality, momentum, value, and macro exposure across markets.",
    why: "It teaches diversified signal stacking and systematic decision-making.",
    route: "/markets/QQQ",
  },
];

const WORKFLOW = [
  "Search a market and open its dedicated page.",
  "Switch the chart between minutes, hours, days, weeks, and months.",
  "Read the signal stream and agent recommendation context.",
  "Review the agent crux and confirm you understand the trade style.",
  "Place a demo trade and watch your credits, P&L, and positions update.",
];

export default function Learn() {
  return (
    <div className="space-y-8">
      <section className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6 items-start">
        <div>
          <div className="text-cyan-400 font-mono text-xs uppercase tracking-[0.3em] mb-3">Learning Mode</div>
          <h1 className="text-4xl font-light text-zinc-100">Learn the why behind each trade before you practice it.</h1>
          <p className="text-zinc-400 mt-3 max-w-2xl">
            The learning section is no longer just a placeholder. It now connects each concept to a market, an agent behavior, and a demo trading workflow so users can study then act.
          </p>
          <div className="flex gap-3 flex-wrap mt-6">
            <Link to="/signup" className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-sm text-cyan-300 hover:bg-cyan-500/20">Start Demo Trading</Link>
            <Link to="/markets" className="rounded-lg border border-zinc-700 px-5 py-3 text-sm text-zinc-300 hover:border-zinc-500">Explore Markets</Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-3">How the learning flow works</div>
          <div className="space-y-3">
            {WORKFLOW.map((step, index) => (
              <div key={step} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="text-cyan-300 font-mono text-xs mb-2">0{index + 1}</div>
                <div className="text-zinc-300">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        {LESSONS.map((lesson) => (
          <div key={lesson.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="text-lg text-zinc-100">{lesson.title}</div>
            <div className="text-zinc-400 mt-2">{lesson.crux}</div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="text-cyan-300">When it trades</div>
                <div className="text-zinc-500 mt-1">{lesson.when}</div>
              </div>
              <div>
                <div className="text-cyan-300">Why it trades</div>
                <div className="text-zinc-500 mt-1">{lesson.why}</div>
              </div>
            </div>
            <Link to={lesson.route} className="inline-flex mt-5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-cyan-300">
              Practice on this market
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
