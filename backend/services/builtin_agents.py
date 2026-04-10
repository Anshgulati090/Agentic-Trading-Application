import math
from typing import Any, Dict, List

from core.agents.base_agent import BaseAgent


def _closes(market_data: Dict[str, Any]) -> List[float]:
    history = market_data.get("history") or []
    closes = []
    for row in history:
        try:
            closes.append(float(row.get("close")))
        except (TypeError, ValueError):
            continue
    if not closes:
        try:
            price = float(market_data.get("price", 0.0))
        except (TypeError, ValueError):
            price = 0.0
        if price > 0:
            closes = [price]
    return closes


def _mean(values: List[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _std(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    mu = _mean(values)
    variance = sum((value - mu) ** 2 for value in values) / (len(values) - 1)
    return math.sqrt(max(variance, 0.0))


def _returns(closes: List[float]) -> List[float]:
    out: List[float] = []
    for idx in range(1, len(closes)):
        prev = closes[idx - 1]
        curr = closes[idx]
        if prev <= 0:
            out.append(0.0)
        else:
            out.append((curr / prev) - 1.0)
    return out


def _sma(closes: List[float], window: int) -> float:
    if not closes:
        return 0.0
    if len(closes) < window:
        return _mean(closes)
    return _mean(closes[-window:])


def _safe_price(market_data: Dict[str, Any], closes: List[float]) -> float:
    try:
        price = float(market_data.get("price", 0.0))
    except (TypeError, ValueError):
        price = 0.0
    if price > 0:
        return price
    if closes:
        return closes[-1]
    return 0.0


def _safe_symbol(market_data: Dict[str, Any]) -> str:
    symbol = str(market_data.get("symbol", "AAPL")).upper().strip()
    return symbol or "AAPL"


class _HeuristicBaseAgent(BaseAgent):
    agent_name = "heuristic"

    def __init__(self) -> None:
        self._last_confidence = 0.5
        self._last_explanation = "No signal generated yet."

    def confidence_score(self) -> float:
        return max(0.0, min(1.0, float(self._last_confidence)))

    def explain_decision(self) -> str:
        return self._last_explanation

    def _emit(
        self,
        symbol: str,
        action: str,
        price: float,
        confidence: float,
        explanation: str,
        notional: float = 1000.0,
    ) -> Dict[str, Any]:
        qty = 0.0 if action == "HOLD" or price <= 0 else max(notional / price, 0.0001)
        self._last_confidence = max(0.0, min(1.0, confidence))
        self._last_explanation = explanation
        return {
            "symbol": symbol,
            "action": action,
            "quantity": round(qty, 6),
            "price": round(price, 4),
            "agent": self.agent_name,
        }


class MomentumAgent(_HeuristicBaseAgent):
    agent_name = "momentum"

    def generate_signal(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        closes = _closes(market_data)
        symbol = _safe_symbol(market_data)
        price = _safe_price(market_data, closes)

        fast = _sma(closes, 10)
        slow = _sma(closes, 20)
        if len(closes) >= 5 and closes[-5] > 0:
            slope = (closes[-1] / closes[-5]) - 1.0
        else:
            slope = 0.0

        trend_gap = 0.0 if slow <= 0 else (fast - slow) / slow
        if fast > slow and slope > 0:
            action = "BUY"
        elif fast < slow and slope < 0:
            action = "SELL"
        else:
            action = "HOLD"

        confidence = min(0.95, 0.52 + abs(trend_gap) * 9.0 + abs(slope) * 4.0)
        explanation = (
            f"Momentum regime: SMA10={fast:.2f}, SMA20={slow:.2f}, slope5={slope:.2%}. "
            f"Action={action} based on trend continuation."
        )
        return self._emit(symbol, action, price, confidence, explanation, notional=1500.0)


class MeanReversionAgent(_HeuristicBaseAgent):
    agent_name = "mean_reversion"

    def generate_signal(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        closes = _closes(market_data)
        symbol = _safe_symbol(market_data)
        price = _safe_price(market_data, closes)

        window = closes[-20:] if len(closes) >= 20 else closes
        avg = _mean(window)
        sigma = _std(window)
        z = 0.0 if sigma <= 1e-9 else (price - avg) / sigma

        if z <= -1.25:
            action = "BUY"
        elif z >= 1.25:
            action = "SELL"
        else:
            action = "HOLD"

        confidence = min(0.93, 0.5 + min(abs(z), 2.5) * 0.18)
        explanation = (
            f"Mean-reversion regime: price={price:.2f}, mean20={avg:.2f}, sigma20={sigma:.4f}, z={z:.2f}. "
            f"Action={action} from standardized stretch."
        )
        return self._emit(symbol, action, price, confidence, explanation, notional=1200.0)


class RiskManagerAgent(_HeuristicBaseAgent):
    agent_name = "risk"

    def generate_signal(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        closes = _closes(market_data)
        symbol = _safe_symbol(market_data)
        price = _safe_price(market_data, closes)

        rets = _returns(closes)
        vol = _std(rets[-20:]) if rets else 0.0
        lookback = closes[-20:] if len(closes) >= 20 else closes
        peak = max(lookback) if lookback else price
        drawdown = 0.0 if peak <= 0 else (price / peak) - 1.0

        if drawdown <= -0.05 or vol >= 0.03:
            action = "SELL"
        elif vol <= 0.012 and drawdown > -0.02:
            action = "BUY"
        else:
            action = "HOLD"

        confidence = min(0.9, 0.55 + abs(drawdown) * 3.5 + vol * 6.0)
        explanation = (
            f"Risk posture: drawdown20={drawdown:.2%}, vol20={vol:.2%}. "
            f"Action={action} to enforce survival-first exposure control."
        )
        return self._emit(symbol, action, price, confidence, explanation, notional=800.0)


class ExecutionAgent(_HeuristicBaseAgent):
    agent_name = "execution"

    def generate_signal(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        closes = _closes(market_data)
        symbol = _safe_symbol(market_data)
        price = _safe_price(market_data, closes)
        history = market_data.get("history") or []

        if len(closes) >= 3 and closes[-3] > 0:
            micro_momentum = (closes[-1] / closes[-3]) - 1.0
        else:
            micro_momentum = 0.0

        spread_proxy = 0.0
        if history:
            last = history[-1]
            try:
                high = float(last.get("high", price))
                low = float(last.get("low", price))
                spread_proxy = 0.0 if price <= 0 else max(high - low, 0.0) / price
            except (TypeError, ValueError):
                spread_proxy = 0.0

        if micro_momentum > 0.003:
            action = "BUY"
        elif micro_momentum < -0.003:
            action = "SELL"
        else:
            action = "HOLD"

        confidence = min(0.88, 0.5 + abs(micro_momentum) * 60.0 - spread_proxy * 2.0)
        explanation = (
            f"Execution timing: micro_momentum3={micro_momentum:.2%}, spread_proxy={spread_proxy:.2%}. "
            f"Action={action} for entry/exit quality."
        )
        return self._emit(symbol, action, price, confidence, explanation, notional=1000.0)


class FactorModelAgent(_HeuristicBaseAgent):
    agent_name = "factor"

    def generate_signal(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        closes = _closes(market_data)
        symbol = _safe_symbol(market_data)
        price = _safe_price(market_data, closes)

        if len(closes) >= 20 and closes[-20] > 0:
            mom_20 = (closes[-1] / closes[-20]) - 1.0
        elif len(closes) >= 2 and closes[0] > 0:
            mom_20 = (closes[-1] / closes[0]) - 1.0
        else:
            mom_20 = 0.0

        if len(closes) >= 5 and closes[-5] > 0:
            mom_5 = (closes[-1] / closes[-5]) - 1.0
        else:
            mom_5 = 0.0

        rets = _returns(closes)
        vol_20 = _std(rets[-20:]) if rets else 0.0
        mean_20 = _mean(closes[-20:] if len(closes) >= 20 else closes)
        value_score = 0.0 if mean_20 <= 0 else (mean_20 - price) / mean_20

        score = (0.50 * mom_20) + (0.30 * mom_5) + (0.20 * value_score) - (0.20 * vol_20)
        if score > 0.02:
            action = "BUY"
        elif score < -0.02:
            action = "SELL"
        else:
            action = "HOLD"

        confidence = min(0.94, 0.5 + min(abs(score) * 8.0, 0.42))
        explanation = (
            f"Factor blend: mom20={mom_20:.2%}, mom5={mom_5:.2%}, value={value_score:.2%}, vol20={vol_20:.2%}, score={score:.4f}. "
            f"Action={action} from cross-factor ranking."
        )
        return self._emit(symbol, action, price, confidence, explanation, notional=1400.0)


class LLMStrategyAgent(_HeuristicBaseAgent):
    agent_name = "llm"

    def generate_signal(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        closes = _closes(market_data)
        symbol = _safe_symbol(market_data)
        price = _safe_price(market_data, closes)
        rets = _returns(closes)
        vol_20 = _std(rets[-20:]) if rets else 0.0

        if len(closes) >= 10 and closes[-10] > 0:
            mom_10 = (closes[-1] / closes[-10]) - 1.0
        else:
            mom_10 = 0.0

        if mom_10 > 0.015 and vol_20 < 0.03:
            action = "BUY"
        elif mom_10 < -0.015 and vol_20 > 0.015:
            action = "SELL"
        else:
            action = "HOLD"

        confidence = min(0.9, 0.52 + abs(mom_10) * 8.0 + max(0.0, 0.02 - abs(vol_20 - 0.02)) * 5.0)
        explanation = (
            f"Narrative proxy: momentum10={mom_10:.2%}, volatility20={vol_20:.2%}. "
            f"Action={action} from context-weighted regime interpretation."
        )
        return self._emit(symbol, action, price, confidence, explanation, notional=900.0)


BUILTIN_AGENT_TYPES = {
    "momentum": MomentumAgent,
    "mean_reversion": MeanReversionAgent,
    "risk": RiskManagerAgent,
    "execution": ExecutionAgent,
    "factor": FactorModelAgent,
    "llm": LLMStrategyAgent,
}


def register_builtin_agents(registry: Any) -> None:
    for name, agent_cls in BUILTIN_AGENT_TYPES.items():
        try:
            registry.register(name, agent_cls)
        except ValueError:
            continue
