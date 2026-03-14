import { useState } from "react";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("trader01");
  const [password, setPassword] = useState("Trader@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl shadow-cyan-950/20">
        <div className="mb-6">
          <div className="text-cyan-400 text-xs font-mono uppercase tracking-[0.3em] mb-3">Secure Access</div>
          <h1 className="text-3xl font-light tracking-tight">Sign In</h1>
          <p className="text-zinc-500 text-sm mt-2">Access your trading workspace with your user ID and password.</p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">User ID</span>
            <input
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Password</span>
            <input
              type="password"
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Open Dashboard"}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 text-xs text-zinc-400">
          <div className="font-mono uppercase tracking-widest text-zinc-500 mb-2">Demo Users</div>
          <div>`trader01` / `Trader@123`</div>
          <div>`analyst01` / `Analyst@123`</div>
        </div>
      </div>
    </div>
  );
}
