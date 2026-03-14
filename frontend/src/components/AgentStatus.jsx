import { useState, useCallback } from 'react';
import { api, ApiError } from '../services/api';

const AGENTS = [
  { id: 'momentum',      label: 'Momentum Agent',   strategy: 'momentum' },
  { id: 'mean_reversion',label: 'Mean Reversion',   strategy: 'mean_reversion' },
  { id: 'risk_manager',  label: 'Risk Manager',     strategy: 'risk' },
  { id: 'executor',      label: 'Execution Agent',  strategy: 'execution' },
  { id: 'llm_strategist',label: 'LLM Strategy Agent', strategy: 'llm' },
  { id: 'factor_model',  label: 'Factor Model Agent', strategy: 'factor' },
];

const STATE_STYLE = {
  running: { ring: 'border-amber-400/40 bg-amber-400/5',  dot: 'bg-amber-400 animate-pulse', label: 'text-amber-500' },
  success: { ring: 'border-emerald-400/40 bg-emerald-400/5', dot: 'bg-emerald-400',           label: 'text-emerald-500' },
  error:   { ring: 'border-red-400/40 bg-red-400/5',      dot: 'bg-red-400',                 label: 'text-red-500' },
  idle:    { ring: 'border-zinc-800',                     dot: 'bg-zinc-600',                label: 'text-zinc-600' },
};

export default function AgentStatus() {
  const [states, setStates] = useState({});
  const [errors, setErrors] = useState({});

  const execute = useCallback(async (agent) => {
    setStates((s) => ({ ...s, [agent.id]: 'running' }));
    setErrors((e) => ({ ...e, [agent.id]: null }));
    try {
      await api.executeAgent({ agent_id: agent.id, strategy: agent.strategy });
      setStates((s) => ({ ...s, [agent.id]: 'success' }));
    } catch (e) {
      setStates((s) => ({ ...s, [agent.id]: 'error' }));
      setErrors((errs) => ({ ...errs, [agent.id]: e instanceof ApiError ? `HTTP ${e.status}: ${e.message}` : e.message }));
    } finally {
      setTimeout(() => setStates((s) => ({ ...s, [agent.id]: 'idle' })), 4000);
    }
  }, []);

  return (
    <div className="space-y-2">
      {AGENTS.map((agent) => {
        const state = states[agent.id] || 'idle';
        const style = STATE_STYLE[state];
        const err   = errors[agent.id];
        return (
          <div key={agent.id} className={`rounded border p-3 transition-all ${style.ring}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                <div>
                  <div className="text-xs text-zinc-200 font-medium">{agent.label}</div>
                  <div className={`text-[10px] font-mono uppercase tracking-wider ${style.label}`}>
                    {state}
                  </div>
                </div>
              </div>
              <button
                onClick={() => execute(agent)}
                disabled={state === 'running'}
                className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {state === 'running' ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 border border-zinc-500 border-t-cyan-400 rounded-full animate-spin inline-block" />
                    Running
                  </span>
                ) : 'Execute'}
              </button>
            </div>
            {err && (
              <div className="mt-2 text-[10px] font-mono text-red-400 truncate" title={err}>{err}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
