import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/markets', label: 'Markets' },
  { to: '/learn', label: 'Learn' },
  { to: '/dashboard', label: 'Dashboard' },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <span className="text-cyan-400 text-[9px] font-bold">AGT</span>
            </div>
            <span className="font-semibold text-zinc-100 text-sm tracking-tight hidden sm:block">AgenticTrading</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 flex-1">
            {NAV_LINKS.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive(to, exact)
                    ? 'text-zinc-100 bg-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-[10px] font-bold shrink-0">
                    {(user?.full_name || user?.email || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-zinc-300 hidden sm:block max-w-24 truncate">{user?.full_name || user?.email}</span>
                  <svg className="w-3 h-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <div className="text-xs font-medium text-zinc-200 truncate">{user?.full_name || 'Trader'}</div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate">{user?.email}</div>
                      {user?.demo_balance != null && (
                        <div className="text-[10px] text-cyan-400 font-mono mt-1">
                          ${Number(user.demo_balance).toLocaleString('en-US', { maximumFractionDigits: 0 })} demo balance
                        </div>
                      )}
                    </div>
                    <div className="p-1">
                      <Link to="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                        📊 Dashboard
                      </Link>
                      <Link to="/portfolio" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                        💼 Portfolio
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left">
                        ↩ Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors hidden sm:block">Login</Link>
                <Link to="/signup" className="btn-primary text-xs">Get Started</Link>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-zinc-800 py-3 space-y-1">
            {NAV_LINKS.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive(to, exact) ? 'text-zinc-100 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="pt-2 border-t border-zinc-800 flex gap-2 px-3">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-ghost flex-1 text-center">Login</Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="btn-primary flex-1 text-center">Sign Up</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
