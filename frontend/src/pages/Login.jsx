import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    setForm({ email: 'demo@agentictrading.com', password: 'demo123' });
    setError('');
    setLoading(true);
    try {
      await login('demo@agentictrading.com', 'demo123');
      navigate(from, { replace: true });
    } catch {
      // Demo user might not exist yet
      setError('Demo account not set up yet. Please register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <span className="text-cyan-400 text-xs font-bold">AGT</span>
            </div>
            <span className="font-semibold text-zinc-100">AgenticTrading</span>
          </Link>
          <h1 className="text-2xl font-light text-zinc-100 tracking-tight">Welcome back</h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in to your trading account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 text-zinc-100 rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder:text-zinc-600"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 text-zinc-100 rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder:text-zinc-600"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-semibold py-3 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={demoLogin}
            disabled={loading}
            className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 py-3 rounded-lg text-sm transition-colors font-mono"
          >
            Try Demo Account
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          No account?{' '}
          <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
