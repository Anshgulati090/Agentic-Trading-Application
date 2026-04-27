export type MarketAssetType =
  | 'Equity'
  | 'ETF'
  | 'Index'
  | 'Crypto'
  | 'Commodity'
  | 'Forex'
  | 'Bond'
  | 'Unknown';

export interface MarketCatalogItem {
  symbol: string;
  name: string;
  type?: string;
  sector?: string;
  exchange?: string;
}

export interface MarketQuote {
  symbol: string;
  name?: string;
  type: MarketAssetType;
  price: number | null;
  change: number | null;
  changePct: number | null;
  history: number[];
  timestamp: number;
  source: string;
}

export interface SectionGroup {
  title: string;
  symbols: string[];
}

export interface MarketSection {
  id: string;
  title: string;
  description: string;
  groups: SectionGroup[];
}
