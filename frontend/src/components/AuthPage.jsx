import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

const PASSWORD_HINTS = [
  "At least 8 characters",
  "Use upper and lower case",
  "Add a number or symbol for stronger access control",
];

export default function AuthPage({ mode = "login", onSubmit }) {
  const isSignup = mode === "signup";
  const [email, setEmail] = useState(isSignup ? "" : "trader01@agentic.dev");
  const [password, setPassword] = useState(isSignup ? "" : "Trader@123");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validationError = useMemo(() => {
    if (!email.trim()) return "Enter your email address";
    if (!email.includes("@")) return "Enter a valid email address";
    if (!password) return "Enter your password";
    if (isSignup && password.length < 8) return "Password must be at least 8 characters";
    if (isSignup && displayName.trim().length < 2) return "Display name must be at least 2 characters";
    if (isSignup && password !== confirmPassword) return "Passwords do not match";
    return "";
  }, [confirmPassword, displayName, email, isSignup, password]);

  const submit = async (event) => {
    event.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onSubmit({
        email: email.trim(),
        password,
        display_name: displayName.trim() || email.split("@")[0],
      });
    } catch (err) {
      setError(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.1fr,0.9fr] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900/70 shadow-2xl shadow-cyan-950/20">
        <div className="p-8 lg:p-10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_38%),linear-gradient(180deg,rgba(24,24,27,0.95),rgba(9,9,11,0.98))]">
          <div className="text-cyan-400 font-mono text-xs uppercase tracking-[0.3em] mb-4">{isSignup ? "Create Access" : "Secure Access"}</div>
          <h1 className="text-4xl font-light tracking-tight">{isSignup ? "Start your demo trading workspace." : "Access your trading workspace."}</h1>
          <p className="text-zinc-400 mt-4 max-w-xl">
            {isSignup
              ? "Create your user profile, get demo credits, explore AI trading agents, and practice without risking real money."
              : "Sign in to continue your learning path, monitor signals, and manage your practice portfolio."}
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mt-8">
            {[
              ["Demo Credits", "$100,000 default balance for guided practice trades."],
              ["Agent Briefings", "Understand what each agent will do before using it."],
              ["Live Practice", "Practice against live prices while keeping capital simulated."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="text-zinc-100">{title}</div>
                <div className="text-zinc-500 text-sm mt-2">{body}</div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="p-8 lg:p-10 space-y-4">
          <div>
            <div className="text-cyan-400 font-mono text-xs uppercase tracking-[0.3em] mb-3">{isSignup ? "Signup" : "Login"}</div>
            <h2 className="text-3xl font-light">{isSignup ? "Create your account" : "Welcome back"}</h2>
          </div>

          {isSignup && (
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}

          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {isSignup && (
            <>
              <input
                type="password"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-sm text-zinc-400">
                {PASSWORD_HINTS.map((hint) => (
                  <div key={hint}>{hint}</div>
                ))}
              </div>
            </>
          )}

          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

          <button disabled={loading} className="w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50">
            {loading ? "Please wait..." : isSignup ? "Create Account" : "Login"}
          </button>

          <div className="text-sm text-zinc-500">
            {isSignup ? "Already have an account?" : "Need an account?"}{" "}
            <Link to={isSignup ? "/login" : "/signup"} className="text-cyan-300 hover:text-cyan-200">
              {isSignup ? "Login" : "Sign up"}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
