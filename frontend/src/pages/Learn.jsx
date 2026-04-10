import { useState } from 'react';
import { Link } from 'react-router-dom';

/* ── colour palette ────────────────────────────────────────────────────────── */
const C = {
  bg:        'rgba(4,12,18,1)',
  surface:   'rgba(10,21,32,0.95)',
  border:    'rgba(0,183,255,0.12)',
  borderHi:  'rgba(0,212,255,0.3)',
  cyan:      '#00d4ff',
  green:     '#00e676',
  red:       '#ff3d57',
  amber:     '#ffc107',
  muted:     '#4d7a96',
  text:      '#e8f4ff',
  sub:       '#7a9ab5',
};

/* ── reusable card ─────────────────────────────────────────────────────────── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: '22px 24px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTag({ color = C.cyan, children }) {
  return (
    <span style={{
      display: 'inline-block', background: `${color}18`,
      border: `1px solid ${color}44`, borderRadius: 4,
      padding: '2px 8px', fontSize: 10, color, fontFamily: 'JetBrains Mono, monospace',
      letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10,
    }}>
      {children}
    </span>
  );
}

/* ── tabs ──────────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'basics',    label: '📈 Trading Basics' },
  { id: 'technical', label: '🔬 Technical Analysis' },
  { id: 'risk',      label: '🛡️ Risk Management' },
  { id: 'finagents', label: '🤖 FinAgents System' },
];

/* ─────────────── TRADING BASICS ──────────────────────────────────────────── */
function TradingBasics() {
  const [open, setOpen] = useState(null);
  const topics = [
    {
      id: 'what',
      title: 'What is the Stock Market?',
      icon: '🏛️',
      tag: 'Foundation',
      tagColor: C.cyan,
      short: 'A marketplace where buyers and sellers trade ownership in companies.',
      content: `The stock market is a network of exchanges where shares of publicly listed companies are bought and sold. When you buy a share (also called stock or equity), you become a part-owner of that company.

**How it works:**
• Companies list shares via an IPO (Initial Public Offering) to raise capital
• Investors then trade those shares among themselves on exchanges like NYSE, NASDAQ, or NSE (India)
• Prices are set by supply and demand — if more people want to buy than sell, price goes up; and vice versa

**Key exchanges:**
• 🇺🇸 NYSE & NASDAQ — US equities (Apple, Tesla, Google)
• 🇮🇳 NSE & BSE — Indian equities (Reliance, TCS, Infosys)
• Crypto markets run 24/7, unlike stock exchanges (9:30am–4pm ET)

**Why do prices move?**
Earnings results, news, economic data (GDP, inflation, interest rates), management changes, and investor sentiment all drive price action. The market is essentially a real-time voting machine on the future value of businesses.`,
    },
    {
      id: 'bullbear',
      title: 'Bull vs Bear Markets',
      icon: '🐂',
      tag: 'Core Concept',
      tagColor: C.green,
      short: 'Understanding market cycles is the foundation of every trading strategy.',
      content: `**Bull Market 🐂 (Rising prices)**
A bull market is when prices rise 20%+ from a recent low. Investor confidence is high, the economy is growing, and buying pressure dominates.
• Example: 2009–2020 — the longest US bull run in history
• Momentum strategies and buy-and-hold work best here

**Bear Market 🐻 (Falling prices)**
A bear market is when prices fall 20%+ from a peak. Fear dominates, selling pressure increases, and many investors lose money.
• Example: 2000–2002 (Dot-com crash), 2008 (Financial crisis), 2022 (rate hike selloff)
• Short-selling and defensive positioning help here

**Key terms:**
• **Correction** — 10–20% drop (common, not a crash)
• **Crash** — Sharp sudden drop (>20% in days/weeks)
• **Rally** — Strong upward movement within any trend
• **Consolidation** — Price moves sideways with no clear direction

💡 *Tip*: Most beginner traders lose money by buying at the peak of euphoria and selling in panic at the bottom. Understanding where we are in the cycle helps you avoid this.`,
    },
    {
      id: 'candlesticks',
      title: 'Reading Candlestick Charts',
      icon: '🕯️',
      tag: 'Chart Reading',
      tagColor: C.amber,
      short: 'Candlesticks are the most important chart type you will ever learn.',
      content: `Every candlestick represents one time period (1 minute, 1 day, 1 week) and tells you 4 key facts:

\`Open — High — Low — Close\`

**Green candle (bullish):** Price closed HIGHER than it opened ✅
**Red candle (bearish):** Price closed LOWER than it opened ❌

**Parts of a candle:**
• **Body** — Thick rectangle showing open-to-close range
• **Upper wick/shadow** — Thin line above the body (price went higher but buyers couldn't hold it)
• **Lower wick/shadow** — Thin line below the body (price went lower but sellers couldn't hold it)

**Key patterns to recognize:**
• **Doji** — Open = Close (indecision, potential reversal)
• **Hammer** — Long lower wick, small body at top (buyers rejecting lower prices → bullish)
• **Shooting Star** — Long upper wick, small body at bottom (sellers rejecting higher prices → bearish)
• **Engulfing** — One candle fully covers the previous one (strong reversal signal)

💡 *You can see candlestick charts on every MarketDetail page in this app. Click any stock → Price Chart to practice reading them.*`,
    },
    {
      id: 'orders',
      title: 'Order Types Explained',
      icon: '📋',
      tag: 'Execution',
      tagColor: C.sub,
      short: 'Different order types control when and at what price your trade executes.',
      content: `**Market Order**
Buy/sell immediately at the current market price.
✅ Fast execution   ❌ May get a worse price than expected (slippage)

**Limit Order**
Buy/sell only at a specific price or better.
✅ Price control   ❌ May not fill if price doesn't reach your level

**Stop Loss**
Automatically sells your position if price drops to a set level. This is your protection against big losses.
Example: Buy AAPL at $250, set stop loss at $240 → Max loss = $10/share

**Stop Limit**
Combines stop loss + limit order. Triggers at the stop price and then places a limit order.

**In this app:**
The Demo Trade panel on every Market Detail page lets you practice BUY/SELL market orders using a $100,000 paper money account. No real money at risk!`,
    },
    {
      id: 'longshort',
      title: 'Long vs Short Positions',
      icon: '↕️',
      tag: 'Core Concept',
      tagColor: C.red,
      short: 'You can profit from both rising AND falling prices.',
      content: `**Going Long (Buying)**
You buy a stock expecting it to go UP.
• Buy 10 shares of NVDA at $170
• Price rises to $200 → Profit = $300

**Going Short (Short Selling)**
You borrow shares and sell them first, expecting to buy them back cheaper.
• Borrow and sell 10 shares of META at $600
• Price falls to $550 → Buy back → Profit = $500
⚠️ Risk: If price RISES, your loss is theoretically unlimited

**Shorting in practice:**
Most retail traders can't short stocks easily — it requires a margin account and stock borrowing. However, put options or inverse ETFs (like \`SQQQ\`) achieve similar results.

**In this platform:**
The Demo Trade panel simulates long positions only (buying and selling). This is the safest approach for new traders learning market mechanics.`,
    },
    {
      id: 'indices',
      title: 'Market Indices Explained',
      icon: '📊',
      tag: 'Reference',
      tagColor: C.cyan,
      short: 'Indices track the overall health of a market or sector.',
      content: `An index is a basket of stocks that represents a market segment. You can't buy an index directly, but you can buy ETFs that track them.

**Major US Indices:**
• **S&P 500 (SPY)** — 500 largest US companies. King of benchmarks. "The Market"
• **NASDAQ 100 (QQQ)** — 100 largest non-financial NASDAQ companies. Heavy tech weight
• **Dow Jones (DIA)** — 30 blue-chip US companies. Oldest index
• **Russell 2000 (IWM)** — 2000 small-cap US companies. Risk appetite barometer

**Indian Indices:**
• **Nifty 50 (^NSEI)** — Top 50 companies on NSE
• **Sensex (^BSESN)** — Top 30 companies on BSE

**VIX — The Fear Gauge:**
• VIX measures expected market volatility over the next 30 days
• VIX > 30 = high fear, potential buying opportunity
• VIX < 15 = complacency, potential risk building

💡 *Pro tip*: When SPY is up and VIX is low, it's a "risk-on" environment. When SPY falls and VIX spikes, risk becomes elevated across all assets.*`,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {topics.map((t) => (
        <div key={t.id} style={{ background: C.surface, border: `1px solid ${open === t.id ? C.borderHi : C.border}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
          <button
            type="button"
            onClick={() => setOpen(open === t.id ? null : t.id)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: 24 }}>{t.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{t.short}</div>
            </div>
            <span style={{ background: `${t.tagColor}18`, border: `1px solid ${t.tagColor}44`, borderRadius: 4, padding: '2px 8px', fontSize: 9, color: t.tagColor, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', whiteSpace: 'nowrap', marginRight: 12 }}>
              {t.tag}
            </span>
            <span style={{ color: C.muted, fontSize: 18 }}>{open === t.id ? '−' : '+'}</span>
          </button>
          {open === t.id && (
            <div style={{ padding: '4px 20px 20px 58px', borderTop: `1px solid ${C.border}` }}>
              {t.content.split('\n').map((line, i) => {
                if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <div key={i} style={{ fontWeight: 700, color: C.cyan, fontSize: 13, marginTop: 12, marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>{line.replace(/\*\*/g, '')}</div>;
                }
                if (line.startsWith('•')) {
                  return <div key={i} style={{ fontSize: 13, color: C.sub, lineHeight: 1.8, paddingLeft: 12, display: 'flex', gap: 8 }}><span style={{ color: C.cyan }}>·</span><span>{line.slice(1).trim()}</span></div>;
                }
                if (line.startsWith('`') && line.endsWith('`')) {
                  return <code key={i} style={{ display: 'block', background: 'rgba(0,183,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: C.green, margin: '8px 0' }}>{line.slice(1, -1)}</code>;
                }
                if (line.startsWith('⚠️') || line.startsWith('💡') || line.startsWith('✅') || line.startsWith('❌')) {
                  return <div key={i} style={{ fontSize: 13, color: C.amber, lineHeight: 1.8, marginTop: 4, fontStyle: 'italic' }}>{line}</div>;
                }
                return <div key={i} style={{ fontSize: 13, color: C.sub, lineHeight: 1.9 }}>{line}</div>;
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────── TECHNICAL ANALYSIS ─────────────────────────────────────── */
function TechnicalAnalysis() {
  const indicators = [
    {
      name: 'Moving Averages (SMA / EMA)',
      tag: 'Trend', color: C.cyan,
      desc: 'Smooth price data to reveal the underlying trend direction.',
      how: `A Simple Moving Average (SMA) calculates the average closing price over N days.
• SMA-20 = Average of last 20 days of closing prices
• SMA-50 = Average of last 50 days of closing prices
• SMA-200 = Long-term trend benchmark

**Golden Cross 🌟**: SMA-20 crosses ABOVE SMA-50 → Strong bullish signal
**Death Cross 💀**: SMA-20 crosses BELOW SMA-50 → Strong bearish signal

The Exponential MA (EMA) gives more weight to recent prices, reacting faster to new information. Day traders prefer EMA for this reason.

In this app: The Technical View panel shows the SMA-20 and SMA-50 for any stock, calculated from real price history.`,
    },
    {
      name: 'RSI — Relative Strength Index',
      tag: 'Momentum', color: C.amber,
      desc: 'Measures whether a stock is overbought or oversold on a 0–100 scale.',
      how: `RSI is calculated from average gains vs average losses over 14 days.

**RSI Levels:**
• RSI > 70 = Overbought → Price may be due for a pullback (SELL signal)
• RSI 40–60 = Neutral → No strong signal
• RSI < 30 = Oversold → Price may be due for a bounce (BUY signal)

**Important:** RSI can stay overbought or oversold for extended periods during strong trends. Don't trade RSI alone — combine it with trend direction.

Example: AAPL might have RSI of 72 (overbought) but if it's in a strong uptrend, shorting just because of RSI is dangerous.

In this app: The Technical View panel updates RSI-14 from the past 3 months of real data.`,
    },
    {
      name: 'MACD — Moving Average Convergence Divergence',
      tag: 'Momentum', color: C.green,
      desc: 'Shows the relationship between two EMAs to identify momentum shifts.',
      how: `MACD = EMA-12 minus EMA-26

**Components:**
• MACD Line = EMA(12) - EMA(26)
• Signal Line = EMA(9) of the MACD line
• Histogram = MACD Line − Signal Line

**Signals:**
• MACD crosses ABOVE Signal Line → Bullish momentum building
• MACD crosses BELOW Signal Line → Bearish momentum building
• Divergence: Price makes new high but MACD doesn't → Warning sign of weakening momentum

MACD is best used on daily and weekly charts for swing trading setups.`,
    },
    {
      name: 'Support & Resistance',
      tag: 'Price Levels', color: C.red,
      desc: 'Key price zones where buying or selling pressure concentrates.',
      how: `**Support** is a price level where buyers are likely to step in:
• Price has bounced off this level multiple times before
• Buyers see value and defend the price
• A break below support is bearish (possible further decline)

**Resistance** is a price level where sellers are likely to step in:
• Price has reversed down from this level multiple times
• Sellers dominate and cap upside
• A break above resistance is bullish (possible further rally)

**The Role Reversal Rule:**
Once a resistance level is broken, it often becomes the new support (and vice versa).

In this app: The Technical View shows 20-day Support (recent low) and Resistance (recent high) for any stock.`,
    },
    {
      name: 'Volume Analysis',
      tag: 'Confirmation', color: C.sub,
      desc: 'Volume confirms or denies the validity of a price move.',
      how: `Volume = number of shares/units traded in a period.

**Golden rule:** Price moves on HIGH volume are more reliable than moves on low volume.

• High volume breakout above resistance → Strong bullish signal
• Low volume breakout → Often a false move, be cautious
• Price rises but volume drops → Losing momentum, potential reversal ahead
• High volume at a bottom → Capitulation selling, potential reversal up

**Volume indicators:**
• OBV (On-Balance Volume) — cumulative measure of buying/selling pressure
• Volume Profile — where most volume traded over time (high-volume nodes = strong S/R)

In this app: Volume is shown in the OHLV header on every Market Detail page (the 'VOL' stat).`,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTag color={C.cyan}>What is Technical Analysis?</SectionTag>
        <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.9, margin: 0 }}>
          Technical analysis (TA) is the study of price and volume history to forecast future price movements.
          Unlike fundamental analysis (which studies company financials), TA focuses purely on what the chart is telling you.
          The underlying assumption: <strong style={{ color: C.cyan }}>all known information is already reflected in the price.</strong>
        </p>
      </Card>
      {indicators.map((ind) => (
        <Card key={ind.name}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <h3 style={{ fontSize: 16, color: C.text, fontWeight: 600, margin: 0 }}>{ind.name}</h3>
                <span style={{ background: `${ind.color}18`, border: `1px solid ${ind.color}44`, borderRadius: 4, padding: '2px 8px', fontSize: 9, color: ind.color, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>{ind.tag}</span>
              </div>
              <p style={{ fontSize: 13, color: C.cyan, margin: '0 0 12px' }}>{ind.desc}</p>
              <div>
                {ind.how.split('\n').map((line, i) => {
                  if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
                  if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: 700, color: C.text, fontSize: 13, marginTop: 10, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</div>;
                  if (line.startsWith('•')) return <div key={i} style={{ fontSize: 13, color: C.sub, lineHeight: 1.8, paddingLeft: 12, display: 'flex', gap: 8 }}><span style={{ color: ind.color }}>·</span><span>{line.slice(1).trim()}</span></div>;
                  return <div key={i} style={{ fontSize: 13, color: C.sub, lineHeight: 1.8 }}>{line}</div>;
                })}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─────────────── RISK MANAGEMENT ─────────────────────────────────────────── */
function RiskManagement() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTag color={C.red}>The #1 Rule of Trading</SectionTag>
        <p style={{ fontSize: 20, color: C.text, fontWeight: 300, lineHeight: 1.5, margin: '0 0 12px' }}>
          &ldquo;Protect your capital first. Profits come second.&rdquo;
        </p>
        <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.9, margin: 0 }}>
          A trader who loses 50% of their account needs a 100% gain just to break even. Most beginners focus on making money — 
          professionals focus on NOT losing it. Risk management is the discipline that separates long-term survivors from those who blow up their accounts.
        </p>
      </Card>

      {[
        { title: '🎯 Position Sizing', color: C.cyan,
          content: `Never risk more than 1–2% of your total account on any single trade.

If you have $10,000:
• 1% risk = $100 max loss per trade
• Buy AAPL at $258, stop at $252 → risk = $6/share → max 16 shares

The Kelly Criterion is a mathematical formula that tells you the optimal position size based on your win rate and average profit/loss ratio. Conservative traders use half-Kelly for safety.

Why this matters: Even with a 55% win rate, you can go on a 10-loss streak due to variance. Proper sizing keeps you in the game during bad runs.` },
        { title: '🛑 Stop Loss Orders', color: C.red,
          content: `A stop loss is a pre-set price at which you exit a losing trade automatically. It removes emotion from the equation.

Types of stop loss:
• **Fixed stop**: Set X dollars/points below entry
• **Percentage stop**: Exit if trade moves X% against you (e.g. -3%)
• **ATR stop**: Based on Average True Range — respects the stock's natural volatility
• **Trailing stop**: Follows price upward, locks in profits

Common mistake: Moving your stop loss further down to "give the trade more room." This is how small losses become catastrophic ones.

In the demo account: Practice setting mental stop losses and exiting when they're hit, even if you "feel" the trade will recover.` },
        { title: '📊 Risk/Reward Ratio', color: C.green,
          content: `Every trade should have a defined Risk/Reward ratio (R:R).

Example:
• Entry: $100
• Stop Loss: $95 → Risk = $5
• Target: $115 → Reward = $15
• R:R = 1:3

With a 1:3 R:R you only need to be right 25% of the time to be profitable.

**Minimum acceptable R:R:**
• Day trading: 1:1.5 minimum
• Swing trading: 1:2 minimum
• Position trading: 1:3 or better

Always calculate the R:R before entering — if it doesn't meet your minimum, skip the trade.` },
        { title: '📦 Diversification', color: C.amber,
          content: `"Don't put all your eggs in one basket" is literally portfolio management 101.

**How to diversify:**
• Across sectors: Tech, Healthcare, Energy, Finance, Consumer
• Across geographies: US, India, Europe, Emerging Markets
• Across asset classes: Stocks, Bonds, Commodities, Crypto
• By market cap: Large-cap (stable), Small-cap (growth)

**Correlation risk:** During crashes, most assets fall together (correlations go to 1). Gold, bonds, and VIX usually serve as hedges.

**Over-diversification:** Holding 50+ stocks is "deworsification" — you end up matching index performance with more complexity. 10–20 well-researched positions is often ideal for individual investors.` },
        { title: '🧠 Trading Psychology', color: C.sub,
          content: `80% of trading success is psychological. The charts are simple. Managing your emotions is not.

**The 4 enemies:**
• **Fear** — Causes premature exits from winning trades
• **Greed** — Causes holding too long, turning wins into losses
• **Hope** — "It'll come back" — usually doesn't
• **Overconfidence** — After a win streak, taking oversized risky positions

**Best practices:**
• Keep a trading journal — Write your reasoning before every trade
• Define rules before entering — "I'll exit if it drops 3% or rises 8%"
• Never trade angry, tired, or after a big loss (revenge trading destroys accounts)
• Celebrate the process, not just the outcome — a good process with bad luck is better than a bad process with good luck

In this app: The paper trading demo is perfect for learning these lessons without real financial consequences.` },
      ].map((item) => (
        <Card key={item.title}>
          <h3 style={{ fontSize: 16, color: C.text, fontWeight: 600, margin: '0 0 12px' }}>{item.title}</h3>
          <div>
            {item.content.split('\n').map((line, i) => {
              if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
              if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: 700, color: item.color, fontSize: 13, marginTop: 10, marginBottom: 2 }}>{line.replace(/\*\*/g, '')}</div>;
              if (line.startsWith('•')) return <div key={i} style={{ fontSize: 13, color: C.sub, lineHeight: 1.8, paddingLeft: 12, display: 'flex', gap: 8 }}><span style={{ color: item.color }}>·</span><span>{line.slice(1).trim()}</span></div>;
              return <div key={i} style={{ fontSize: 13, color: C.sub, lineHeight: 1.9 }}>{line}</div>;
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─────────────── FINAGENTS SYSTEM ────────────────────────────────────────── */
function FinAgentsSection() {
  const [activeAgent, setActiveAgent] = useState(0);
  const agents = [
    {
      name: 'Momentum Agent',
      shortName: 'MOMENTUM',
      icon: '🚀',
      color: C.green,
      role: 'Trend Follower',
      signal: 'BUY',
      tagline: 'Follow the strongest moves. Align with the tape.',
      description: `The Momentum Agent is the platform's primary trend-following engine. It identifies stocks and assets that are already in strong directional moves and generates "ride the wave" signals.`,
      howItWorks: [
        'Calculates 20-day and 50-day Simple Moving Averages from real market data',
        'Detects Golden Cross (SMA-20 > SMA-50) as a primary BUY trigger',
        'Monitors relative strength: how is this stock performing vs. its sector and the broader market (SPY/Nifty)?',
        'Checks volume: breakouts need volume confirmation to be valid',
        'Generates BUY signal when: price > SMA-20 > SMA-50 AND volume expanding AND RSI between 50–70',
      ],
      whenItWorks: 'Strong trending markets (bull runs, sector rotations). Works best in clear up-trends with expanding volume.',
      whenItFails: 'Range-bound, choppy, or sideways markets. Often generates false signals when the market lacks clear direction.',
      inApp: 'You can see Momentum Agent signals in real-time on the Dashboard Signal Stream and on every Market Detail page Signal Snapshot.',
    },
    {
      name: 'Mean Reversion Agent',
      shortName: 'MEAN REV',
      icon: '🔄',
      color: C.amber,
      role: 'Contrarian Fader',
      signal: 'SELL',
      tagline: 'What goes too far, comes back. Fade the extremes.',
      description: `The Mean Reversion Agent fades over-extended moves. It identifies when a stock has moved too far, too fast, and generates signals expecting a snap-back toward the average.`,
      howItWorks: [
        'Calculates the Z-score of current price relative to its 20-day mean and standard deviation',
        'Z-score > 2.0 means price is >2 standard deviations above average → likely overbought → SELL signal',
        'Z-score < -2.0 means price is >2 standard deviations below average → likely oversold → BUY signal',
        'Uses RSI-14 as a confirming indicator: RSI > 70 adds to overbought evidence',
        'Checks for high-volume capitulation moves as a potential reversal signal',
      ],
      whenItWorks: 'Range-bound markets, earnings overreaction snapbacks, sector rotations, and liquid large-cap stocks that tend to revert.',
      whenItFails: 'Trending stocks in momentum phases. A stock can stay overbought for months in a strong bull trend. Fundamental deterioration can also drive a permanent new lower level.',
      inApp: 'The Signal Explanation on the Dashboard will say "Mean reversion: Z-score > 2.0 — price significantly above historical mean" when this agent fires.',
    },
    {
      name: 'Risk Manager Agent',
      shortName: 'RISK MGR',
      icon: '🛡️',
      color: C.red,
      role: 'Capital Protector',
      signal: 'HOLD',
      tagline: 'Position sizing. Drawdown control. Capital preservation.',
      description: `The Risk Manager Agent sits above all other agents in the hierarchy. It evaluates every signal against current portfolio exposure, market volatility, and account drawdown — and can override BUY/SELL signals with HOLD or REJECTED decisions.`,
      howItWorks: [
        'Monitors account drawdown — if portfolio is down >10% from peak, reduces position sizes',
        'Checks VIX (Fear Gauge) — if VIX > 30, increases required R:R ratio before allowing new BUYs',
        'Evaluates position concentration — prevents more than 20% of portfolio in a single name',
        'Runs correlation checks — avoids adding new positions that are highly correlated with existing ones',
        'Can emit REJECTED signal when risk parameters are violated',
      ],
      whenItWorks: 'Always. The Risk Manager never takes time off. Its job is to prevent single bad decisions from destroying the account.',
      whenItFails: 'Extreme black swan events (2020 COVID crash, 2008 Lehman). All risk models have tails they don\'t anticipate.',
      inApp: 'If you see "REJECTED" in the Signal Stream or "Risk limit exceeded" in the agent response, the Risk Manager has overridden the directional agents.',
    },
    {
      name: 'LLM Agent (AI Analyst)',
      shortName: 'LLM',
      icon: '🧠',
      color: C.cyan,
      role: 'Qualitative Analyst',
      signal: 'CONTEXTUAL',
      tagline: 'Synthesize news, earnings, and context. Understand the why.',
      description: `The LLM (Large Language Model) Agent brings natural language understanding to the platform. It processes qualitative inputs — earnings call transcripts, news headlines, analyst commentary — and translates them into signals the other agents can use.`,
      howItWorks: [
        'Reads and classifies financial news sentiment: Positive / Negative / Neutral',
        'Analyzes earnings call transcripts for management tone and guidance changes',
        'Cross-references analyst upgrades/downgrades with technical signals',
        'Can initiate contextual CAUTION signals when news fundamentally changes the thesis',
        'Generates human-readable explanations for every signal it produces — "why this trade"',
      ],
      whenItWorks: 'High-information events: earnings releases, Fed announcements, M&A news, regulatory events. Adds qualitative layer on top of pure price signals.',
      whenItFails: 'Quiet news days with no catalysts. Also prone to reacting to "noise" — not every headline is material.',
      inApp: 'Signal explanations like "Momentum signal: 20-day MA crossed above 50-day MA with strong volume" come from LLM-formatted outputs from the agent system.',
    },
  ];

  const ag = agents[activeAgent];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <Card>
        <SectionTag color={C.cyan}>FinAgent Orchestration System</SectionTag>
        <h2 style={{ fontSize: 22, color: C.text, fontWeight: 300, margin: '8px 0 12px', lineHeight: 1.4 }}>
          Multi-Agent AI Architecture for Algorithmic Trading
        </h2>
        <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.9, margin: 0 }}>
          FinAgents is a protocol-driven multi-agent framework built into this platform. It coordinates four specialized AI agents through a central Orchestrator to produce buy/sell/hold signals. Each agent has a specific role and expertise — together they form a system more robust than any single model alone.
        </p>
      </Card>

      {/* Architecture diagram */}
      <Card>
        <SectionTag color={C.amber}>System Architecture</SectionTag>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: C.sub, lineHeight: 2, background: 'rgba(0,183,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, overflowX: 'auto' }}>
          <div style={{ color: C.cyan }}>┌─────────────────────────────────────────────────────┐</div>
          <div style={{ color: C.cyan }}>│         FINAGENT ORCHESTRATOR (Central Brain)        │</div>
          <div style={{ color: C.cyan }}>│  ┌──────────────┐    ┌──────────────────────────────┐│</div>
          <div style={{ color: C.sub  }}>│  │  DAG Planner │────│    Execution Engine          ││</div>
          <div style={{ color: C.sub  }}>│  │ (task graph) │    │  (workflow coordination)     ││</div>
          <div style={{ color: C.cyan }}>│  └──────────────┘    └──────────────────────────────┘│</div>
          <div style={{ color: C.cyan }}>└─────────────────────────────┬───────────────────────┘</div>
          <div style={{ color: C.muted }}>                              │</div>
          <div style={{ color: C.green }}>┌─────────────────────────────┴───────────────────────┐</div>
          <div style={{ color: C.green }}>│                  AGENT POOL LAYER                   │</div>
          <div style={{ color: C.sub  }}>│  [Momentum]  [Mean Reversion]  [Risk]  [LLM Analyst]│</div>
          <div style={{ color: C.green }}>└─────────────────────────────┬───────────────────────┘</div>
          <div style={{ color: C.muted }}>                              │</div>
          <div style={{ color: C.amber }}>┌─────────────────────────────┴───────────────────────┐</div>
          <div style={{ color: C.amber }}>│            MEMORY &amp; RL LAYER                          │</div>
          <div style={{ color: C.sub  }}>│   [Signal Memory]  [RL Policy Engine]  [Backtester] │</div>
          <div style={{ color: C.amber }}>└─────────────────────────────────────────────────────┘</div>
        </div>
      </Card>

      {/* Agent selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {agents.map((a, i) => (
          <button
            key={a.shortName} type="button"
            onClick={() => setActiveAgent(i)}
            style={{
              background: activeAgent === i ? `${a.color}12` : C.surface,
              border: `1px solid ${activeAgent === i ? `${a.color}50` : C.border}`,
              borderRadius: 10, padding: '12px 8px', cursor: 'pointer',
              textAlign: 'center', transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{a.icon}</div>
            <div style={{ fontSize: 11, color: activeAgent === i ? a.color : C.sub, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.1em' }}>{a.shortName}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{a.role}</div>
          </button>
        ))}
      </div>

      {/* Agent detail */}
      <Card style={{ borderColor: `${ag.color}40` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 36 }}>{ag.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 20, color: C.text, fontWeight: 600, margin: 0 }}>{ag.name}</h2>
              <span style={{ background: `${ag.color}18`, border: `1px solid ${ag.color}44`, borderRadius: 4, padding: '2px 8px', fontSize: 10, color: ag.color, fontFamily: 'JetBrains Mono, monospace' }}>{ag.role}</span>
            </div>
            <p style={{ fontSize: 13, color: ag.color, margin: 0, fontStyle: 'italic' }}>"{ag.tagline}"</p>
          </div>
        </div>

        <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.9, margin: '0 0 20px' }}>{ag.description}</p>

        <div style={{ background: 'rgba(0,183,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: ag.color, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.2em', marginBottom: 12 }}>HOW IT WORKS</div>
          {ag.howItWorks.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${ag.color}18`, border: `1px solid ${ag.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: ag.color, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>{step}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'rgba(0,230,118,0.04)', border: '1px solid rgba(0,230,118,0.15)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: C.green, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', marginBottom: 8 }}>✅ WORKS BEST WHEN</div>
            <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.7 }}>{ag.whenItWorks}</div>
          </div>
          <div style={{ background: 'rgba(255,61,87,0.04)', border: '1px solid rgba(255,61,87,0.15)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: C.red, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', marginBottom: 8 }}>⚠️ LIMITATIONS</div>
            <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.7 }}>{ag.whenItFails}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, background: 'rgba(0,212,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: C.cyan, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', marginBottom: 6 }}>📍 IN THIS APP</div>
          <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.7 }}>{ag.inApp}</div>
        </div>
      </Card>

      {/* RL Engine & Memory */}
      <Card>
        <SectionTag color={C.amber}>RL Policy Engine & Memory System</SectionTag>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { title: '🎮 Reinforcement Learning Engine', color: C.amber, content: 'Uses a TD3 (Twin Delayed Deep Deterministic Policy Gradient) algorithm to continuously optimize the trading strategy through trial and error. The RL engine runs backtests over historical data and adjusts agent weights based on risk-adjusted returns (Sharpe ratio). Each episode teaches the system which signals led to profitable outcomes vs. which led to losses.' },
            { title: '🧠 Memory Agent', color: C.sub, content: 'Maintains persistent storage of all signals, trades, and performance metrics across sessions. Unlike a stateless API call, the Memory Agent tracks: signal accuracy rates per agent, recent market regimes, correlation patterns, and historically profitable setups. This allows the system to learn and improve over time rather than "forgetting" after each session.' },
          ].map((item) => (
            <div key={item.title} style={{ background: 'rgba(0,183,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 14, color: item.color, fontWeight: 600, marginBottom: 10 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.8 }}>{item.content}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA */}
      <Card style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,100,200,0.08) 0%, rgba(0,183,255,0.04) 100%)' }}>
        <div style={{ fontSize: 20, marginBottom: 10 }}>🚀</div>
        <div style={{ fontSize: 16, color: C.text, fontWeight: 500, marginBottom: 8 }}>See the Agents in Action</div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 18, lineHeight: 1.7 }}>
          Open the Dashboard to watch live agent signals on any stock. The Signal Stream updates every few seconds with real BUY/SELL/HOLD signals.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link to="/dashboard" style={{ background: 'linear-gradient(135deg, #006699, #00d4ff)', color: '#000', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
            Open Dashboard
          </Link>
          <Link to="/agents" style={{ background: 'rgba(0,183,255,0.08)', border: `1px solid ${C.border}`, color: C.cyan, padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
            View All Agents
          </Link>
        </div>
      </Card>
    </div>
  );
}

/* ─────────────── MAIN LEARN PAGE ─────────────────────────────────────────── */
export default function Learn() {
  const [tab, setTab] = useState('basics');

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px 28px', boxShadow: '0 4px 30px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.3em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>Learning Hub</div>
        <h1 style={{ fontSize: 28, color: C.text, fontWeight: 300, margin: '0 0 8px', lineHeight: 1.3 }}>
          Learn Trading — From Basics to AI Agents
        </h1>
        <p style={{ fontSize: 14, color: C.sub, margin: 0, lineHeight: 1.8 }}>
          Everything you need to understand how financial markets work, how to read charts, manage risk, and how the FinAgents AI system generates signals for this platform.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id} type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '9px 18px', borderRadius: 8, border: `1px solid ${tab === t.id ? 'rgba(0,212,255,0.4)' : C.border}`,
              background: tab === t.id ? 'rgba(0,212,255,0.1)' : C.surface,
              color: tab === t.id ? C.cyan : C.sub,
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'basics'    && <TradingBasics />}
      {tab === 'technical' && <TechnicalAnalysis />}
      {tab === 'risk'      && <RiskManagement />}
      {tab === 'finagents' && <FinAgentsSection />}
    </div>
  );
}
