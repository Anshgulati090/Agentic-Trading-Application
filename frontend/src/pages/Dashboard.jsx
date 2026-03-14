import { useState } from 'react';
import AgentStatus from '../components/AgentStatus';
import AnalyticsChart from '../components/AnalyticsChart';
import LearningLab from '../components/LearningLab';
import MarketTicker from '../components/MarketTicker';
import PortfolioCard from '../components/PortfolioCard';
import PriceChart from '../components/PriceChart';
import SignalStream from '../components/SignalStream';
import TradeTable from '../components/TradeTable';

function Panel({ title, children, className = '', action }) {
  return (
    <div className={`bg-zinc-900/65 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${className}`}>
      {title && (
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-3 pb-2.5 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <span>{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [chartSymbol, setChartSymbol] = useState('AAPL');

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-3xl border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_24%),linear-gradient(180deg,rgba(24,24,27,0.92),rgba(12,12,16,0.96))] px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="text-cyan-400 font-mono text-xs uppercase tracking-[0.3em] mb-3">Trading Workspace</div>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-zinc-100">Monitor markets, learn the setup, and practice without risking capital.</h1>
            <p className="mt-3 text-zinc-400 text-sm sm:text-base">
              The dashboard is now arranged like a real product workspace: live markets up top, execution context in the middle, and analytics plus learning tools below.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[540px]">
            {[
              ["Focus", chartSymbol],
              ["Mode", "Demo"],
              ["Signals", "Live"],
              ["Status", "Ready"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">{label}</div>
                <div className="mt-2 text-lg text-zinc-100">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Panel title="Market Prices - Live">
        <MarketTicker onSelectSymbol={setChartSymbol} />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
        <Panel title="Signal Stream - WebSocket" className="xl:col-span-3">
          <div className="flex-1 min-h-0 h-[260px] sm:h-[320px]">
            <SignalStream />
          </div>
        </Panel>

        <Panel title="Portfolio - Overview" className="xl:col-span-4">
          <PortfolioCard />
        </Panel>

        <Panel title="Agent Status" className="xl:col-span-5">
          <AgentStatus />
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
        <Panel title="Price Chart - OHLCV" className="xl:col-span-8">
          <PriceChart defaultSymbol={chartSymbol} />
        </Panel>

        <Panel title="Learning Lab - Demo Credits" className="xl:col-span-4">
          <LearningLab initialSymbol={chartSymbol} compact />
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
        <Panel title="Analytics - Equity Curve" className="xl:col-span-5">
          <AnalyticsChart />
        </Panel>

        <Panel title="Trade History - Recent" className="xl:col-span-7">
          <div className="h-[300px] sm:h-[340px]">
            <TradeTable maxRows={10} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
