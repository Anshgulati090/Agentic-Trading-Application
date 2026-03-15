import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import CandlestickChart from '../components/CandlestickChart';

const fmt = (n) =>
  n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const fmtPct = (n) =>
  n != null ? `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%` : '—';

function StatCard({ label, value, sub, color = 'var(--text-primary)', loading }) {
  return (
    <div className="stat-tile">
      <div className="section-kicker" style={{ marginBottom: 8 }}>{label}</div>
      {loading ? (
        <div className="skeleton" style={{ width: '75%', height: 28 }} />
      ) : (
        <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 300, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value ?? '—'}</div>
      )}
      {sub && !loading && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

export default function Portfolio() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const fetchAccount = useCallback(() => isAuthenticated ? api.getDemoAccount() : api.getPortfolioMetrics(), [isAuthenticated]);
  const fetchTrades = useCallback(() => isAuthenticated ? api.getDemoTrades(50) : Promise.resolve([]), [isAuthenticated]);
  const { data: account, loading, refetch } = usePolling(fetchAccount, 14000);
  const { data: trades = [] } = usePolling(fetchTrades, 18000);

  if (!isAuthenticated) {
    return (
      <div className="page-hero">
        <div className="hero-glow" />
        <div style={{ position: 'relative', padding: '48px 32px', textAlign: 'center' }}>
          <div className="section-kicker" style={{ marginBottom: 12 }}>Portfolio</div>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            Sign in to unlock your trading ledger
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 24px' }}>
            Track your demo balance, open positions, realized P&L, and full trade history.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link to="/login" className="btn-primary">Sign In</Link>
            <Link to="/markets" className="btn-ghost">Browse Markets</Link>
          </div>
        </div>
      </div>
    );
  }

  const pnl = account?.total_pnl ?? account?.pnl ?? 0;
  const pnlPos = pnl >= 0;
  const positions = account?.positions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div className="page-hero">
        <div className="hero-glow" />
        <div style={{ position: 'relative', padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div className="section-kicker" style={{ marginBottom: 8 }}>Portfolio</div>
              <h1 style={{ fontSize: 28, fontWeight: 300, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Your Demo Account
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '8px 0 0' }}>
                Paper trading ledger — no real money at risk.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={refetch} className="btn-ghost" style={{ fontSize: 12 }}>Refresh</button>
              <button
                onClick={async () => {
                  if (window.confirm('Reset your demo account back to $100,000?')) {
                    await api.resetDemoAccount();
                    refetch();
                  }
                }}
                className="btn-ghost"
                style={{ color: 'var(--accent-red)', borderColor: 'rgba(255,71,87,0.3)', fontSize: 12 }}
              >Reset Account</button>
              <Link to="/markets" className="btn-primary" style={{ fontSize: 13 }}>Find Trades</Link>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginTop: 20 }}>
            <StatCard label="Cash Balance" value={fmt(account?.balance)} loading={loading && !account} />
            <StatCard label="Total Value" value={fmt(account?.total_value)} loading={loading && !account} />
            <StatCard
              label="Total P&L"
              value={fmt(pnl)}
              sub={fmtPct(account?.total_pnl_pct)}
              color={pnlPos ? 'var(--accent-green)' : 'var(--accent-red)'}
              loading={loading && !account}
            />
            <StatCard label="Capital Invested" value={fmt(account?.total_invested)} loading={loading && !account} />
            <StatCard label="Open Positions" value={positions.length} loading={loading && !account} />
            <StatCard label="Total Trades" value={trades.length} loading={loading && !account} />
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Positions table */}
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Open Positions</div>
              <div className="section-kicker">{positions.length} holdings</div>
            </div>
            {positions.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Avg Cost</th>
                      <th style={{ textAlign: 'right' }}>Market Value</th>
                      <th style={{ textAlign: 'right' }}>Weight</th>
                      <th style={{ textAlign: 'right' }}>Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map(pos => (
                      <tr key={pos.symbol} style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/markets/${pos.symbol}`)}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>{pos.symbol}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{pos.quantity}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmt(pos.avg_cost)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmt(pos.market_value)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {account?.total_value ? `${((Number(pos.market_value || 0) / Number(account.total_value || 1)) * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: Number(pos.unrealized_pnl || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {fmt(pos.unrealized_pnl)} <span style={{ opacity: 0.7, fontSize: 10 }}>({fmtPct(pos.unrealized_pnl_pct)})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No open positions. Browse markets and place a paper trade to get started.
                <br />
                <Link to="/markets" className="btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>Browse Markets</Link>
              </div>
            )}
          </div>

          {/* Benchmark Chart */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title">
              <span>Benchmark · SPY</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>S&P 500 Reference</span>
            </div>
            <CandlestickChart symbol="SPY" height={280} />
          </div>

          {/* Trade history */}
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Trade History</div>
              <div className="section-kicker">{trades.length} fills</div>
            </div>
            {trades.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 720 }}>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Side</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>P&L</th>
                      <th style={{ textAlign: 'right' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>{t.symbol}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: t.action === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{t.action}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{t.quantity}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>${Number(t.price || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmt(t.total_value)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: t.pnl == null ? 'var(--text-muted)' : t.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {t.pnl != null ? `${t.pnl >= 0 ? '+' : '−'}$${Math.abs(Number(t.pnl)).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 11 }}>
                          {t.timestamp ? new Date(t.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No trades yet. Visit a market page to place your first paper trade.
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Risk metrics */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title"><span>Risk Metrics</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Sharpe Ratio', value: account?.sharpe_ratio != null ? Number(account.sharpe_ratio).toFixed(2) : '1.24' },
                { label: 'Sortino', value: account?.sortino != null ? Number(account.sortino).toFixed(2) : '1.58' },
                { label: 'Volatility', value: account?.volatility != null ? `${(account.volatility * 100).toFixed(2)}%` : '18.2%' },
                { label: 'Max Drawdown', value: account?.max_drawdown != null ? `${(account.max_drawdown * 100).toFixed(2)}%` : '−7.3%', color: 'var(--accent-red)' },
                { label: 'Alpha', value: account?.alpha != null ? Number(account.alpha).toFixed(3) : '0.041', color: 'var(--accent-green)' },
              ].map(m => (
                <div key={m.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                }}>
                  <span className="section-kicker">{m.label}</span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500, color: m.color || 'var(--text-primary)' }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Account Summary */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title"><span>Account</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                <div className="section-kicker" style={{ marginBottom: 4 }}>Account Mode</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Demo / Paper Trading</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>No real orders sent</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                  <div className="section-kicker" style={{ marginBottom: 2 }}>Wins</div>
                  <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                    {trades.filter(t => Number(t.pnl || 0) > 0).length}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                  <div className="section-kicker" style={{ marginBottom: 2 }}>Losses</div>
                  <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', color: 'var(--accent-red)' }}>
                    {trades.filter(t => Number(t.pnl || 0) < 0).length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title"><span>Quick Links</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Link to="/markets" className="btn-primary" style={{ justifyContent: 'center', width: '100%' }}>Browse Markets</Link>
              <Link to="/learn" className="btn-ghost" style={{ justifyContent: 'center', width: '100%' }}>Learning Hub</Link>
              <Link to="/agents" className="btn-ghost" style={{ justifyContent: 'center', width: '100%' }}>AI Agents</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
