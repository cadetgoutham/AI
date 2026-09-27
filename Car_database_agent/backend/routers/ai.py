from fastapi import APIRouter, HTTPException

from agent_service import run_agent
from cache import invalidate_cars_cache
from models import PromptRequest

router = APIRouter()


@router.post("/api/ai-action")
async def handle_agent_prompt(req: PromptRequest):
    try:
        result = run_agent(req.prompt, req.conversation_id)
        if result["added"] or result["updated"] or result["deleted"]:
            await invalidate_cars_cache()
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
