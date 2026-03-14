import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

function AgentCard({ agent, onExecute }) {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [understood, setUnderstood] = useState(false);

  const run = async () => {
    setState('running');
    setResult(null);
    try {
      const res = await onExecute(agent);
      setState('success');
      setResult(res);
    } catch (error) {
      setState('error');
      setResult(error?.message ?? 'Execution failed');
    }
    setTimeout(() => setState('idle'), 5000);
  };

  const stateRing = {
    running: 'border-amber-400/50',
    success: 'border-emerald-400/50',
    error: 'border-red-400/50',
    idle: 'border-zinc-800 hover:border-zinc-700',
  };

  const dot = { running: 'bg-amber-400 animate-pulse', success: 'bg-emerald-400', error: 'bg-red-400', idle: 'bg-zinc-600' };

  return (
    <div className={`bg-zinc-900/60 border rounded-lg p-4 transition-all ${stateRing[state]}`}>
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${dot[state]}`} />
          <div>
            <div className="text-sm text-zinc-200 font-medium">{agent.label}</div>
            <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{agent.strategy}</div>
          </div>
        </div>
        <button onClick={() => setExpanded((value) => !value)} className="text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors shrink-0">
          {expanded ? 'Hide Crux' : 'View Crux'}
        </button>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed mb-3">{agent.learning_goal}</p>

      {expanded && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 mb-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 mb-2">Agent Crux</div>
          <p className="text-xs text-zinc-300 leading-relaxed">{agent.crux}</p>
          <label className="mt-3 flex items-start gap-2 text-xs text-zinc-300">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5" />
            <span>I understand what this agent will try to do before using it.</span>
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {(agent.params ?? []).map((param) => (
          <span key={param} className="text-[9px] font-mono text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">{param}</span>
        ))}
      </div>

      <Link to={`/agents/${agent.id}`} className="inline-flex mb-3 text-[10px] font-mono uppercase tracking-wider text-cyan-300 hover:text-cyan-200">
        Open explanation page
      </Link>

      <button
        onClick={run}
        disabled={state === 'running' || !understood}
        className="text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      >
        {state === 'running' ? 'Running...' : state === 'success' ? 'Done' : 'Execute'}
      </button>

      {result && (
        <div className={`mt-3 pt-3 border-t border-zinc-800 text-xs font-mono ${state === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
          {typeof result === 'object' ? JSON.stringify(result) : String(result)}
        </div>
      )}
    </div>
  );
}

export default function Agents() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    api.getLearningAgents().then(setAgents).catch(() => setAgents([]));
  }, []);

  const handleExecute = useCallback(async (agent) => {
    return api.executeAgent({ agent_id: agent.id, strategy: agent.strategy });
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <h2 className="text-zinc-100 font-light text-xl tracking-tight">Agent Control Panel</h2>
        <p className="text-zinc-500 text-xs font-mono mt-0.5">Review the crux first, then use each agent hands-on.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((agent) => <AgentCard key={agent.id} agent={agent} onExecute={handleExecute} />)}
      </div>
    </div>
  );
}
