from fastapi import APIRouter
from pydantic import BaseModel, Field


router = APIRouter(prefix="/ai", tags=["AI Assistant"])


class AssistantRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


def build_reply(message: str) -> str:
    prompt = message.lower()

    if "candlestick" in prompt or "candle" in prompt:
        return (
            "A candlestick shows four key prices for a time period: open, high, low, and close. "
            "Green candles mean price closed above the open. Red candles mean price closed below the open. "
            "Use the wick to understand intraperiod volatility and the body to understand directional strength."
        )
    if "demo" in prompt or "paper trade" in prompt or "practice" in prompt:
        return (
            "Demo trading uses virtual funds only. When you buy, your demo cash decreases and a simulated position is created. "
            "When you sell, the position is reduced and profit or loss is added back to your demo account. "
            "No real orders are sent to a broker."
        )
    if "agent" in prompt:
        return (
            "The platform has six educational agents: Momentum, Mean Reversion, Risk Manager, Execution, Factor Model, and LLM Strategy. "
            "Momentum follows trend strength, Mean Reversion looks for snap-back moves, Risk Manager controls sizing and drawdown, "
            "Execution improves entries and exits, Factor Model ranks structured signals, and LLM Strategy adds narrative context."
        )
    if "how do i use" in prompt or "how to use" in prompt or "dashboard" in prompt:
        return (
            "Start with Markets to find a symbol, open its market page to review price, chart, and signals, then use the Dashboard "
            "to monitor your demo account, active signals, and agent status. The Learn section explains the strategies before you trade."
        )
    if "portfolio" in prompt or "pnl" in prompt:
        return (
            "Portfolio tracks your demo cash, open positions, total value, and profit and loss. "
            "Open positions show unrealized PnL, while closed trades move realized PnL into your account balance."
        )

    return (
        "AgenticTrading is a learning platform for understanding markets safely. You can search symbols, review live-style charts, "
        "study agent explanations, and place demo trades without risking real money. Ask me about charts, demo trading, signals, or agents."
    )


@router.post("/assistant")
def ask_assistant(payload: AssistantRequest):
    return {
        "status": "success",
        "data": {
            "reply": build_reply(payload.message),
        },
    }
