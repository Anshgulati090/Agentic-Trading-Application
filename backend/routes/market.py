from fastapi import APIRouter, Depends, Query

from backend.api.dependencies import get_cache_service, get_market_data_provider
from backend.cache.cache_service import CacheService
from backend.market.data_provider import MarketDataProvider
from backend.services.symbol_resolver import SymbolResolverService


router = APIRouter(tags=["Market"])
resolver = SymbolResolverService()

@router.get("/price/{symbol}")
def get_price(
    symbol: str,
    timeframe: str = Query(default="1M"),
    provider: MarketDataProvider = Depends(get_market_data_provider),
):
    data = provider.get_latest_price(symbol, timeframe=timeframe)

    if not data:
        return {
            "status": "error",
            "message": "No data available"
        }

    return {
        "status": "success",
        "data": data
    }


@router.get("/resolve")
def resolve_symbol(query: str = Query(..., min_length=1)):
    resolved = resolver.resolve(query)
    return {"status": "success", "data": resolved}


@router.get("/suggest")
def suggest_symbols(
    query: str = Query(default="", min_length=0),
    limit: int = Query(default=6, ge=1, le=12),
    cache: CacheService = Depends(get_cache_service),
):
    cached = cache.get_symbol_suggestions(query) if cache.is_available else None
    if cached is not None:
        return {"status": "success", "data": cached[:limit]}
    suggestions = resolver.suggest(query, limit=limit)
    if cache.is_available:
        cache.set_symbol_suggestions(query, suggestions)
    return {"status": "success", "data": suggestions}
