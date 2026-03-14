import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthPage from "./components/AuthPage";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import Portfolio from "./pages/Portfolio";
import Signals from "./pages/Signals";
import Landing from "./pages/Landing";
import Learn from "./pages/Learn";
import Markets from "./pages/Markets";
import MarketDetail from "./pages/MarketDetail";
import { searchMarkets } from "./data/marketCatalog";
import { api, getStoredUser } from "./services/api";

function ProtectedRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

function Navbar({ user, onLogout }) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      api.suggestSymbols(search.trim(), 6).then((items) => setSuggestions(items ?? [])).catch(() => setSuggestions([]));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [search]);

  const goToSymbol = async (value) => {
    const normalized = value.trim();
    if (!normalized) return;
    const resolved = await api.resolveSymbol(normalized).catch(() => null);
    const profile = resolved ?? searchMarkets(normalized).find((item) => item.symbol === normalized.toUpperCase());
    if (profile?.symbol) {
      navigate(`/markets/${profile.symbol}`);
    } else {
      navigate(`/markets?q=${encodeURIComponent(normalized)}`);
    }
    setSearch("");
    setOpen(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    await goToSymbol(search);
  };

  const isActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const navItem = (to, label) => (
    <Link to={to} className={`text-sm ${isActive(to) ? "text-cyan-300" : "text-zinc-400 hover:text-zinc-100"}`}>{label}</Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4 justify-between">
        <Link to="/" className="text-zinc-100 font-semibold tracking-tight">AgenticTrading</Link>
        <nav className="flex items-center gap-4">
          {navItem("/", "Home")}
          {navItem("/markets", "Markets")}
          {navItem("/learn", "Learn")}
          {navItem("/dashboard", "Dashboard")}
          {user && navItem("/profile", "Profile")}
          {!user && navItem("/login", "Login")}
          {!user && navItem("/signup", "Signup")}
        </nav>
        <div className="flex items-center gap-3">
          <div className="relative">
            <form onSubmit={submit}>
              <input
                value={search}
                onFocus={() => setOpen(true)}
                onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Nvidia, Tesla, Bitcoin"
                className="w-64 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </form>
            {open && suggestions.length > 0 && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl overflow-hidden">
                {suggestions.map((item) => (
                  <button
                    key={item.symbol}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToSymbol(item.symbol)}
                    className="w-full px-4 py-3 text-left hover:bg-zinc-900 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-zinc-100">{item.name}</div>
                        <div className="text-xs text-zinc-500 mt-1">{item.symbol} - {item.type}</div>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest text-cyan-300">{item.exchange}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {user && (
            <button onClick={onLogout} className="rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-cyan-500 hover:text-cyan-300">
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Shell({ user, setUser }) {
  const navigate = useNavigate();

  const handleLogin = async ({ email, password }) => {
    const loggedIn = await api.login(email, password);
    setUser(loggedIn);
    navigate("/dashboard");
  };

  const handleSignup = async ({ email, password, display_name }) => {
    const registered = await api.register({ email, password, display_name });
    setUser(registered);
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    navigate("/");
  };

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <main className="min-h-[calc(100vh-72px)] bg-zinc-950 text-zinc-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/markets/:symbol" element={<MarketDetail />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="login" onSubmit={handleLogin} />} />
            <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="signup" onSubmit={handleSignup} />} />
            <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><Profile /></ProtectedRoute>} />
            <Route path="/signals" element={<ProtectedRoute user={user}><Signals /></ProtectedRoute>} />
            <Route path="/portfolio" element={<ProtectedRoute user={user}><Portfolio /></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute user={user}><Agents /></ProtectedRoute>} />
            <Route path="/agents/:agentId" element={<ProtectedRoute user={user}><AgentDetail /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    if (!user) return;
    api.getMe().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Shell user={user} setUser={setUser} />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
