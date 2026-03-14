import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    icon: '🤖',
    title: 'Multi-Agent Trading',
    desc: 'Watch momentum, mean reversion, and factor agents collaborate in real time to generate high-quality signals.',
  },
  {
    icon: '📡',
    title: 'Real-Time Signals',
    desc: 'Live WebSocket streams deliver signals with confidence scores and agent explanations as they happen.',
  },
  {
    icon: '📊',
    title: 'Portfolio Analytics',
    desc: 'Sharpe ratio, Sortino, max drawdown, alpha/beta — institutional-grade metrics on your demo portfolio.',
  },
  {
    icon: '🎓',
    title: 'Learn by Doing',
    desc: 'Every agent explains its logic. Understand WHY trades are made, not just what happens.',
  },
];

const STEPS = [
  { n: '01', title: 'Create a free account', desc: 'Get a $100,000 paper trading account instantly — no credit card required.' },
  { n: '02', title: 'Watch agents trade', desc: 'Our AI agents analyze markets in real time and generate buy/sell signals with explanations.' },
  { n: '03', title: 'Practice & learn', desc: 'Execute simulated trades, track your P&L, and understand every decision.' },
  { n: '04', title: 'Go live when ready', desc: 'Connect to Alpaca, Interactive Brokers, or Binance when you\'re confident.' },
];

const TICKERS = ['AAPL +1.24%', 'NVDA +3.17%', 'TSLA -0.89%', 'META +2.05%', 'GOOGL +0.61%', 'MSFT +1.42%', 'AMZN -0.33%', 'BTC +4.21%'];

function TickerBanner() {
  return (
    <div className="bg-zinc-900 border-b border-zinc-800 overflow-hidden py-2">
      <div className="flex animate-ticker whitespace-nowrap">
        {[...TICKERS, ...TICKERS].map((t, i) => (
          <span key={i} className={`inline-block mx-6 text-xs font-mono ${t.includes('+') ? 'text-emerald-400' : 'text-red-400'}`}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* Ticker */}
      <TickerBanner />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <span className="text-cyan-400 text-[10px] font-bold">AGT</span>
            </div>
            <span className="font-semibold text-zinc-100 tracking-tight">AgenticTrading</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">How It Works</a>
            <Link to="/markets" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Markets</Link>
            <Link to="/learn" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Learn</Link>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard" className="bg-cyan-500 hover:bg-cyan-400 text-zinc-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Login</Link>
                <Link to="/signup" className="bg-cyan-500 hover:bg-cyan-400 text-zinc-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                  Start Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono text-cyan-400">Multi-Agent AI · Live Signals · Paper Trading</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight mb-6 leading-[1.05]">
            Learn AI-Assisted
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Trading
            </span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Practice with a $100K paper portfolio. Watch AI agents analyze markets, generate signals, and explain every decision in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-zinc-900 font-semibold px-8 py-4 rounded-xl text-base transition-all hover:scale-105 shadow-lg shadow-cyan-500/25"
            >
              Start Demo Trading Free →
            </Link>
            <Link
              to="/markets"
              className="w-full sm:w-auto border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 font-medium px-8 py-4 rounded-xl text-base transition-all"
            >
              Explore Markets
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-600 font-mono">No real money. No credit card. $100,000 paper account instantly.</p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-800/60 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: '6', unit: 'AI Agents', sub: 'Active strategies' },
            { v: '$100K', unit: 'Paper Balance', sub: 'Per demo account' },
            { v: '2s', unit: 'Signal Latency', sub: 'WebSocket stream' },
            { v: '7+', unit: 'Markets', sub: 'Stocks & crypto' },
          ].map((s) => (
            <div key={s.v}>
              <div className="text-3xl font-light text-cyan-400 tabular-nums">{s.v}</div>
              <div className="text-sm font-medium text-zinc-300 mt-1">{s.unit}</div>
              <div className="text-xs text-zinc-600 font-mono">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-3">Features</div>
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight">Everything you need to learn trading</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 hover:border-zinc-600 transition-colors group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-zinc-100 mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-zinc-900/30 border-y border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-3">Process</div>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-zinc-700 to-transparent z-0" />
                )}
                <div className="relative z-10">
                  <div className="text-4xl font-light text-zinc-800 font-mono mb-4">{s.n}</div>
                  <h3 className="font-semibold text-zinc-100 mb-2">{s.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-12">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-4">
            Ready to start learning?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
            Join thousands of traders using AI to understand markets. Free forever — no real money at risk.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-cyan-500 hover:bg-cyan-400 text-zinc-900 font-semibold px-10 py-4 rounded-xl text-base transition-all hover:scale-105 shadow-lg shadow-cyan-500/25"
          >
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <span className="text-cyan-400 text-[8px] font-bold">AGT</span>
            </div>
            <span className="text-sm text-zinc-500">AgenticTrading — Educational platform only. Not financial advice.</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-600">
            <Link to="/markets" className="hover:text-zinc-400 transition-colors">Markets</Link>
            <Link to="/learn" className="hover:text-zinc-400 transition-colors">Learn</Link>
            <Link to="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
