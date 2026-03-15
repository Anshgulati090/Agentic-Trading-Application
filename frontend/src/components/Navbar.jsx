import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { searchMarkets } from '../data/marketCatalog';

const NAV_LINKS = [
  { to: '/markets', label: 'Markets' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/learn', label: 'Learn' },
  { to: '/agents', label: 'AI Agents' },
  { to: '/portfolio', label: 'Portfolio' },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const isActive = (to) => location.pathname.startsWith(to);

  // Search debounce
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed) { setSuggestions([]); return; }
      try {
        const [remote, local] = await Promise.allSettled([
          api.searchSymbols(trimmed),
          Promise.resolve(searchMarkets(trimmed)),
        ]);
        const remoteResults = remote.status === 'fulfilled' ? (remote.value?.results || []) : [];
        const localResults = local.status === 'fulfilled' ? local.value : [];
        const merged = Array.from(
          new Map([...localResults, ...remoteResults].map(i => [i.symbol, i])).values()
        ).slice(0, 8);
        setSuggestions(merged);
        setSelectedSuggestion(-1);
      } catch {
        setSuggestions(searchMarkets(trimmed).slice(0, 8));
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Click outside close
  useEffect(() => {
    const handler = (e) => {
      if (!searchRef.current?.contains(e.target)) {
        setSearchFocused(false);
        setSuggestions([]);
      }
      if (!dropdownRef.current?.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const submitSearch = (e) => {
    e?.preventDefault();
    if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
      navigate(`/markets/${suggestions[selectedSuggestion].symbol}`);
    } else if (suggestions.length > 0) {
      navigate(`/markets/${suggestions[0].symbol}`);
    } else if (query.trim().length >= 1) {
      navigate(`/markets/${query.trim().toUpperCase()}`);
    }
    setQuery('');
    setSuggestions([]);
    setSearchFocused(false);
  };

  const handleKeyDown = (e) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedSuggestion(p => Math.min(p + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedSuggestion(p => Math.max(p - 1, -1)); }
    if (e.key === 'Escape') { setSuggestions([]); setSearchFocused(false); }
  };

  const pickSuggestion = (sym) => {
    navigate(`/markets/${sym}`);
    setQuery('');
    setSuggestions([]);
    setSearchFocused(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  const displayName = useMemo(() => user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Account', [user]);
  const demoBalance = useMemo(() => Number(user?.demo_balance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }), [user]);

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(8,11,15,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1680, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 60 }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,230,118,0.1))',
              border: '1px solid rgba(0,212,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 10, fontWeight: 600,
              color: 'var(--accent-cyan)',
              letterSpacing: '0.05em',
            }}>AGT</div>
            <div className="hidden lg:block">
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>AgenticTrading</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginTop: 2 }}>AI Learning Platform</div>
            </div>
          </Link>

          {/* Search */}
          <div ref={searchRef} style={{ flex: 1, maxWidth: 520, position: 'relative' }} className="hidden md:block">
            <form onSubmit={submitSearch}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', flexShrink: 0 }}
                  width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search symbol or company…"
                  style={{
                    width: '100%',
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${searchFocused ? 'rgba(0,212,255,0.4)' : 'var(--border-subtle)'}`,
                    borderRadius: 8,
                    padding: '8px 12px 8px 36px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setSuggestions([]); }}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </form>

            {/* Suggestions Dropdown */}
            {searchFocused && suggestions.length > 0 && (
              <div className="animate-fade-in-fast" style={{
                position: 'absolute',
                top: '100%',
                left: 0, right: 0,
                marginTop: 6,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 12,
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                zIndex: 100,
              }}>
                {suggestions.map((item, i) => (
                  <button key={item.symbol} type="button" onClick={() => pickSuggestion(item.symbol)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', textAlign: 'left', background: i === selectedSuggestion ? 'var(--bg-hover)' : 'transparent',
                      border: 'none', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={() => setSelectedSuggestion(i)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent-cyan)', minWidth: 52 }}>{item.symbol}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {item.sector || item.type}
                    </span>
                  </button>
                ))}
                <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>↑↓ navigate · ↵ select · esc close</span>
                </div>
              </div>
            )}
          </div>

          {/* Nav Links */}
          <div className="hidden xl:flex" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {NAV_LINKS.map(link => (
              <Link key={link.to} to={link.to} style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: isActive(link.to) ? 500 : 400,
                color: isActive(link.to) ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive(link.to) ? 'var(--bg-hover)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!isActive(link.to)) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}}
              onMouseLeave={e => { if (!isActive(link.to)) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right section */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* AI Assistant Button */}
            <button
              onClick={() => window.dispatchEvent(new Event('agentic:assistant-open'))}
              className="hidden md:flex"
              style={{
                alignItems: 'center', gap: 6,
                padding: '6px 12px',
                background: 'var(--accent-cyan-dim)',
                border: '1px solid rgba(0,212,255,0.25)',
                borderRadius: 6, cursor: 'pointer',
                fontSize: 12, color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-cyan-dim)'; }}
            >
              <span>AI</span>
            </button>

            {/* Auth */}
            {isAuthenticated ? (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button onClick={() => setUserMenuOpen(v => !v)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px 5px 5px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8, cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 6,
                    background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(0,230,118,0.2))',
                    border: '1px solid rgba(0,212,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {displayName[0]?.toUpperCase()}
                  </div>
                  <div className="hidden sm:block" style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{displayName}</div>
                    <div style={{ fontSize: 10, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>${demoBalance}</div>
                  </div>
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth={2} className="hidden sm:block">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="animate-fade-in-fast" style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    width: 220,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 12,
                    boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    zIndex: 100,
                  }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{user?.full_name || displayName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
                    </div>
                    <div style={{ padding: '6px 6px' }}>
                      {[
                        { to: '/dashboard', label: 'Dashboard' },
                        { to: '/portfolio', label: 'Portfolio' },
                        { to: '/profile', label: 'Settings' },
                      ].map(item => (
                        <Link key={item.to} to={item.to} onClick={() => setUserMenuOpen(false)} style={{
                          display: 'block', padding: '8px 10px',
                          borderRadius: 6, fontSize: 13,
                          color: 'var(--text-secondary)', textDecoration: 'none',
                          transition: 'all 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >{item.label}</Link>
                      ))}
                      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                      <button onClick={handleLogout} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 10px', borderRadius: 6, fontSize: 13,
                        color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-red-dim)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >Sign out</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link to="/login" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', padding: '6px 10px' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >Login</Link>
                <Link to="/signup" className="btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}>Get Started</Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(v => !v)} className="xl:hidden" style={{
              padding: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
              borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="animate-fade-in xl:hidden" style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 0 16px' }}>
            <div style={{ marginBottom: 12 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search symbol or company…"
                className="input"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV_LINKS.map(link => (
                <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                  style={{
                    padding: '9px 12px', borderRadius: 6, fontSize: 14,
                    color: isActive(link.to) ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: isActive(link.to) ? 'var(--bg-hover)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >{link.label}</Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
