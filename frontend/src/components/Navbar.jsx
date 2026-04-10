import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { searchMarkets } from '../data/marketCatalog';

const NAV_LINKS = [
  { to: '/markets',   label: 'Markets' },
  { to: '/learn',     label: 'Learn' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/profile',   label: 'Profile' },
  { to: '/agents',    label: 'AI Agents' },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const inputRef  = useRef(null);

  const isActive = (to) => location.pathname.startsWith(to);

  /* Search suggestions — local first (instant), then merge remote */
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) { setSuggestions([]); return; }

    // Show local results instantly (no delay)
    const local = searchMarkets(trimmed, 8);
    setSuggestions(local);
    setShowSearch(true);

    // Then merge backend results asynchronously
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.searchSymbols(trimmed);
        // Handle both {data:{results:[]}} and {results:[]} shapes
        const raw = response?.data || response;
        const remote = Array.isArray(raw) ? raw : (raw?.results || []);
        if (!remote.length) return;
        setSuggestions((prev) =>
          Array.from(new Map([...prev, ...remote].map((i) => [i.symbol, i])).values()).slice(0, 8)
        );
      } catch {
        // local results already shown — ignore backend errors
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  /* Click outside to close suggestions */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Keyboard shortcut ⌘K / Ctrl+K */
  useEffect(() => {
    const k = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') { setShowSearch(false); setSuggestions([]); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const handleSelect = (symbol) => {
    setQuery('');
    setSuggestions([]);
    setShowSearch(false);
    navigate(`/markets/${symbol}`);
  };

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 90,
        background: 'rgba(4, 12, 18, 0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 183, 255, 0.1)',
        boxShadow: '0 1px 30px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 56, gap: 8 }}>

          {/* Logo */}
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #0099cc 0%, #00e676 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#000', fontFamily: 'JetBrains Mono, monospace',
              boxShadow: '0 0 12px rgba(0,212,255,0.4)',
              flexShrink: 0,
            }}>
              AGT
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e8f4ff', letterSpacing: '-0.02em' }}>AgenticTrading</span>
              <span style={{ fontSize: 9, color: '#3d607a', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>AI-Powered</span>
            </div>
          </Link>

          {/* Search bar */}
          <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: 340, marginLeft: 8 }}>
            <div
              onClick={() => { setShowSearch(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(10, 21, 32, 0.9)',
                border: `1px solid ${showSearch ? 'rgba(0,212,255,0.4)' : 'rgba(0,183,255,0.1)'}`,
                borderRadius: 8, padding: '0 12px', height: 34, cursor: 'text',
                transition: 'border-color 0.2s',
                boxShadow: showSearch ? '0 0 0 3px rgba(0,212,255,0.08)' : 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3d607a" strokeWidth={2.5}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSearch(true); }}
                placeholder="Search markets, companies or symbols..."
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 13, color: '#e8f4ff', width: '100%', fontFamily: 'inherit',
                }}
              />
              <kbd style={{
                fontSize: 9, color: '#3d607a', border: '1px solid rgba(0,183,255,0.12)',
                borderRadius: 4, padding: '2px 5px', fontFamily: 'JetBrains Mono, monospace',
                flexShrink: 0, letterSpacing: '0.05em',
              }}>⌘K</kbd>
            </div>

            {/* Suggestions dropdown */}
            {showSearch && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: '#071018', border: '1px solid rgba(0,183,255,0.2)',
                borderRadius: 10, overflow: 'hidden',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)', zIndex: 100,
              }}>
                {suggestions.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => handleSelect(item.symbol)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '10px 14px', background: 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      borderBottom: '1px solid rgba(0,183,255,0.05)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,183,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#00d4ff', fontWeight: 600 }}>
                        {item.symbol}
                      </div>
                      <div style={{ fontSize: 11, color: '#4d7a96', marginTop: 1 }}>{item.name}</div>
                    </div>
                    <div style={{ fontSize: 10, color: '#3d607a', fontFamily: 'JetBrains Mono, monospace' }}>
                      {item.sector}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nav links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 8 }}>
            {NAV_LINKS.map(({ to, label }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#00d4ff' : '#7a9ab5',
                    textDecoration: 'none',
                    background: active ? 'rgba(0,212,255,0.08)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(0,212,255,0.2)' : 'transparent'}`,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = '#e8f4ff'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = '#7a9ab5'; e.currentTarget.style.background = 'transparent'; } }}
                >
                  {active && <span style={{ marginRight: 4, fontSize: 8, color: '#00d4ff' }}>●</span>}
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* AI Assistant button */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('agentic:assistant-open'))}
            style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12,
              background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.18)',
              color: '#00d4ff', cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.18)'; }}
          >
            AI Assistant
          </button>

          {/* Auth */}
          {isAuthenticated ? (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(0,183,255,0.06)', border: '1px solid rgba(0,183,255,0.15)',
                  borderRadius: 8, padding: '5px 10px', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: 'linear-gradient(135deg, #0099cc, #00e676)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#000',
                }}>
                  {(user?.display_name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 12, color: '#7a9ab5' }}>▾</span>
              </button>
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 180,
                  background: '#071018', border: '1px solid rgba(0,183,255,0.15)',
                  borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', zIndex: 100,
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,183,255,0.08)' }}>
                    <div style={{ fontSize: 12, color: '#e8f4ff', fontWeight: 600 }}>{user?.display_name || 'Trader'}</div>
                    <div style={{ fontSize: 10, color: '#3d607a', marginTop: 2 }}>{user?.email}</div>
                  </div>
                  {[
                    { label: 'Portfolio', to: '/portfolio' },
                    { label: 'Profile', to: '/profile' },
                  ].map(({ label, to }) => (
                    <Link
                      key={to} to={to}
                      onClick={() => setUserMenuOpen(false)}
                      style={{ display: 'block', padding: '9px 14px', fontSize: 13, color: '#7a9ab5', textDecoration: 'none', transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,183,255,0.06)'; e.currentTarget.style.color = '#e8f4ff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a9ab5'; }}
                    >
                      {label}
                    </Link>
                  ))}
                  <button
                    type="button" onClick={() => { logout(); setUserMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', padding: '9px 14px', fontSize: 13, color: '#ff3d57', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderTop: '1px solid rgba(0,183,255,0.08)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,61,87,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Link to="/login" style={{ padding: '5px 12px', borderRadius: 6, fontSize: 13, color: '#7a9ab5', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e8f4ff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#7a9ab5'}>
                Login
              </Link>
              <Link to="/signup" style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: 'linear-gradient(135deg, #0099cc, #00b8e6)',
                color: '#000', textDecoration: 'none',
                boxShadow: '0 2px 12px rgba(0,180,220,0.3)', transition: 'all 0.2s',
              }}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ padding: '0.5rem 1.25rem 1rem', borderTop: '1px solid rgba(0,183,255,0.08)' }}>
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)}
              style={{ display: 'block', padding: '8px 0', color: isActive(to) ? '#00d4ff' : '#7a9ab5', textDecoration: 'none', fontSize: 14 }}>
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
