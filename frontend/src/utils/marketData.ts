import type { MarketAssetType, MarketCatalogItem, MarketQuote } from '../types/market';

const SYMBOL_ALIAS: Record<string, string> = {
  '^VIX': 'VIX',
  '%5EVIX': 'VIX',
};

const BOND_SYMBOLS = new Set(['TLT', 'IEF', 'SHY', 'BIL']);

function toFiniteNumber(value: unknown): number | null {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function normalizePercent(value: unknown): number | null {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  return Math.abs(n) > 1 ? n / 100 : n;
}

export function normalizeSymbol(symbol: string): string {
  const key = String(symbol || '').trim().toUpperCase();
  return SYMBOL_ALIAS[key] || key;
}

export function normalizeAssetType(item?: MarketCatalogItem | null): MarketAssetType {
  if (!item?.type) {
    if (item?.symbol && BOND_SYMBOLS.has(normalizeSymbol(item.symbol))) return 'Bond';
    return 'Unknown';
  }

  const type = item.type.toLowerCase();
  if (type === 'equity') return 'Equity';
  if (type === 'etf') return 'ETF';
  if (type === 'index') return 'Index';
  if (type === 'crypto') return 'Crypto';
  if (type === 'commodity') return 'Commodity';
  if (type === 'forex') return 'Forex';
  if (type === 'bond' || type === 'treasury') return 'Bond';
  return 'Unknown';
}

export function createEmptyQuote(symbol: string, item?: MarketCatalogItem | null): MarketQuote {
  return {
    symbol: normalizeSymbol(symbol),
    name: item?.name,
    type: normalizeAssetType(item),
    price: null,
    change: null,
    changePct: null,
    history: [],
    timestamp: 0,
    source: 'empty',
  };
}

export function normalizeQuote(symbol: string, raw: unknown, item?: MarketCatalogItem | null): MarketQuote {
  const payload = (raw as { data?: Record<string, unknown> } | null)?.data || (raw as Record<string, unknown>) || {};
  const historyRaw = Array.isArray(payload.history) ? payload.history : [];

  const history = historyRaw
    .map((entry) => {
      if (typeof entry === 'number') return toFiniteNumber(entry);
      if (entry && typeof entry === 'object') {
        const point = entry as { close?: unknown; price?: unknown };
        return toFiniteNumber(point.close ?? point.price);
      }
      return null;
    })
    .filter((v): v is number => v !== null);

  const quote = createEmptyQuote(symbol, item);

  return {
    ...quote,
    price: toFiniteNumber(payload.price),
    change: toFiniteNumber(payload.change),
    changePct: normalizePercent(payload.changePct ?? payload.change_pct),
    history,
    timestamp: toFiniteNumber(payload.timestamp) ?? Date.now(),
    source: String(payload.source || 'api'),
  };
}

export function getCurrencyForSymbol(symbol: string): 'USD' | 'INR' {
  const normalized = normalizeSymbol(symbol);
  if (normalized.endsWith('.NS') || normalized.endsWith('.BO')) return 'INR';
  return 'USD';
}

export function formatPrice(value: number | null, symbol: string): string {
  if (value === null) return 'N/A';
  const currency = getCurrencyForSymbol(symbol);
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatChange(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(2)}`;
}

export function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  const pct = value * 100;
  return `${pct >= 0 ? '+' : '-'}${Math.abs(pct).toFixed(2)}%`;
}

export function trendFromQuote(quote: Pick<MarketQuote, 'change'>): 'up' | 'down' | 'flat' {
  if (quote.change === null) return 'flat';
  if (quote.change > 0) return 'up';
  if (quote.change < 0) return 'down';
  return 'flat';
}

export function safeText(value: unknown, fallback = 'N/A'): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}
