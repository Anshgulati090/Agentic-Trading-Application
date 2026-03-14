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
    <div className={`bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 flex flex-col ${className}`}>
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
    <div className="space-y-4">
      <Panel title="Market Prices - Live">
        <MarketTicker onSelectSymbol={setChartSymbol} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Signal Stream - WebSocket" className="lg:col-span-1">
          <div className="flex-1 min-h-0" style={{ height: 300 }}>
            <SignalStream />
          </div>
        </Panel>

        <Panel title="Portfolio - Overview" className="lg:col-span-1">
          <PortfolioCard />
        </Panel>

        <Panel title="Agent Status" className="lg:col-span-1">
          <AgentStatus />
        </Panel>
      </div>

      <Panel title="Price Chart - OHLCV">
        <PriceChart defaultSymbol={chartSymbol} />
      </Panel>

      <Panel title="Learning Lab - Demo Credits">
        <LearningLab initialSymbol={chartSymbol} />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Analytics - Equity Curve">
          <AnalyticsChart />
        </Panel>

        <Panel title="Trade History - Recent">
          <div style={{ height: 300 }}>
            <TradeTable maxRows={10} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
