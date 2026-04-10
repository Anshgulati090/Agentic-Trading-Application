"""Dynamic Market Simulation Environment.

This module provides a realistic market simulation with order books,
price evolution using GBM + jump diffusion, and regime transitions.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple

import numpy as np

if TYPE_CHECKING:
    from FinAgents.research.domain_agents.base_agent import MarketData


class MarketRegime(str, Enum):
    """Enumeration of market regime states."""

    BULL = "BULL"
    BEAR = "BEAR"
    HIGH_VOLATILITY = "HIGH_VOLATILITY"
    LOW_VOLATILITY = "LOW_VOLATILITY"
    SIDEWAYS = "SIDEWAYS"
    CRASH = "CRASH"
    RECOVERY = "RECOVERY"


class OrderType(str, Enum):
    """Enumeration of order types."""

    MARKET = "MARKET"
    LIMIT = "LIMIT"


class OrderSide(str, Enum):
    """Enumeration of order sides."""

    BUY = "BUY"
    SELL = "SELL"


@dataclass
class Order:
    """Represents a trading order.

    Attributes
    ----------
    order_id : str
        Unique identifier for the order.
    symbol : str
        Trading symbol.
    side : OrderSide
        Buy or sell.
    quantity : float
        Order quantity.
    price : float or None
        Limit price (None for market orders).
    order_type : OrderType
        Market or limit order.
    agent_id : str
        ID of the agent submitting the order.
    timestamp : datetime
        Order submission time.
    filled : bool
        Whether the order has been filled.
    fill_price : float or None
        Price at which the order was filled.
    fill_time : datetime or None
        Time when the order was filled.
    slippage : float
        Slippage incurred on fill.
    """

    order_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str = ""
    side: OrderSide = OrderSide.BUY
    quantity: float = 0.0
    price: Optional[float] = None
    order_type: OrderType = OrderType.MARKET
    agent_id: str = ""
    timestamp: datetime = field(default_factory=datetime.utcnow)
    filled: bool = False
    fill_price: Optional[float] = None
    fill_time: Optional[datetime] = None
    slippage: float = 0.0

    def __post_init__(self) -> None:
        """Convert string enums to proper types if needed."""
        if isinstance(self.side, str):
            self.side = OrderSide(self.side)
        if isinstance(self.order_type, str):
            self.order_type = OrderType(self.order_type)


class L2OrderBook:
    """Simplified Level 2 order book for market simulation.

    Maintains bid and ask levels with configurable spread and depth.
    Implements realistic fill logic with slippage proportional to order size.

    Attributes
    ----------
    symbol : str
        Trading symbol.
    bids : list of tuple
        List of (price, quantity) for bid levels, sorted descending.
    asks : list of tuple
        List of (price, quantity) for ask levels, sorted ascending.
    """

    def __init__(
        self,
        symbol: str,
        initial_price: float,
        spread_bps: float = 10.0,
        depth: int = 5,
    ) -> None:
        """Initialize the order book.

        Parameters
        ----------
        symbol : str
            Trading symbol.
        initial_price : float
            Initial mid-price.
        spread_bps : float
            Spread in basis points (default 10 bps = 0.1%).
        depth : int
            Number of price levels on each side.
        """
        self.symbol = symbol
        self._mid_price = initial_price
        self._spread_bps = spread_bps
        self._depth = depth
        self.bids: List[Tuple[float, float]] = []
        self.asks: List[Tuple[float, float]] = []
        self._rng = np.random.default_rng()
        self._update_book()

    def _update_book(self) -> None:
        """Regenerate the order book around the current mid price."""
        half_spread = self._mid_price * self._spread_bps / 10000 / 2
        base_bid = self._mid_price - half_spread
        base_ask = self._mid_price + half_spread

        # Generate bid levels (descending prices)
        self.bids = []
        for i in range(self._depth):
            price = base_bid - (i * half_spread * 0.5)
            # Quantity decreases with distance from mid
            quantity = max(100, 1000 * (1 - i * 0.15) + self._rng.uniform(-100, 100))
            self.bids.append((round(price, 4), round(quantity, 2)))

        # Generate ask levels (ascending prices)
        self.asks = []
        for i in range(self._depth):
            price = base_ask + (i * half_spread * 0.5)
            quantity = max(100, 1000 * (1 - i * 0.15) + self._rng.uniform(-100, 100))
            self.asks.append((round(price, 4), round(quantity, 2)))

        # Sort bids descending, asks ascending
        self.bids.sort(key=lambda x: x[0], reverse=True)
        self.asks.sort(key=lambda x: x[0])

    def fill_order(self, order: Order) -> Order:
        """Fill an order through the order book.

        Market orders fill at best bid/ask with slippage proportional
        to order size relative to available depth.

        Parameters
        ----------
        order : Order
            The order to fill.

        Returns
        -------
        Order
            A copy of the order with fill information.
        """
        filled_order = Order(
            order_id=order.order_id,
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            price=order.price,
            order_type=order.order_type,
            agent_id=order.agent_id,
            timestamp=order.timestamp,
        )

        if order.order_type == OrderType.MARKET:
            # Market order - fill immediately
            if order.side == OrderSide.BUY:
                # Buy at ask
                best_ask_price, best_ask_qty = self.asks[0]
                slippage_factor = min(1.0, order.quantity / best_ask_qty)
                slippage = self.get_spread() * slippage_factor * 0.5
                fill_price = best_ask_price + slippage
            else:
                # Sell at bid
                best_bid_price, best_bid_qty = self.bids[0]
                slippage_factor = min(1.0, order.quantity / best_bid_qty)
                slippage = self.get_spread() * slippage_factor * 0.5
                fill_price = best_bid_price - slippage

            filled_order.fill_price = round(fill_price, 4)
            filled_order.slippage = round(slippage, 4)
            filled_order.filled = True
            filled_order.fill_time = datetime.utcnow()

        elif order.order_type == OrderType.LIMIT:
            # Limit order - fill only if price is favorable
            if order.side == OrderSide.BUY:
                # Buy limit - fill if ask <= limit price
                best_ask_price, _ = self.asks[0]
                if order.price is not None and best_ask_price <= order.price:
                    filled_order.fill_price = best_ask_price
                    filled_order.filled = True
                    filled_order.fill_time = datetime.utcnow()
            else:
                # Sell limit - fill if bid >= limit price
                best_bid_price, _ = self.bids[0]
                if order.price is not None and best_bid_price >= order.price:
                    filled_order.fill_price = best_bid_price
                    filled_order.filled = True
                    filled_order.fill_time = datetime.utcnow()

        return filled_order

    def update_book(self, mid_price: float) -> None:
        """Update the order book around a new mid price.

        Parameters
        ----------
        mid_price : float
            New mid-price to center the book around.
        """
        self._mid_price = mid_price
        self._update_book()

    def get_mid_price(self) -> float:
        """Get the current mid-price.

        Returns
        -------
        float
            The mid-price between best bid and ask.
        """
        if self.bids and self.asks:
            return (self.bids[0][0] + self.asks[0][0]) / 2
        return self._mid_price

    def get_spread(self) -> float:
        """Get the current bid-ask spread.

        Returns
        -------
        float
            The spread between best bid and ask.
        """
        if self.bids and self.asks:
            return self.asks[0][0] - self.bids[0][0]
        return self._mid_price * self._spread_bps / 10000


@dataclass
class MarketState:
    """Complete state of a single market/symbol.

    Attributes
    ----------
    symbol : str
        Trading symbol.
    current_price : float
        Current price.
    open : float
        Opening price for the current bar.
    high : float
        High price for the current bar.
    low : float
        Low price for the current bar.
    volume : float
        Trading volume for the current bar.
    timestamp : datetime
        Current timestamp.
    regime : MarketRegime
        Current market regime.
    volatility : float
        Current volatility level.
    bid : float
        Current best bid.
    ask : float
        Current best ask.
    price_history : list of dict
        Historical OHLCV bars.
    order_book : L2OrderBook
        Current order book.
    """

    symbol: str
    current_price: float
    open: float
    high: float
    low: float
    volume: float
    timestamp: datetime
    regime: MarketRegime
    volatility: float
    bid: float
    ask: float
    price_history: List[Dict[str, Any]] = field(default_factory=list)
    order_book: Optional[L2OrderBook] = None


class MarketEnvironment:
    """Dynamic market simulation environment.

    Simulates price evolution using GBM with jump diffusion,
    regime transitions, and market impact from agent orders.

    Attributes
    ----------
    symbols : list
        List of trading symbols.
    states : dict
        Current MarketState per symbol.
    current_step : int
        Current simulation step.
    """

    # Regime-dependent volatility multipliers
    REGIME_VOLATILITY = {
        MarketRegime.BULL: 0.8,
        MarketRegime.BEAR: 1.2,
        MarketRegime.HIGH_VOLATILITY: 2.0,
        MarketRegime.LOW_VOLATILITY: 0.5,
        MarketRegime.SIDEWAYS: 0.6,
        MarketRegime.CRASH: 3.0,
        MarketRegime.RECOVERY: 1.5,
    }

    # Regime transition probabilities (Markov chain)
    REGIME_TRANSITIONS = {
        MarketRegime.BULL: {
            MarketRegime.BULL: 0.70,
            MarketRegime.SIDEWAYS: 0.15,
            MarketRegime.BEAR: 0.10,
            MarketRegime.HIGH_VOLATILITY: 0.05,
        },
        MarketRegime.BEAR: {
            MarketRegime.BEAR: 0.60,
            MarketRegime.SIDEWAYS: 0.15,
            MarketRegime.RECOVERY: 0.15,
            MarketRegime.CRASH: 0.10,
        },
        MarketRegime.HIGH_VOLATILITY: {
            MarketRegime.HIGH_VOLATILITY: 0.40,
            MarketRegime.BULL: 0.20,
            MarketRegime.BEAR: 0.20,
            MarketRegime.SIDEWAYS: 0.20,
        },
        MarketRegime.LOW_VOLATILITY: {
            MarketRegime.LOW_VOLATILITY: 0.50,
            MarketRegime.SIDEWAYS: 0.30,
            MarketRegime.BULL: 0.15,
            MarketRegime.BEAR: 0.05,
        },
        MarketRegime.SIDEWAYS: {
            MarketRegime.SIDEWAYS: 0.50,
            MarketRegime.BULL: 0.20,
            MarketRegime.BEAR: 0.20,
            MarketRegime.LOW_VOLATILITY: 0.10,
        },
        MarketRegime.CRASH: {
            MarketRegime.CRASH: 0.30,
            MarketRegime.BEAR: 0.40,
            MarketRegime.RECOVERY: 0.30,
        },
        MarketRegime.RECOVERY: {
            MarketRegime.RECOVERY: 0.40,
            MarketRegime.BULL: 0.35,
            MarketRegime.SIDEWAYS: 0.20,
            MarketRegime.BEAR: 0.05,
        },
    }

    def __init__(
        self,
        symbols: List[str],
        initial_prices: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Initialize the market environment.

        Parameters
        ----------
        symbols : list of str
            Trading symbols.
        initial_prices : dict
            Initial price per symbol.
        config : dict, optional
            Configuration parameters:
            - base_volatility: float (default 0.02)
            - drift: float (default 0.0001)
            - jump_probability: float (default 0.01)
            - jump_magnitude: float (default 0.05)
            - market_impact_factor: float (default 0.001)
            - regime_duration_range: tuple (default (10, 50))
        """
        self.symbols = symbols
        self.initial_prices = initial_prices.copy()
        self.config = config or {}

        # Configuration parameters
        self.base_volatility = self.config.get("base_volatility", 0.02)
        self.drift = self.config.get("drift", 0.0001)
        self.jump_probability = self.config.get("jump_probability", 0.01)
        self.jump_magnitude = self.config.get("jump_magnitude", 0.05)
        self.market_impact_factor = self.config.get("market_impact_factor", 0.001)
        self.regime_duration_range = self.config.get("regime_duration_range", (10, 50))
        forced_regime = self.config.get("forced_regime")
        self.forced_regime = (
            forced_regime
            if isinstance(forced_regime, MarketRegime) or forced_regime is None
            else MarketRegime[str(forced_regime)]
        )

        # Random number generator
        self._rng = np.random.default_rng()

        # Initialize states
        self.states: Dict[str, MarketState] = {}
        self.current_step = 0
        self._regime_schedule: Dict[str, Tuple[MarketRegime, int]] = {}

        for symbol in symbols:
            initial_price = initial_prices.get(symbol, 100.0)
            order_book = L2OrderBook(symbol, initial_price)
            initial_regime = self.forced_regime or MarketRegime.SIDEWAYS

            self.states[symbol] = MarketState(
                symbol=symbol,
                current_price=initial_price,
                open=initial_price,
                high=initial_price,
                low=initial_price,
                volume=0.0,
                timestamp=datetime.utcnow(),
                regime=initial_regime,
                volatility=self.base_volatility * self.REGIME_VOLATILITY[initial_regime],
                bid=order_book.bids[0][0] if order_book.bids else initial_price,
                ask=order_book.asks[0][0] if order_book.asks else initial_price,
                price_history=[],
                order_book=order_book,
            )

            # Initialize regime schedule
            self._regime_schedule[symbol] = (
                initial_regime,
                self._rng.integers(*self.regime_duration_range),
            )

    def step(
        self, agent_orders: Optional[List[Order]] = None
    ) -> Dict[str, MarketState]:
        """Advance the market by one step.

        1. Apply agent orders and compute market impact
        2. Evolve prices using GBM + jump diffusion
        3. Update regime if duration exceeded
        4. Update order books
        5. Record OHLCV bar

        Parameters
        ----------
        agent_orders : list of Order, optional
            Orders submitted by agents.

        Returns
        -------
        dict
            Updated MarketState per symbol.
        """
        agent_orders = agent_orders or []

        # Step 1: Compute market impact from orders
        market_impacts: Dict[str, float] = {symbol: 0.0 for symbol in self.symbols}
        for order in agent_orders:
            if order.symbol in market_impacts:
                signed_value = (
                    order.quantity
                    * (order.price or self.states[order.symbol].current_price)
                    * (1 if order.side == OrderSide.BUY else -1)
                )
                market_impacts[order.symbol] += signed_value

        # Step 2-5: Process each symbol
        for symbol in self.symbols:
            state = self.states[symbol]
            old_price = state.current_price

            # Apply market impact
            impact = market_impacts[symbol] * self.market_impact_factor / 10000
            price_after_impact = old_price * (1 + impact)

            # Evolve price using GBM + jump diffusion
            new_price = self._evolve_price(
                price_after_impact, state.volatility, state.regime
            )

            # Update regime if needed
            current_regime, remaining_duration = self._regime_schedule[symbol]
            if self.forced_regime is not None:
                self._regime_schedule[symbol] = (
                    self.forced_regime,
                    self._rng.integers(*self.regime_duration_range),
                )
                state.regime = self.forced_regime
                state.volatility = (
                    self.base_volatility * self.REGIME_VOLATILITY[self.forced_regime]
                )
            elif remaining_duration <= 0:
                new_regime = self._transition_regime(current_regime)
                new_duration = self._rng.integers(*self.regime_duration_range)
                self._regime_schedule[symbol] = (new_regime, new_duration)
                state.regime = new_regime
                state.volatility = (
                    self.base_volatility * self.REGIME_VOLATILITY[new_regime]
                )
            else:
                self._regime_schedule[symbol] = (current_regime, remaining_duration - 1)

            # Update state
            timestamp = state.timestamp + timedelta(minutes=1)
            state.current_price = new_price
            state.high = max(state.high, new_price)
            state.low = min(state.low, new_price)
            state.volume += self._rng.uniform(1000, 10000)
            state.timestamp = timestamp

            # Update order book
            if state.order_book:
                state.order_book.update_book(new_price)
                state.bid = state.order_book.bids[0][0] if state.order_book.bids else new_price
                state.ask = state.order_book.asks[0][0] if state.order_book.asks else new_price

        # Record OHLCV bars (after all updates)
        for symbol in self.symbols:
            state = self.states[symbol]
            ohlcv_bar = {
                "open": state.open,
                "high": state.high,
                "low": state.low,
                "close": state.current_price,
                "volume": state.volume,
                "timestamp": state.timestamp.isoformat(),
            }
            state.price_history.append(ohlcv_bar)

            # Reset for next bar
            state.open = state.current_price
            state.high = state.current_price
            state.low = state.current_price
            state.volume = 0.0

        self.current_step += 1
        return self.states.copy()

    def _evolve_price(
        self, current_price: float, volatility: float, regime: MarketRegime
    ) -> float:
        """Evolve price using GBM + jump diffusion.

        dS = S * (mu*dt + sigma*dW + J*dN)

        Parameters
        ----------
        current_price : float
            Current price.
        volatility : float
            Current volatility level.
        regime : MarketRegime
            Current market regime.

        Returns
        -------
        float
            New price after evolution.
        """
        dt = 1 / 252  # Daily step
        mu = self.drift
        sigma = volatility

        # Brownian motion component
        dW = self._rng.normal(0, np.sqrt(dt))

        # Jump component
        dN = 1 if self._rng.random() < self.jump_probability else 0
        J = self._rng.normal(0, self.jump_magnitude) if dN else 0

        # GBM with jumps
        price_change = current_price * (mu * dt + sigma * dW + J * dN)
        new_price = current_price + price_change

        # Ensure positive price
        return max(0.01, new_price)

    def _transition_regime(self, current_regime: MarketRegime) -> MarketRegime:
        """Transition to a new regime based on Markov chain.

        Parameters
        ----------
        current_regime : MarketRegime
            Current market regime.

        Returns
        -------
        MarketRegime
            New regime after transition.
        """
        transitions = self.REGIME_TRANSITIONS.get(current_regime, {})
        if not transitions:
            return MarketRegime.SIDEWAYS

        regimes = list(transitions.keys())
        probabilities = list(transitions.values())
        # Use np.random.choice with indices to avoid numpy string conversion
        idx = self._rng.choice(len(regimes), p=probabilities)
        return regimes[idx]

    def fill_orders(self, orders: List[Order]) -> List[Order]:
        """Process orders through order books.

        Parameters
        ----------
        orders : list of Order
            Orders to fill.

        Returns
        -------
        list of Order
            Filled orders with fill prices.
        """
        filled_orders = []
        for order in orders:
            if order.symbol in self.states:
                state = self.states[order.symbol]
                if state.order_book:
                    filled_order = state.order_book.fill_order(order)
                    filled_orders.append(filled_order)
                else:
                    # No order book, fill at current price
                    filled_order = Order(
                        order_id=order.order_id,
                        symbol=order.symbol,
                        side=order.side,
                        quantity=order.quantity,
                        price=order.price,
                        order_type=order.order_type,
                        agent_id=order.agent_id,
                        timestamp=order.timestamp,
                        filled=True,
                        fill_price=state.current_price,
                        fill_time=datetime.utcnow(),
                        slippage=0.0,
                    )
                    filled_orders.append(filled_order)
        return filled_orders

    def get_market_data(self, symbol: str) -> "MarketData":
        """Convert current MarketState to MarketData format.

        Parameters
        ----------
        symbol : str
            Symbol to get data for.

        Returns
        -------
        MarketData
            Market data formatted for agent consumption.
        """
        from FinAgents.research.domain_agents.base_agent import MarketData

        state = self.states.get(symbol)
        if not state:
            raise ValueError(f"Unknown symbol: {symbol}")

        return MarketData(
            symbol=symbol,
            prices=state.price_history[-100:] if state.price_history else [],
            volume=state.volume,
            timestamp=state.timestamp.isoformat(),
            regime=state.regime.value,
        )

    def get_regime(self, symbol: str) -> MarketRegime:
        """Get the current regime for a symbol.

        Parameters
        ----------
        symbol : str
            Symbol to get regime for.

        Returns
        -------
        MarketRegime
            Current market regime.
        """
        state = self.states.get(symbol)
        if state:
            return state.regime
        return MarketRegime.SIDEWAYS

    def set_regime(self, symbol: str, regime: MarketRegime) -> None:
        """Force a regime change for a symbol.

        Parameters
        ----------
        symbol : str
            Symbol to change regime for.
        regime : MarketRegime
            New regime to set.
        """
        if symbol in self.states:
            self.states[symbol].regime = regime
            self.states[symbol].volatility = (
                self.base_volatility * self.REGIME_VOLATILITY[regime]
            )
            # Reset regime duration
            self._regime_schedule[symbol] = (
                regime,
                self._rng.integers(*self.regime_duration_range),
            )

    def reset(self) -> None:
        """Reset the environment to initial state."""
        self.current_step = 0
        self._rng = np.random.default_rng()

        for symbol in self.symbols:
            initial_price = self.initial_prices.get(symbol, 100.0)
            order_book = L2OrderBook(symbol, initial_price)
            initial_regime = self.forced_regime or MarketRegime.SIDEWAYS

            self.states[symbol] = MarketState(
                symbol=symbol,
                current_price=initial_price,
                open=initial_price,
                high=initial_price,
                low=initial_price,
                volume=0.0,
                timestamp=datetime.utcnow(),
                regime=initial_regime,
                volatility=self.base_volatility * self.REGIME_VOLATILITY[initial_regime],
                bid=order_book.bids[0][0] if order_book.bids else initial_price,
                ask=order_book.asks[0][0] if order_book.asks else initial_price,
                price_history=[],
                order_book=order_book,
            )

            self._regime_schedule[symbol] = (
                initial_regime,
                self._rng.integers(*self.regime_duration_range),
            )

    def set_random_seed(self, seed: int) -> None:
        """Set the random seed for reproducibility.

        Parameters
        ----------
        seed : int
            Random seed value.
        """
        self._rng = np.random.default_rng(seed)
