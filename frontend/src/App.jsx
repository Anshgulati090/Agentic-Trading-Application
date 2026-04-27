import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AssistantPanel from './components/AssistantPanel';
import MarketPulseBar from './components/MarketPulseBar';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LandingPremium from './pages/LandingPremium';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Markets from './pages/Markets';
import MarketDetail from './pages/MarketDetail';
import Portfolio from './pages/Portfolio';
import Learn from './pages/Learn';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Profile from './pages/Profile';
import VerifyEmail from './pages/VerifyEmail';

// Full page routes (no shared navbar)
const FULL_PAGE_ROUTES = ['/', '/login', '/signup', '/verify-email'];

function AppLayout() {
  const location = useLocation();
  const isFullPage = FULL_PAGE_ROUTES.includes(location.pathname);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base, #040c12)', color: '#e8f4ff' }}>
      {!isFullPage && (
        <>
          <Navbar />
          <MarketPulseBar />
        </>
      )}

      <main className={isFullPage ? '' : ''} style={isFullPage ? {} : {
        maxWidth: 1600, margin: '0 auto', padding: '20px 20px 40px',
      }}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPremium />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/markets/:symbol" element={<MarketDetail />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:agentId" element={<AgentDetail />} />

          {/* Dashboard & Portfolio */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 80, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,183,255,0.1)', fontWeight: 700 }}>404</div>
              <p style={{ color: '#4d7a96' }}>Page not found</p>
              <a href="/" className="btn-primary" style={{ textDecoration: 'none' }}>Go Home</a>
            </div>
          } />
        </Routes>
      </main>
      {!isFullPage && <AssistantPanel />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <AppLayout />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
