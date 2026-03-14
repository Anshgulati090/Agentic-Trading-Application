const CATALOG = [
  { symbol: "AAPL", name: "Apple", type: "Equity", sector: "Technology", exchange: "NASDAQ", description: "Consumer hardware and ecosystem leader with deep services revenue.", tags: ["Large Cap", "iPhone", "Services"], aliases: ["apple", "apple stock", "apple inc"] },
  { symbol: "MSFT", name: "Microsoft", type: "Equity", sector: "Technology", exchange: "NASDAQ", description: "Cloud, productivity, and AI platform heavyweight with recurring enterprise demand.", tags: ["Cloud", "Enterprise", "AI"], aliases: ["microsoft", "microsoft stock"] },
  { symbol: "GOOGL", name: "Alphabet", type: "Equity", sector: "Communication Services", exchange: "NASDAQ", description: "Search and ad platform paired with cloud and AI infrastructure growth.", tags: ["Ads", "Search", "AI"], aliases: ["google", "alphabet", "google stock"] },
  { symbol: "AMZN", name: "Amazon", type: "Equity", sector: "Consumer Discretionary", exchange: "NASDAQ", description: "E-commerce and cloud operator with logistics and AWS scale advantages.", tags: ["Retail", "AWS", "Logistics"], aliases: ["amazon", "amazon stock"] },
  { symbol: "TSLA", name: "Tesla", type: "Equity", sector: "Consumer Discretionary", exchange: "NASDAQ", description: "High-volatility EV and autonomy name favored by momentum traders.", tags: ["EV", "Autonomy", "Momentum"], aliases: ["tesla", "tesla stock"] },
  { symbol: "META", name: "Meta Platforms", type: "Equity", sector: "Communication Services", exchange: "NASDAQ", description: "Social platforms plus ad monetization with AI and metaverse optionality.", tags: ["Ads", "Social", "AI"], aliases: ["meta", "facebook", "facebook stock"] },
  { symbol: "NVDA", name: "NVIDIA", type: "Equity", sector: "Technology", exchange: "NASDAQ", description: "GPU and AI infrastructure leader often used for trend-following setups.", tags: ["Chips", "AI", "Semiconductors"], aliases: ["nvidia", "nvidia stock", "nvidea"] },
  { symbol: "NFLX", name: "Netflix", type: "Equity", sector: "Communication Services", exchange: "NASDAQ", description: "Global streaming platform with margin expansion and content-driven moves.", tags: ["Streaming", "Media", "Growth"], aliases: ["netflix"] },
  { symbol: "AMD", name: "Advanced Micro Devices", type: "Equity", sector: "Technology", exchange: "NASDAQ", description: "Semiconductor challenger with strong interest in data center and AI cycles.", tags: ["Chips", "Data Center", "AI"], aliases: ["amd", "advanced micro devices"] },
  { symbol: "INTC", name: "Intel", type: "Equity", sector: "Technology", exchange: "NASDAQ", description: "Legacy chipmaker in a multi-year turnaround and foundry transition.", tags: ["Semiconductors", "Turnaround", "Manufacturing"], aliases: ["intel"] },
  { symbol: "PLTR", name: "Palantir", type: "Equity", sector: "Technology", exchange: "NYSE", description: "Data and AI software name with narrative-driven, sentiment-sensitive trading.", tags: ["AI", "Software", "Narrative"], aliases: ["palantir"] },
  { symbol: "CRM", name: "Salesforce", type: "Equity", sector: "Technology", exchange: "NYSE", description: "Enterprise software compounder with cash flow and productivity tailwinds.", tags: ["SaaS", "Enterprise", "CRM"], aliases: ["salesforce"] },
  { symbol: "ORCL", name: "Oracle", type: "Equity", sector: "Technology", exchange: "NYSE", description: "Database and cloud infrastructure provider with enterprise stickiness.", tags: ["Database", "Cloud", "Enterprise"], aliases: ["oracle"] },
  { symbol: "JPM", name: "JPMorgan Chase", type: "Equity", sector: "Financials", exchange: "NYSE", description: "Large-cap bank used to study macro sensitivity and risk sentiment.", tags: ["Banking", "Macro", "Rates"], aliases: ["jpmorgan", "jp morgan"] },
  { symbol: "GS", name: "Goldman Sachs", type: "Equity", sector: "Financials", exchange: "NYSE", description: "Capital markets and advisory name useful for cyclical finance exposure.", tags: ["Investment Bank", "Markets", "Cyclicals"], aliases: ["goldman", "goldman sachs"] },
  { symbol: "V", name: "Visa", type: "Equity", sector: "Financials", exchange: "NYSE", description: "Payments network with durable margins and clean trend behavior.", tags: ["Payments", "Consumer", "Quality"], aliases: ["visa"] },
  { symbol: "WMT", name: "Walmart", type: "Equity", sector: "Consumer Staples", exchange: "NYSE", description: "Defensive retail name with steadier behavior for comparison against growth stocks.", tags: ["Defensive", "Retail", "Staples"], aliases: ["walmart"] },
  { symbol: "COST", name: "Costco", type: "Equity", sector: "Consumer Staples", exchange: "NASDAQ", description: "Membership retail compounder often used for quality factor examples.", tags: ["Quality", "Retail", "Membership"], aliases: ["costco"] },
  { symbol: "XOM", name: "Exxon Mobil", type: "Equity", sector: "Energy", exchange: "NYSE", description: "Energy major useful for commodity and macro rotation learning.", tags: ["Energy", "Oil", "Macro"], aliases: ["exxon", "exxon mobil"] },
  { symbol: "CVX", name: "Chevron", type: "Equity", sector: "Energy", exchange: "NYSE", description: "Integrated energy name that tracks crude trends and income demand.", tags: ["Energy", "Oil", "Dividend"], aliases: ["chevron"] },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", type: "ETF", sector: "Broad Market", exchange: "NYSE Arca", description: "Broad US index benchmark for market regime and portfolio overlay analysis.", tags: ["ETF", "Index", "Benchmark"], aliases: ["spy", "s&p 500", "sp500"] },
  { symbol: "QQQ", name: "Invesco QQQ Trust", type: "ETF", sector: "Growth", exchange: "NASDAQ", description: "Nasdaq-100 exposure popular for momentum and tech-heavy comparisons.", tags: ["ETF", "Tech", "Momentum"], aliases: ["qqq", "nasdaq 100"] },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", type: "ETF", sector: "Small Cap", exchange: "NYSE Arca", description: "Small-cap risk appetite proxy for rotation and breadth study.", tags: ["ETF", "Small Cap", "Risk-On"], aliases: ["iwm", "russell 2000"] },
  { symbol: "GLD", name: "SPDR Gold Shares", type: "ETF", sector: "Commodities", exchange: "NYSE Arca", description: "Gold exposure used for macro hedging and defensive rotation learning.", tags: ["Gold", "Macro", "Hedge"], aliases: ["gold", "gld"] },
  { symbol: "BTC", name: "Bitcoin", type: "Crypto", sector: "Digital Assets", exchange: "Crypto", description: "High-volatility digital asset for 24/7 market structure and risk management practice.", tags: ["Crypto", "24/7", "Volatility"], aliases: ["bitcoin", "btc"] },
  { symbol: "ETH", name: "Ethereum", type: "Crypto", sector: "Digital Assets", exchange: "Crypto", description: "Smart-contract ecosystem asset often used for alternative crypto regime analysis.", tags: ["Crypto", "Smart Contracts", "Volatility"], aliases: ["ethereum", "ether", "eth"] },
  { symbol: "SOL", name: "Solana", type: "Crypto", sector: "Digital Assets", exchange: "Crypto", description: "Fast-moving crypto asset useful for momentum and sentiment examples.", tags: ["Crypto", "Momentum", "Narrative"], aliases: ["solana", "sol"] },
];

export const MARKET_CATALOG = CATALOG;
export const SYMBOLS = CATALOG.map((item) => item.symbol);

export function getMarketProfile(symbol) {
  const normalized = String(symbol || "").trim().toUpperCase();
  return (
    CATALOG.find((item) => item.symbol === normalized) || {
      symbol: normalized || "AAPL",
      name: normalized || "Unknown Market",
      type: "Market",
      sector: "General",
      exchange: "Global",
      description: "Explore the price structure, signals, and practice-trading workflow for this market.",
      tags: ["Custom"],
      aliases: [],
    }
  );
}

export function searchMarkets(query = "") {
  const normalized = query.trim().toUpperCase();
  if (!normalized) return CATALOG;

  return CATALOG.filter((item) => {
    const haystack = [item.symbol, item.name, item.type, item.sector, item.exchange, ...(item.tags || []), ...(item.aliases || [])]
      .join(" ")
      .toUpperCase();
    return haystack.includes(normalized);
  });
}

export function getFeaturedMarkets() {
  return ["AAPL", "NVDA", "MSFT", "TSLA", "SPY", "BTC"]
    .map((symbol) => getMarketProfile(symbol))
    .filter(Boolean);
}
