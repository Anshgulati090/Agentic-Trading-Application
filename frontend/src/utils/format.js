export function formatPrice(value, symbol = '', decimals = 2) {
  if (value == null) return '—';
  const val = Number(value);
  const isINR = symbol && (symbol.toUpperCase().endsWith('.NS') || symbol.toUpperCase().endsWith('.BO'));
  const isCrypto = symbol && (symbol.endsWith('-USD') || symbol === 'BTC' || symbol === 'ETH');
  
  if (isINR) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(val);
  }
  
  const fracDigits = isCrypto && val >= 1000 ? 0 : decimals;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fracDigits,
    maximumFractionDigits: fracDigits
  }).format(val);
}

export function formatBigNumbers(value, symbol = '') {
  if (value == null) return '—';
  const val = Number(value);
  const isINR = symbol && (symbol.toUpperCase().endsWith('.NS') || symbol.toUpperCase().endsWith('.BO'));
  const currSymbol = isINR ? '₹' : '$';
  
  if (val >= 1e12) return `${currSymbol}${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9)  return `${currSymbol}${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6)  return `${currSymbol}${(val / 1e6).toFixed(1)}M`;
  return `${currSymbol}${val.toFixed(0)}`;
}
