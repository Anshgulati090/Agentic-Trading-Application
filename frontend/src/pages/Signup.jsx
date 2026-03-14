import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', full_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await register(form.email, form.password, form.full_name);
      navigate('/login', {
        replace: true,
        state: {
          message: response.message || 'Account created. Please verify your email before signing in.',
          email: form.email,
          verificationPreviewUrl: response.verification_preview_url || '',
        },
      });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <span className="text-cyan-400 text-xs font-bold">AGT</span>
            </div>
            <span className="font-semibold text-zinc-100">AgenticTrading</span>
          </Link>
          <h1 className="text-2xl font-light text-zinc-100 tracking-tight">Create your account</h1>
          <p className="text-sm text-zinc-500 mt-1">Get your free demo balance and verify your email to continue</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mb-6 space-y-2">
          {['$100,000 demo trading balance', 'Real-time AI signal stream', 'Full portfolio analytics', 'No credit card required'].map((perk) => (
            <div key={perk} className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <span className="text-emerald-400">+</span> {perk}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Full Name (optional)</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 text-zinc-100 rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder:text-zinc-600"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 text-zinc-100 rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder:text-zinc-600"
              placeholder="Min. 6 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              required
              minLength={6}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 text-zinc-100 rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder:text-zinc-600"
              placeholder="Repeat your password"
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
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-900 font-semibold py-3 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Free Account'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">Sign in</Link>
        </p>

        <p className="text-center text-[10px] text-zinc-700 font-mono mt-4">
          Educational platform only. No real trades executed.
        </p>
      </div>
    </div>
  );
}
