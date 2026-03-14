import { useState } from 'react';
import { Link } from 'react-router-dom';

const LESSONS = [
  {
    id: 'momentum',
    title: 'Momentum Trading',
    icon: '🚀',
    tag: 'Strategy',
    color: 'cyan',
    agent: 'Momentum Agent',
    difficulty: 'Beginner',
    readTime: '5 min',
    summary: 'Buy assets that are going up, sell assets that are going down. Sounds simple — but there\'s real science behind it.',
    sections: [
      {
        heading: 'What is momentum?',
        body: `Momentum is the tendency for assets that have performed well recently to continue performing well, and assets that have performed poorly to continue underperforming. This is one of the most persistent anomalies in financial markets, documented across stocks, bonds, commodities, and currencies.`,
      },
      {
        heading: 'How the Momentum Agent trades',
        body: `Our Momentum Agent calculates 20-day and 50-day moving averages. When the short-term average crosses above the long-term average (a "golden cross"), it generates a BUY signal. When the short-term dips below the long-term (a "death cross"), it generates a SELL signal. It also measures Rate of Change (ROC) to filter weak signals.`,
        code: `# Simplified momentum logic
ma_short = price_series.rolling(20).mean()
ma_long  = price_series.rolling(50).mean()

if ma_short > ma_long:
    signal = "BUY"   # uptrend
elif ma_short < ma_long:
    signal = "SELL"  # downtrend
else:
    signal = "HOLD"`,
      },
      {
        heading: 'When it works & when it fails',
        body: `Momentum strategies shine in trending markets. They struggle in sideways, "choppy" markets where prices oscillate without clear direction — often called "whipsaw" conditions. The Risk Manager agent monitors this and can suppress momentum signals when volatility is elevated.`,
      },
      {
        heading: 'Key risk controls',
        body: `Our agent caps position size at 10% of portfolio value per trade. It also monitors maximum drawdown — if the portfolio drops more than 20% from its peak, trading is suspended automatically until the drawdown recovers.`,
      },
    ],
  },
  {
    id: 'mean_reversion',
    title: 'Mean Reversion',
    icon: '🔄',
    tag: 'Strategy',
    color: 'purple',
    agent: 'Mean Reversion Agent',
    difficulty: 'Intermediate',
    readTime: '6 min',
    summary: 'What goes up must come down — and what crashes tends to bounce. Mean reversion bets on extremes returning to normal.',
    sections: [
      {
        heading: 'The core idea',
        body: `Most financial time series tend to revert to their historical mean over time. When a stock price deviates too far from its moving average — either too high or too low — mean reversion strategies bet on it returning to "normal" levels. This is the opposite of momentum trading.`,
      },
      {
        heading: 'Z-Score analysis',
        body: `The Mean Reversion Agent uses Z-scores to measure how extreme a price deviation is. A Z-score tells us how many standard deviations the current price is from the rolling mean. When |Z| > 2, the price is in statistically unusual territory.`,
        code: `# Z-score calculation
rolling_mean = price.rolling(window=20).mean()
rolling_std  = price.rolling(window=20).std()
z_score = (price - rolling_mean) / rolling_std

if z_score < -2:
    signal = "BUY"   # price is abnormally low
elif z_score > 2:
    signal = "SELL"  # price is abnormally high`,
      },
      {
        heading: 'Why this works',
        body: `Mean reversion profits from overreactions. News events, earnings surprises, and panic selling often push prices beyond what's fundamentally justified. Patient traders who fade these extremes capture the "snap-back" move as prices normalize.`,
      },
    ],
  },
  {
    id: 'risk',
    title: 'Risk Management',
    icon: '🛡️',
    tag: 'Foundation',
    color: 'amber',
    agent: 'Risk Manager',
    difficulty: 'Essential',
    readTime: '7 min',
    summary: 'The most important skill in trading isn\'t finding winners — it\'s surviving long enough to let your edge play out.',
    sections: [
      {
        heading: 'Why risk management wins',
        body: `Professional traders say "cut your losers, let your winners run." Risk management is about protecting capital so you can stay in the game. A single catastrophic loss can wipe out months of gains. Our Risk Manager enforces hard limits that no other agent can override.`,
      },
      {
        heading: 'Position sizing',
        body: `Never risk more than you can afford to lose on a single trade. Our system caps each position at 10% of portfolio value. This means even if a trade goes to zero, you lose only 10%. Combined with stop-losses, the actual risk per trade is typically 0.5-1% of portfolio.`,
        code: `# Position sizing formula
max_position_pct = 0.10  # 10% of portfolio
portfolio_value  = 100_000

max_position_value = portfolio_value * max_position_pct
# = $10,000 max per trade

shares_to_buy = max_position_value / current_price`,
      },
      {
        heading: 'Drawdown control',
        body: `Maximum drawdown is the largest peak-to-trough decline in portfolio value. Our Risk Manager halts all trading if the portfolio drops more than 20% from its all-time high. This prevents a bad streak from becoming a disaster.`,
      },
      {
        heading: 'Stop losses',
        body: `Every trade gets an automatic stop-loss at 5% below entry price. This means the maximum loss on any single trade is capped at 0.5% of portfolio (5% stop × 10% position size). This is the mathematics of survival.`,
      },
    ],
  },
  {
    id: 'factor',
    title: 'Factor Investing',
    icon: '📐',
    tag: 'Advanced',
    color: 'green',
    agent: 'Factor Model Agent',
    difficulty: 'Advanced',
    readTime: '8 min',
    summary: 'Institutional investors build alpha by systematically exploiting documented market risk premia — you can learn the same.',
    sections: [
      {
        heading: 'What is a factor?',
        body: `A "factor" is a characteristic of stocks that explains why some stocks consistently outperform others over time. Academic researchers have identified dozens of factors — value, momentum, quality, low volatility, size — that have delivered positive returns across markets and time periods.`,
      },
      {
        heading: 'The 4 core factors',
        body: `Our Factor Agent scores each stock on 4 dimensions: (1) Value — cheap stocks beat expensive ones; (2) Quality — profitable, stable companies outperform; (3) Momentum — trending stocks continue trending; (4) Low Volatility — surprisingly, low-vol stocks beat high-vol stocks on a risk-adjusted basis.`,
        code: `# Factor scoring (simplified)
factors = {
    'value':      -pe_ratio,          # lower P/E = better
    'quality':    return_on_equity,   # higher ROE = better  
    'momentum':   12m_return,         # recent performance
    'low_vol':    -annualized_vol,    # lower vol = better
}

# Equal-weight composite score
composite_score = sum(factors.values()) / len(factors)`,
      },
      {
        heading: 'Why factors work',
        body: `Factor premia exist because they compensate investors for bearing risk, or because behavioral biases cause systematic mispricings that rational traders can exploit. Value stocks are often cheap because they're in distress — you're paid for tolerating that discomfort.`,
      },
    ],
  },
];

function DifficultyBadge({ level }) {
  const cls = {
    'Beginner': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'Intermediate': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    'Advanced': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    'Essential': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${cls[level] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
      {level}
    </span>
  );
}

function LessonCard({ lesson, onClick }) {
  return (
    <button
      onClick={() => onClick(lesson)}
      className="text-left panel p-5 hover:border-zinc-600 transition-all hover:bg-zinc-900 group w-full"
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl">{lesson.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <DifficultyBadge level={lesson.difficulty} />
            <span className="text-[10px] font-mono text-zinc-600">{lesson.readTime} read</span>
          </div>
          <h3 className="font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">{lesson.title}</h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{lesson.summary}</p>
          <div className="mt-3 text-[10px] font-mono text-zinc-600">
            Agent: <span className="text-zinc-400">{lesson.agent}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function LessonDetail({ lesson, onBack }) {
  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
        ← Back to lessons
      </button>
      <div className="panel p-6 md:p-8">
        <div className="flex items-start gap-4 mb-8 pb-8 border-b border-zinc-800">
          <div className="text-5xl">{lesson.icon}</div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DifficultyBadge level={lesson.difficulty} />
              <span className="text-[10px] font-mono text-zinc-600">{lesson.readTime} read</span>
              <span className="text-[10px] font-mono text-zinc-600">·</span>
              <span className="text-[10px] font-mono text-zinc-600">Agent: {lesson.agent}</span>
            </div>
            <h1 className="text-2xl font-light tracking-tight text-zinc-100">{lesson.title}</h1>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{lesson.summary}</p>
          </div>
        </div>

        <div className="space-y-8">
          {lesson.sections.map((s, i) => (
            <div key={i}>
              <h2 className="text-base font-semibold text-zinc-200 mb-3">{s.heading}</h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">{s.body}</p>
              {s.code && (
                <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                  <code>{s.code}</code>
                </pre>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-sm text-zinc-500">
            See this agent in action on the <Link to="/dashboard" className="text-cyan-400 hover:text-cyan-300">Dashboard</Link>
          </div>
          <Link to="/markets/AAPL" className="btn-primary text-sm">
            Practice on AAPL →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Learn() {
  const [active, setActive] = useState(null);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light tracking-tight">Trading Academy</h1>
              <p className="text-sm text-zinc-500 font-mono mt-0.5">Learn how our AI agents think and trade</p>
            </div>
            <Link to="/dashboard" className="text-sm text-zinc-400 hover:text-cyan-400 transition-colors">← Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {active ? (
          <LessonDetail lesson={active} onBack={() => setActive(null)} />
        ) : (
          <>
            {/* Intro */}
            <div className="panel p-6 mb-8 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border-cyan-500/20">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎓</div>
                <div>
                  <h2 className="font-semibold text-zinc-100 mb-1">Learn by watching AI agents trade</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                    Every signal generated on this platform comes with an explanation. Read these lessons to understand the strategies,
                    then watch them play out live in the dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {LESSONS.map(l => (
                <LessonCard key={l.id} lesson={l} onClick={setActive} />
              ))}
            </div>

            {/* Next steps */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '📊', title: 'Watch live signals', desc: 'See agents generate signals in real time', to: '/dashboard', cta: 'Open Dashboard' },
                { icon: '🔍', title: 'Explore markets', desc: 'View charts, OHLCV data and agent insights', to: '/markets', cta: 'Browse Markets' },
                { icon: '💼', title: 'Paper trade', desc: 'Practice with $100K virtual balance', to: '/dashboard', cta: 'Start Trading' },
              ].map(card => (
                <div key={card.title} className="panel p-5 flex flex-col">
                  <div className="text-2xl mb-3">{card.icon}</div>
                  <h3 className="font-semibold text-zinc-200 mb-1">{card.title}</h3>
                  <p className="text-xs text-zinc-500 mb-4 flex-1">{card.desc}</p>
                  <Link to={card.to} className="btn-primary text-xs text-center">{card.cta} →</Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
