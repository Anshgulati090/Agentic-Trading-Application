import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { searchMarkets, getMarketProfile } from '../data/marketCatalog';
import { useMarketQuotes } from '../hooks/useMarketQuotes';
import { createEmptyQuote, formatPercent, formatPrice, trendFromQuote } from '../utils/marketData';
import { MARKET_SECTIONS, QUICK_PICKS, getSectionSymbols } from '../utils/marketSections';
import { AssetCard } from '../components/markets/AssetCard';
import { AssetTable } from '../components/markets/AssetTable';
import { SectionContainer } from '../components/markets/SectionContainer';

const SEARCH_LIMIT = 8;

function useDebouncedValue(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return debounced;
}

function SearchSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="skeleton h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function Markets() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 300);

  const sectionSymbols = useMemo(() => getSectionSymbols(), []);
  const profileBySymbol = useMemo(() => {
    const next = {};
    sectionSymbols.forEach((symbol) => {
      next[symbol] = getMarketProfile(symbol);
    });
    return next;
  }, [sectionSymbols]);

  const { quotes, loading, error, refresh } = useMarketQuotes(sectionSymbols, {
    refreshMs: 15000,
    staleMs: 10000,
  });

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }

    let active = true;

    (async () => {
      setSearchLoading(true);
      try {
        const [remotePayload] = await Promise.all([api.searchSymbols(trimmed)]);
        const remote = remotePayload?.results || remotePayload?.data?.results || [];
        const local = searchMarkets(trimmed, SEARCH_LIMIT);
        const merged = [...local, ...remote].filter((item) => item?.symbol);
        const deduped = Array.from(new Map(merged.map((item) => [item.symbol, item])).values()).slice(0, SEARCH_LIMIT);

        if (active) {
          setResults(deduped);
          setActiveIndex(-1);
          setShowSuggestions(true);
        }
      } catch {
        if (active) {
          setResults(searchMarkets(trimmed, SEARCH_LIMIT));
          setShowSuggestions(true);
          setActiveIndex(-1);
        }
      } finally {
        if (active) setSearchLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const quickPickCards = useMemo(() => {
    return QUICK_PICKS.map((symbol) => {
      const profile = profileBySymbol[symbol] || getMarketProfile(symbol);
      return {
        symbol,
        profile,
        quote: quotes[symbol] || createEmptyQuote(symbol, profile),
      };
    });
  }, [profileBySymbol, quotes]);

  const sectionData = useMemo(() => {
    return MARKET_SECTIONS.map((section) => ({
      ...section,
      groups: section.groups.map((group) => ({
        ...group,
        items: group.symbols.map((symbol) => profileBySymbol[symbol] || getMarketProfile(symbol)),
      })),
    }));
  }, [profileBySymbol]);

  const trending = useMemo(() => {
    return Object.values(quotes)
      .filter((quote) => quote?.price !== null)
      .sort((a, b) => Math.abs(b.changePct || 0) - Math.abs(a.changePct || 0))
      .slice(0, 6);
  }, [quotes]);

  const onSuggestionSelect = useCallback(
    (symbol) => {
      setShowSuggestions(false);
      setQuery(symbol);
      navigate(`/markets/${symbol}`);
    },
    [navigate],
  );

  const handleSearchKeyDown = useCallback(
    (event) => {
      if (!showSuggestions || !results.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % results.length);
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const target = results[activeIndex] || results[0];
        if (target?.symbol) {
          onSuggestionSelect(target.symbol);
        }
      }

      if (event.key === 'Escape') {
        setShowSuggestions(false);
      }
    },
    [activeIndex, onSuggestionSelect, results, showSuggestions],
  );

  return (
    <div className="flex flex-col gap-5">
      <SectionContainer
        title="Global Market Dashboard"
        description="Search and monitor stocks, ETFs, bonds, commodities, currencies, and crypto from one normalized data feed."
        action={
          <button type="button" onClick={refresh} className="btn-ghost" aria-label="Refresh market data">
            Refresh
          </button>
        }
      >
        <div className="max-w-2xl">
          <label htmlFor="market-search" className="section-kicker mb-2 block">
            Search Markets
          </label>
          <div className="relative">
            <input
              id="market-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 120);
              }}
              placeholder="Try AAPL, SPY, BTC-USD, TLT, GC=F"
              autoComplete="off"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-controls="market-suggestion-list"
              aria-autocomplete="list"
              className="input"
            />

            {showSuggestions && (query.trim() || searchLoading) ? (
              <div
                id="market-suggestion-list"
                role="listbox"
                className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl"
              >
                {searchLoading ? (
                  <div className="p-3">
                    <SearchSkeleton />
                  </div>
                ) : results.length ? (
                  results.map((item, index) => {
                    const quote = quotes[item.symbol] || createEmptyQuote(item.symbol, item);
                    const trend = trendFromQuote(quote);
                    const trendClass = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-400';

                    return (
                      <button
                        key={item.symbol}
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${
                          index === activeIndex ? 'bg-cyan-500/10' : 'hover:bg-cyan-500/5'
                        }`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => onSuggestionSelect(item.symbol)}
                      >
                        <div>
                          <div className="font-mono text-sm font-semibold text-cyan-400">{item.symbol}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{item.name || profileBySymbol[item.symbol]?.name || item.symbol}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm text-[var(--text-primary)]">{formatPrice(quote.price, item.symbol)}</div>
                          <div className={`font-mono text-xs ${trendClass}`}>{formatPercent(quote.changePct)}</div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-zinc-500">No symbols found. Try ticker prefixes like `A`, `SP`, `BTC`.</div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
            Market data failed to load: {error}
          </div>
        ) : null}
      </SectionContainer>

      <SectionContainer
        title="Quick Access"
        description="Fast jump cards with normalized price and trend formatting."
      >
        {loading && quickPickCards.every((card) => card.quote.price === null) ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="skeleton h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {quickPickCards.map((entry) => (
              <AssetCard key={entry.symbol} symbol={entry.symbol} name={entry.profile.name} quote={entry.quote} />
            ))}
          </div>
        )}
      </SectionContainer>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {sectionData.map((section) => (
            <SectionContainer key={section.id} title={section.title} description={section.description}>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {section.groups.map((group) => (
                  <AssetTable key={group.title} title={group.title} items={group.items} quotes={quotes} loading={loading} />
                ))}
              </div>
            </SectionContainer>
          ))}
        </div>

        <SectionContainer title="Trending" description="Largest absolute percentage movers from the unified market feed.">
          {trending.length ? (
            <div className="space-y-2" aria-live="polite">
              {trending.map((quote) => {
                const trend = trendFromQuote(quote);
                const trendClass = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-400';
                const profile = profileBySymbol[quote.symbol] || getMarketProfile(quote.symbol);

                return (
                  <Link
                    key={quote.symbol}
                    to={`/markets/${quote.symbol}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    aria-label={`View ${quote.symbol} trending detail`}
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold text-cyan-400">{quote.symbol}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{profile.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs text-[var(--text-primary)]">{formatPrice(quote.price, quote.symbol)}</div>
                      <div className={`font-mono text-xs ${trendClass}`}>{formatPercent(quote.changePct)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/30 p-4 text-sm text-zinc-500">
              No trend candidates yet. Quotes will appear once data is available.
            </div>
          )}
        </SectionContainer>
      </div>
    </div>
  );
}
