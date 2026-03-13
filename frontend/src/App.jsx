import { useState, useCallback, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Signals   from './pages/Signals';
import Portfolio from './pages/Portfolio';
import Agents    from './pages/Agents';
import { api }   from './services/api';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
  )},
  { id: 'signals', label: 'Signals', icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M1 11 L4 7 L7 9 L10 4 L13 6 L15 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )},
  { id: 'portfolio', label: 'Portfolio', icon: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2v5l3 3-1.4 1.4L6 9.8V3h2z" fillRule="evenodd" clipRule="evenodd"/></svg>
  )},
  { id: 'agents', label: 'Agents', icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><circle cx="8" cy="5" r="2.5"/><path d="M3 13c0-2.76 2.24-5 5-5s5 2.24 5 5" strokeLinecap="round"/></svg>
  )},
];

const PAGES = { dashboard: Dashboard, signals: Signals, portfolio: Portfolio, agents: Agents };

function HealthBadge() {
  const [status, setStatus] = useState('checking');
  const [latency, setLatency] = useState(null);

  const check = useCallback(async () => {
    const t0 = performance.now();
    try {
      const res = await api.getHealth();
      setLatency(Math.round(performance.now() - t0));
      setStatus(res !== null ? 'online' : 'degraded');
    } catch {
      setStatus('offline');
      setLatency(null);
    }
  }, []);

  useEffect(() => { check(); const t = setInterval(check, 15000); return () => clearInterval(t); }, [check]);

  const COLOR = { online: 'text-emerald-400', degraded: 'text-amber-400', offline: 'text-red-400', checking: 'text-zinc-500' };
  const DOT   = { online: 'bg-emerald-400', degraded: 'bg-amber-400', offline: 'bg-red-400', checking: 'bg-zinc-600' };

  return (
    <div className="flex items-center gap-1.5 cursor-default" title={latency ? `${latency}ms` : undefined}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[status]} ${status === 'online' ? 'animate-pulse' : ''}`} />
      <span className={`text-[10px] font-mono uppercase tracking-widest ${COLOR[status]}`}>{status}</span>
      {latency && <span className="text-[10px] font-mono text-zinc-700">{latency}ms</span>}
    </div>
  );
}

export default function App() {
  const [page, setPage]         = useState('dashboard');
  const [mobileOpen, setMobile] = useState(false);
  const [time, setTime]         = useState(new Date());
  const Page = PAGES[page];

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden" style={{ height: '100dvh' }}>

      {/* Sidebar */}
      <aside className={`
        shrink-0 w-52 bg-zinc-900 border-r border-zinc-800 flex flex-col z-50
        fixed inset-y-0 left-0 transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg border border-cyan-500/40 bg-cyan-500/8 flex items-center justify-center shrink-0">
              <span className="text-cyan-400 text-[10px] font-bold tracking-wider">AGT</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-100 tracking-tight truncate">AgenticTrading</div>
              <div className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">Multi-Agent Platform</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => { setPage(item.id); setMobile(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-all text-left ${
                page === item.id
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
              {page === item.id && <span className="ml-auto w-1 h-1 rounded-full bg-cyan-400" />}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 space-y-2 shrink-0">
          <HealthBadge />
          <div className="text-[9px] font-mono text-zinc-700 space-y-0.5">
            <div>API: localhost:8000</div>
            <div>WS:  localhost:8000</div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm" onClick={() => setMobile(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              onClick={() => setMobile(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <rect x="1" y="3" width="14" height="1.5" rx="0.75"/>
                <rect x="1" y="7.25" width="14" height="1.5" rx="0.75"/>
                <rect x="1" y="11.5" width="14" height="1.5" rx="0.75"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200 capitalize">{page}</span>
              <span className="text-zinc-700 text-xs hidden sm:inline">·</span>
              <span className="text-xs text-zinc-600 font-mono hidden sm:inline">
                {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-600 tabular-nums hidden sm:inline">
              {time.toLocaleTimeString('en-US', { hour12: false })}
            </span>
            <HealthBadge />
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          <Page />
        </main>
      </div>
    </div>
  );
}
