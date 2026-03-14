import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [status, setStatus] = useState(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState(token ? 'Verifying your email...' : 'Missing verification token.');

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.verifyEmail(token)
      .then((response) => {
        if (!active) return;
        setStatus('success');
        setMessage(response?.message || 'Email verified successfully. You can sign in now.');
      })
      .catch((error) => {
        if (!active) return;
        setStatus('error');
        setMessage(error?.message || 'Verification failed. Please request a new verification email.');
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/30">
        <div className="mb-4">
          <div className="text-xs font-mono uppercase tracking-[0.35em] text-cyan-400">AgenticTrading</div>
          <h1 className="mt-3 text-2xl font-light text-zinc-100">Email verification</h1>
          <p className="mt-2 text-sm text-zinc-500">{message}</p>
        </div>

        <div className={`rounded-xl border px-4 py-3 text-sm ${
          status === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : status === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300'
        }`}>
          {status === 'verifying' ? 'Please wait while we confirm your account.' : message}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/login" className="btn-primary text-sm">Go to Login</Link>
          <Link to="/signup" className="btn-ghost text-sm">Back to Signup</Link>
        </div>
      </div>
    </div>
  );
}
