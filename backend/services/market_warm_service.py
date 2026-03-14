import asyncio
import contextlib

from backend.cache.cache_service import CacheService
from backend.market.data_provider import MarketDataProvider


class MarketWarmService:
    def __init__(
        self,
        cache: CacheService,
        symbols: list[str],
        timeframes: list[str],
        interval_seconds: int = 20,
    ) -> None:
        self._provider = MarketDataProvider(cache=cache)
        self._symbols = [symbol.upper() for symbol in symbols if symbol]
        self._timeframes = [timeframe.upper() for timeframe in timeframes if timeframe]
        self._interval_seconds = max(10, int(interval_seconds))
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        if self._task or not self._symbols or not self._timeframes:
            return
        self._running = True
        self._task = asyncio.create_task(self._run(), name="market-warm-service")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None

    async def _run(self) -> None:
        while self._running:
            for symbol in self._symbols:
                for timeframe in self._timeframes:
                    try:
                        await asyncio.to_thread(self._provider.get_latest_price, symbol, timeframe)
                    except Exception:
                        continue
            await asyncio.sleep(self._interval_seconds)
