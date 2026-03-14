import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";

export default function AgentDetail() {
  const { agentId = "momentum" } = useParams();
  const [agent, setAgent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getLearningAgent(agentId).then(setAgent).catch((err) => setError(err?.message ?? "Unable to load agent"));
  }, [agentId]);

  if (error) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">{error}</div>;
  }

  if (!agent) {
    return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-500">Loading agent...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-cyan-400 font-mono text-xs uppercase tracking-[0.3em] mb-3">Agent Explanation</div>
        <h1 className="text-4xl font-light text-zinc-100">{agent.label}</h1>
        <p className="text-zinc-400 mt-3 max-w-3xl">{agent.crux}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-zinc-100 text-lg">What the agent does</div>
          <div className="text-zinc-400 mt-3">{agent.learning_goal}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-zinc-100 text-lg">When it trades</div>
          <div className="text-zinc-400 mt-3">{agent.when_it_trades}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-zinc-100 text-lg">How the strategy works</div>
          <div className="text-zinc-400 mt-3">{agent.crux}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-zinc-100 text-lg">Example trade</div>
          <div className="text-zinc-400 mt-3">{agent.example_trade}</div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link to="/agents" className="rounded-lg border border-zinc-700 px-5 py-3 text-sm text-zinc-300 hover:border-cyan-500 hover:text-cyan-300">Back to agents</Link>
        <Link to="/learn" className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-sm text-cyan-300 hover:bg-cyan-500/20">Go to learning mode</Link>
      </div>
    </div>
  );
}
