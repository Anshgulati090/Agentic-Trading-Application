import type { MarketSection } from '../types/market';

export const QUICK_PICKS = [
  'AAPL',
  'NVDA',
  'MSFT',
  'TSLA',
  'SPY',
  'QQQ',
  'BTC-USD',
  'ETH-USD',
  'VIX',
] as const;

export const MARKET_SECTIONS: MarketSection[] = [
  {
    id: 'world-indices',
    title: 'World Indices',
    description: 'Major benchmark indices grouped by region.',
    groups: [
      { title: 'Americas', symbols: ['^GSPC', '^DJI', '^IXIC', '^RUT', 'VIX'] },
      { title: 'Europe', symbols: ['^FTSE', '^STOXX50E'] },
      { title: 'Asia', symbols: ['^N225', '^HSI', '^NSEI', '^BSESN'] },
    ],
  },
  {
    id: 'assets',
    title: 'Assets',
    description: 'Strictly separated asset classes with no overlaps.',
    groups: [
      { title: 'Stocks', symbols: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'XOM', 'CVX'] },
      { title: 'ETFs', symbols: ['SPY', 'QQQ', 'DIA', 'IWM', 'GLD', 'SLV'] },
      { title: 'Treasury Bonds', symbols: ['TLT', 'IEF', 'SHY', 'BIL'] },
      { title: 'Commodities', symbols: ['GC=F', 'SI=F', 'CL=F', 'NG=F'] },
      { title: 'Currencies', symbols: ['EURUSD=X', 'GBPUSD=X', 'USDINR=X', 'USDJPY=X'] },
    ],
  },
  {
    id: 'crypto',
    title: 'Crypto Markets',
    description: 'Digital assets quoted against USD.',
    groups: [
      { title: 'Digital Assets', symbols: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD'] },
    ],
  },
];

export function getSectionSymbols(): string[] {
  const seen = new Set<string>();
  MARKET_SECTIONS.forEach((section) => {
    section.groups.forEach((group) => {
      group.symbols.forEach((symbol) => {
        if (!seen.has(symbol)) {
          seen.add(symbol);
        }
      });
    });
  });

  QUICK_PICKS.forEach((symbol) => seen.add(symbol));
  return Array.from(seen);
}
