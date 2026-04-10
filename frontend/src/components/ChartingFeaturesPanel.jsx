import { useState } from 'react';

/**
 * TradingView Features Panel
 * Displays all available charting features and tools
 */
export default function ChartingFeaturesPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const features = [
    {
      category: 'Chart Types',
      icon: '📊',
      items: [
        'Candlestick Charts',
        'Heikin Ashi Candles',
        'Hollow Candlesticks',
        'Bar Charts (OHLC)',
        'Line Charts',
        'Area Charts',
        'Baseline Chart',
        'Step Line',
        'Column Charts',
        'Pivot Points High/Low',
      ],
    },
    {
      category: 'Technical Indicators',
      icon: '📈',
      items: [
        'Moving Averages (SMA, EMA, WMA, VWMA)',
        'MACD (Moving Average Convergence Divergence)',
        'RSI (Relative Strength Index)',
        'Bollinger Bands',
        'Stochastic RSI',
        'ATR (Average True Range)',
        'ADX (Average Directional Index)',
        'Ichimoku Cloud',
        'Parabolic SAR',
        'Fibonacci Retracement',
        'Volume Profile',
        'On-Balance Volume (OBV)',
      ],
    },
    {
      category: 'Drawing Tools',
      icon: '✏️',
      items: [
        'Trend Lines',
        'Horizontal/Vertical Lines',
        'Regression Channel',
        'Fibonacci Extensions',
        'Gann Fan',
        'Pitchfork',
        'Schiff Pitchfork',
        'Rays',
        'Segments',
        'Curves',
        'Continuous Curves',
        'Elliott Waves',
        'Countertrend Lines',
        'Triangles',
        'Rectangles',
        'Arrows',
        'Text Labels',
      ],
    },
    {
      category: 'Timeframes',
      icon: '⏰',
      items: [
        '1 minute',
        '3 minutes',
        '5 minutes',
        '15 minutes',
        '30 minutes',
        '45 minutes',
        '1 hour',
        '2 hours',
        '3 hours',
        '4 hours',
        '1 day',
        '1 week',
        '1 month',
        '3 months',
        '6 months',
        '1 year',
        'All time',
      ],
    },
    {
      category: 'Analysis Tools',
      icon: '🔬',
      items: [
        'Compare Symbols',
        'Add Multiple Indicators',
        'Alert System',
        'Strategy Tester (Pine Script)',
        'Bar Replay Mode',
        'Measure Tool',
        'Price Scale Options',
        'Logarithmic Scale',
        'Percentage Scale',
        'Regular Scale',
      ],
    },
    {
      category: 'Smart Features',
      icon: '🧠',
      items: [
        'Real-time Data Streaming',
        'Auto Pattern Recognition',
        'Candlestick Patterns',
        'Classic Chart Patterns',
        'Supply & Demand Zones',
        'Support/Resistance Levels',
        'Pivot Points Classic',
        'Pivot Points Fibonacci',
        'Pivot Points Woodie',
        'Pivot Points Camarilla',
        'Pivot Points DeMark',
      ],
    },
  ];

  return (
    <section className="panel p-5">
      <div className="panel-title">
        <span>Chart Features Guide</span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300"
        >
          {isOpen ? 'hide' : 'show all'}
        </button>
      </div>

      <div className="text-sm text-zinc-500 mb-3">
        TradingView Pro chart — right-click for drawing tools, use the toolbar for indicators.
      </div>

      {isOpen && (
        <div className="space-y-4 max-h-[480px] overflow-y-auto">
          {features.map((section, idx) => (
            <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span>{section.icon}</span>
                <span className="text-sm font-medium text-zinc-200">{section.category}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {section.items.slice(0, 6).map((item, i) => (
                  <div key={i} className="text-[11px] text-zinc-500 flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <a
            href="https://www.tradingview.com/support/"
            target="_blank"
            rel="noreferrer"
            className="block text-center text-[10px] font-mono text-blue-400 hover:text-blue-300 mt-2"
          >
            Full TradingView Documentation →
          </a>
        </div>
      )}

      {!isOpen && (
        <div className="grid grid-cols-3 gap-2">
          {features.slice(0, 3).map((s) => (
            <div key={s.category} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-center">
              <div className="text-base mb-1">{s.icon}</div>
              <div className="text-[10px] text-zinc-500">{s.category}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
