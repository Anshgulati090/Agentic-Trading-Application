import { useState, useCallback } from 'react';
import { api } from '../services/api';

const AGENT_CONFIGS = [
  { id: 'momentum', label: 'Momentum Agent', strategy: 'momentum', description: 'Trend-following strategy based on price momentum signals over 20/50 day windows.', params: ['lookback_period', 'threshold', 'position_size'] },
  { id: 'mean_reversion', label: 'Mean Reversion Agent', strategy: 'mean_reversion', description: 'Identifies and trades deviations from statistical mean using Z-score analysis.', params: ['window', 'z_threshold', 'max_hold_days'] },
  { id: 'risk_manager', label: 'Risk Manager', strategy: 'risk', description: 'Enforces portfolio risk constraints: position limits, exposure caps, drawdown controls.', params: ['max_position_pct', 'max_drawdown', 'var_limit'] },
  { id: 'executor', label: 'Execution Agent', strategy: 'execution', description: 'Smart order routing with slippage minimization and execution timing optimization.', params: ['order_type', 'slice_count', 'urgency'] },
  { id: 'llm_strategist', label: 'LLM Strategy Agent', strategy: 'llm', description: 'LLM-assisted signal generation using market sentiment and news analysis.', params: ['model', 'context_window', 'confidence_threshold'] },
  { id: 'factor_model', label: 'Factor Model Agent', strategy: 'factor', description: 'Multi-factor alpha generation: value, quality, momentum, low-volatility.', params: ['factors', 'rebalance_freq', 'universe_size'] },
];

function AgentCard({ agent, onExecute }) {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);

  const run = async () => {
    setState('running');
    setResult(null);
    try {
      const res = await onExecute(agent);
      setState('success');
      setResult(res);
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 5000);
  };

  const STATE_RING = {
    running: 'border-amber-400/50',
    success: 'border-emerald-400/50',
    error: 'border-red-400/50',
    idle: 'border-zinc-800 hover:border-zinc-700',
  };

  const DOT = { running: 'bg-amber-400 animate-pulse', success: 'bg-emerald-400', error: 'bg-red-400', idle: 'bg-zinc-600' };

  return (
    <div className={`bg-zinc-900/60 border rounded-lg p-4 transition-all ${STATE_RING[state]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${DOT[state]}`} />
          <div>
            <div className="text-sm text-zinc-200 font-medium">{agent.label}</div>
            <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{agent.strategy}</div>
          </div>
        </div>
        <button onClick={run} disabled={state === 'running'} className="text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
          {state === 'running' ? 'Running...' : state === 'success' ? 'Done' : 'Execute'}
        </button>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed mb-3">{agent.description}</p>
      <div className="flex flex-wrap gap-1">
        {agent.params.map((p) => (
          <span key={p} className="text-[9px] font-mono text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">{p}</span>
        ))}
      </div>
      {result && (
        <div className="mt-3 pt-3 border-t border-zinc-800 text-xs font-mono text-emerald-400">
          {typeof result === 'object' ? JSON.stringify(result) : String(result)}
        </div>
      )}
    </div>
  );
}

export default function Agents() {
  const handleExecute = useCallback(async (agent) => api.executeAgent({ agent_id: agent.id, strategy: agent.strategy }), []);
  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <h2 className="text-zinc-100 font-light text-xl tracking-tight">Agent Control Panel</h2>
        <p className="text-zinc-500 text-xs font-mono mt-0.5">Manage and execute trading agents via /agents/execute</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {AGENT_CONFIGS.map((agent) => <AgentCard key={agent.id} agent={agent} onExecute={handleExecute} />)}
      </div>
    </div>
  );
}
