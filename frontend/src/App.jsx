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

// Pages that render their own navbar (full-page layouts)
const FULL_PAGE_ROUTES = ['/', '/login', '/signup', '/verify-email'];

function AppLayout() {
  const location = useLocation();
  const isFullPage = FULL_PAGE_ROUTES.includes(location.pathname);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Show shared navbar on all pages except landing/auth */}
      {!isFullPage && (
        <>
          <Navbar />
          <MarketPulseBar />
        </>
      )}

      <main className={isFullPage ? '' : 'max-w-[1820px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-7'}>
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

          {/* Dashboard & Portfolio: accessible without auth, but richer when signed in */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
              <div className="text-6xl font-light font-mono text-zinc-800">404</div>
              <p className="text-zinc-500">Page not found</p>
              <a href="/" className="btn-primary text-sm">Go Home</a>
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
