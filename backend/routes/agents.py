from fastapi import APIRouter, HTTPException
from backend.services.execution_service import ExecutionService
from backend.schemas.trade_schema import ExecuteAgentRequest, TradeResponse


router = APIRouter(tags=["Agents"])

execution_service = ExecutionService()


@router.post("/execute", response_model=TradeResponse)
def execute_trade(signal: ExecuteAgentRequest):

    try:
        result = execution_service.execute_trade(signal.model_dump())

        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["reason"])

        return result

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
