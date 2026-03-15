import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AssistantPanel from './components/AssistantPanel';
import MarketPulseBar from './components/MarketPulseBar';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Markets from './pages/Markets';
import MarketDetail from './pages/MarketDetail';
import Portfolio from './pages/Portfolio';
import Learn from './pages/Learn';
import Agents from './pages/Agents';
import Profile from './pages/Profile';
import VerifyEmail from './pages/VerifyEmail';

const FULL_PAGE_ROUTES = ['/', '/login', '/signup', '/verify-email'];

function AppLayout() {
  const location = useLocation();
  const isFullPage = FULL_PAGE_ROUTES.includes(location.pathname);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {!isFullPage && (
        <>
          <Navbar />
          <MarketPulseBar />
        </>
      )}

      <main style={isFullPage ? {} : {
        maxWidth: 1680,
        margin: '0 auto',
        padding: '24px 20px 40px',
      }}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/markets/:symbol" element={<MarketDetail />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 72, fontFamily: 'var(--font-mono)', fontWeight: 100, color: 'var(--bg-elevated)', lineHeight: 1 }}>404</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Page not found</p>
              <a href="/" className="btn-primary">Go Home</a>
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
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
