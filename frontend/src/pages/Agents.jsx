import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

function AgentCard({ agent, onExecute }) {
  const [state, setState] = useState('idle');
  const [expanded, setExpanded] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setState('running');
    setResult(null);
    try {
      const response = await onExecute(agent);
      setState('success');
      setResult(response);
    } catch (error) {
      setState('error');
      setResult(error?.message || 'Execution failed');
    }
    window.setTimeout(() => setState('idle'), 4000);
  };

  const tone = {
    idle: 'border-zinc-800 bg-zinc-900/55 hover:border-zinc-700',
    running: 'border-amber-500/35 bg-amber-500/8',
    success: 'border-emerald-500/35 bg-emerald-500/8',
    error: 'border-red-500/35 bg-red-500/8',
  }[state];

  const dot = {
    idle: 'bg-zinc-600',
    running: 'bg-amber-400 animate-pulse',
    success: 'bg-emerald-400',
    error: 'bg-red-400',
  }[state];

  return (
    <article className={`rounded-[26px] border p-5 transition-all ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            <span className="text-sm text-zinc-100">{agent.label}</span>
          </div>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-600">{agent.strategy}</div>
        </div>
        <button type="button" onClick={() => setExpanded((value) => !value)} className="btn-ghost">
          {expanded ? 'Hide brief' : 'View brief'}
        </button>
      </div>

      <p className="mt-4 text-sm leading-7 text-zinc-500">{agent.learning_goal}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(agent.params || []).map((param) => (
          <span key={param} className="rounded-full border border-zinc-800 bg-zinc-950/55 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500">
            {param}
          </span>
        ))}
      </div>

      {expanded ? (
        <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/7 p-4">
          <div className="section-kicker mb-2 text-cyan-300">Agent brief</div>
          <p className="text-sm leading-7 text-zinc-300">{agent.crux}</p>
          <label className="mt-4 flex items-start gap-3 text-sm text-zinc-300">
            <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-1" />
            <span>I understand what this agent is trying to do before I execute it.</span>
          </label>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link to={`/agents/${agent.id}`} className="btn-ghost">Explanation page</Link>
        <button type="button" onClick={run} disabled={state === 'running' || !understood} className="btn-primary disabled:opacity-40">
          {state === 'running' ? 'Running...' : 'Execute agent'}
        </button>
      </div>

      {result ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-mono ${state === 'error' ? 'border-red-500/25 bg-red-500/8 text-red-300' : 'border-emerald-500/25 bg-emerald-500/8 text-emerald-300'}`}>
          {typeof result === 'object' ? JSON.stringify(result) : String(result)}
        </div>
      ) : null}
    </article>
  );
}

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [symbol, setSymbol] = useState('AAPL');
  const [quantity, setQuantity] = useState('1');
  const [executionMode, setExecutionMode] = useState('paper');

  useEffect(() => {
    api.getLearningAgents().then(setAgents).catch(() => setAgents([]));
  }, []);

  const execute = useCallback(
    (agent) =>
      api.executeAgent({
        agent_id: agent.id,
        strategy: agent.strategy,
        symbol: symbol.trim().toUpperCase() || 'AAPL',
        quantity: Math.max(Number(quantity) || 1, 0.0001),
        execute_trade: true,
        execution_mode: executionMode,
      }),
    [executionMode, quantity, symbol],
  );

  const summary = useMemo(
    () => [
      { label: 'Agents', value: `${agents.length || 6}`, sub: 'Interactive strategy modules' },
      { label: 'Use case', value: 'Education first', sub: 'Every agent comes with a why' },
      { label: 'Mode', value: executionMode === 'live' ? 'Live broker route' : 'Paper route', sub: 'Signals use live provider quotes' },
    ],
    [agents.length, executionMode],
  );

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="hero-glow" />
        <div className="relative grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <div className="section-kicker mb-3">AI agents</div>
            <h1 className="text-3xl font-light tracking-tight text-zinc-100 sm:text-4xl">
              Learn what each agent is designed to see, why it acts, and when it should stay out.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              This page is intentionally educational. Before you click execute, review the agent's brief so you understand the setup, the edge it seeks, and the risk it is trying to manage.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {summary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/45 p-4">
                  <div className="section-kicker mb-2">{item.label}</div>
                  <div className="text-lg text-zinc-100">{item.value}</div>
                  <div className="mt-1 text-xs text-zinc-500">{item.sub}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_190px]">
              <input
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500"
                placeholder="Symbol (e.g. AAPL, BTC-USD)"
              />
              <input
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                type="number"
                min="0.0001"
                step="0.1"
                className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500"
                placeholder="Quantity"
              />
              <select
                value={executionMode}
                onChange={(event) => setExecutionMode(event.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500"
              >
                <option value="paper">Paper execution</option>
                <option value="live">Live broker execution</option>
              </select>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Live mode is safety-gated server-side. If disabled or credentials are missing, the API returns a controlled rejection without crashing.
            </p>
          </div>

          <div className="rounded-[26px] border border-zinc-800/80 bg-zinc-950/45 p-5">
            <div className="panel-title"><span>How to use this page</span></div>
            <div className="space-y-3 text-sm text-zinc-400">
              <p>1. Read the agent brief.</p>
              <p>2. Confirm you understand the crux.</p>
              <p>3. Execute against live market quotes to see how the system responds.</p>
              <p>4. Compare the output with the dashboard signal stream and the market detail page.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
        <section className="grid gap-5 md:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onExecute={execute} />
          ))}
        </section>

        <aside className="space-y-5">
          <section className="panel p-5">
            <div className="panel-title"><span>Agent families</span></div>
            <div className="space-y-3">
              {[
                ['Momentum', 'Trend-following and continuation setups'],
                ['Mean reversion', 'Contrarian entries after stretched moves'],
                ['Risk', 'Position sizing and capital preservation'],
                ['Execution', 'Trade delivery and fill logic'],
                ['Factor', 'Cross-sectional ranking and selection'],
                ['LLM strategy', 'Narrative and context interpretation'],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-950/45 px-4 py-4">
                  <div className="text-sm text-zinc-100">{title}</div>
                  <div className="mt-1 text-sm text-zinc-500">{desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-5">
            <div className="panel-title"><span>Continue learning</span></div>
            <div className="space-y-3">
              <Link to="/learn" className="btn-primary block text-center">Open learning hub</Link>
              <Link to="/dashboard" className="btn-ghost block text-center">Compare on dashboard</Link>
              <Link to="/markets/AAPL" className="btn-ghost block text-center">Test on a market page</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
