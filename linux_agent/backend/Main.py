from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agent import run_agent

from executor import execute_command

from models import (
    AgentResponse,
    CommandRequest,
    ExecuteRequest,
)

from security import validate_command


app = FastAPI(
    title="Linux AI Agent",
    description=(
        "AI agent for Linux system "
        "inspection and command execution"
    ),
    version="2.0.0",
)


app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


@app.get("/")
def health_check():

    return {
        "status": "ok",
        "service": "Linux AI Agent",
    }


@app.post(
    "/agent",
    response_model=AgentResponse,
)
def run_linux_agent(
    request: CommandRequest
):

    if not request.prompt.strip():

        raise HTTPException(
            status_code=400,
            detail="Prompt cannot be empty",
        )

    try:

        result = run_agent(
            request.prompt
        )

        return result

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


@app.post("/agent/execute")
def execute_linux_command(
    request: ExecuteRequest
):

    allowed, reason = validate_command(
        request.command
    )

    if not allowed:

        raise HTTPException(
            status_code=403,
            detail=reason,
        )

    return execute_command(
        request.command
    )