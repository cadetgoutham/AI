from typing import Optional

from pydantic import BaseModel


class CommandRequest(BaseModel):
    prompt: str


class ExecuteRequest(BaseModel):
    command: str


class ExecuteResponse(BaseModel):
    command: str
    return_code: int
    stdout: str
    stderr: str
    success: bool


class AgentResponse(BaseModel):
    command: str
    explanation: str
    risk: str
    allowed: bool
    reason: Optional[str] = None