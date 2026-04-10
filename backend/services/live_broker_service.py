import logging
from typing import Any, Dict

import httpx

from backend.config.settings import get_settings


logger = logging.getLogger("LiveBrokerService")


class LiveBrokerService:
    def __init__(self) -> None:
        self._settings = get_settings()
        self.failover_to_paper = bool(self._settings.LIVE_TRADING_FAILOVER_TO_PAPER)

    def place_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        price_hint: float | None = None,
    ) -> Dict[str, Any]:
        if not self._settings.LIVE_TRADING_ENABLED:
            return {
                "status": "disabled",
                "reason": "LIVE_TRADING_ENABLED is false",
                "provider": self._settings.LIVE_TRADING_PROVIDER,
            }

        provider = (self._settings.LIVE_TRADING_PROVIDER or "alpaca").strip().lower()
        try:
            if provider == "alpaca":
                return self._place_alpaca_order(symbol, side, quantity)
            if provider == "binance":
                return self._place_binance_order(symbol, side, quantity, price_hint=price_hint)
            return {
                "status": "unsupported",
                "reason": f"Unsupported live provider '{provider}'",
                "provider": provider,
            }
        except Exception as exc:
            logger.error("Live order failed: %s", exc, exc_info=True)
            return {
                "status": "error",
                "reason": f"Live broker error: {exc}",
                "provider": provider,
            }

    def _place_alpaca_order(self, symbol: str, side: str, quantity: float) -> Dict[str, Any]:
        if not self._settings.ALPACA_API_KEY or not self._settings.ALPACA_API_SECRET:
            return {
                "status": "rejected",
                "reason": "Missing ALPACA_API_KEY or ALPACA_API_SECRET",
                "provider": "alpaca",
            }

        side = side.lower().strip()
        if side not in {"buy", "sell"}:
            return {
                "status": "rejected",
                "reason": f"Invalid side '{side}'",
                "provider": "alpaca",
            }

        normalized_symbol = symbol.upper().strip()
        # Alpaca crypto convention is BTC/USD, ETH/USD, etc.
        if normalized_symbol.endswith("-USD"):
            normalized_symbol = normalized_symbol.replace("-USD", "/USD")

        time_in_force = "gtc" if "/" in normalized_symbol else "day"
        payload = {
            "symbol": normalized_symbol,
            "qty": str(quantity),
            "side": side,
            "type": "market",
            "time_in_force": time_in_force,
        }
        headers = {
            "APCA-API-KEY-ID": self._settings.ALPACA_API_KEY,
            "APCA-API-SECRET-KEY": self._settings.ALPACA_API_SECRET,
        }
        base_url = self._settings.ALPACA_ORDER_URL.rstrip("/")
        order_url = f"{base_url}/v2/orders"

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(order_url, json=payload, headers=headers)
        except Exception as exc:
            return {
                "status": "error",
                "reason": f"Network error contacting Alpaca: {exc}",
                "provider": "alpaca",
            }

        if response.status_code >= 400:
            try:
                body = response.json()
            except Exception:
                body = {"message": response.text}
            return {
                "status": "rejected",
                "reason": body.get("message") or body.get("detail") or f"HTTP {response.status_code}",
                "provider": "alpaca",
                "raw": body,
            }

        try:
            body = response.json()
        except Exception:
            body = {}

        broker_status = str(body.get("status", "accepted")).lower()
        is_ok = broker_status in {"new", "accepted", "partially_filled", "filled"}
        return {
            "status": "accepted" if is_ok else "rejected",
            "reason": broker_status,
            "provider": "alpaca",
            "order_id": body.get("id"),
            "raw": body,
        }

    def _place_binance_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        price_hint: float | None = None,
    ) -> Dict[str, Any]:
        if not self._settings.BINANCE_API_KEY or not self._settings.BINANCE_API_SECRET:
            return {
                "status": "rejected",
                "reason": "Missing BINANCE_API_KEY or BINANCE_API_SECRET",
                "provider": "binance",
            }

        side = side.upper().strip()
        if side not in {"BUY", "SELL"}:
            return {
                "status": "rejected",
                "reason": f"Invalid side '{side}'",
                "provider": "binance",
            }

        try:
            from binance.client import Client
        except Exception as exc:
            return {
                "status": "error",
                "reason": f"python-binance unavailable: {exc}",
                "provider": "binance",
            }

        normalized_symbol = symbol.upper().strip().replace("/", "")
        if normalized_symbol.endswith("-USD"):
            normalized_symbol = normalized_symbol.replace("-USD", "USDT")
        normalized_symbol = normalized_symbol.replace("-", "")

        try:
            client = Client(self._settings.BINANCE_API_KEY, self._settings.BINANCE_API_SECRET, testnet=self._settings.BINANCE_TESTNET)
            if self._settings.BINANCE_TESTNET:
                client.create_test_order(
                    symbol=normalized_symbol,
                    side=side,
                    type=Client.ORDER_TYPE_MARKET,
                    quantity=quantity,
                )
                return {
                    "status": "accepted",
                    "reason": "test_order_accepted",
                    "provider": "binance",
                    "simulated": True,
                    "symbol": normalized_symbol,
                }

            order = client.create_order(
                symbol=normalized_symbol,
                side=side,
                type=Client.ORDER_TYPE_MARKET,
                quantity=quantity,
            )
            return {
                "status": "accepted",
                "reason": str(order.get("status", "accepted")),
                "provider": "binance",
                "order_id": order.get("orderId"),
                "raw": order,
            }
        except Exception as exc:
            return {
                "status": "rejected",
                "reason": f"Binance order rejected: {exc}",
                "provider": "binance",
                "symbol": normalized_symbol,
                "price_hint": price_hint,
            }
