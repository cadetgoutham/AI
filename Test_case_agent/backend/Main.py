from typing import Literal, List
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from agent import test_agent, query_agent
from Chat_services import run_chat
from config import CORS_ORIGINS
from Document_store import document_store
from Extraction import UnsupportedFileType, extract_text
from Models import ChatRequest, ChatResponse, DeleteResponse, DocumentInfo

app = FastAPI()


class GenerateTestRequest(BaseModel):
    user_prompt: str = Field(min_length=1, max_length=20000)
    framework: str
    
class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=20000)


class GenerateQueryRequest(BaseModel):
    user_prompt: str = Field(min_length=1, max_length=20000)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=20)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def health_check():

    return {
        "status": "ok",
        "service": "Test Case AI Agent",
    }

@app.post("/generate-test")
def generate_test(request: GenerateTestRequest):
    response = test_agent(request.user_prompt, request.framework)
    if "error" in response:
        raise HTTPException(status_code=500, detail="Error occurred while generating test")
    return {"response": response}

@app.post("/generate-query")
def generate_query(request: GenerateQueryRequest):
    history = [message.model_dump() for message in request.history]
    response = query_agent(request.user_prompt, history)
    if "error" in response:
        raise HTTPException(status_code=500, detail="Error occurred while generating query")
    return {"response": response}

@app.post("/document_analysis")
def document_analysis(request: GenerateQueryRequest):
    history = [message.model_dump() for message in request.history]
    response = query_agent(request.user_prompt, history)
    if "error" in response:
        raise HTTPException(status_code=500, detail="Error occurred while generating query")
    return {"response": response}


@app.get("/api/documents", response_model=List[DocumentInfo])
def list_documents():
    return [
        DocumentInfo(
            id=doc.id,
            filename=doc.filename,
            uploaded_at=doc.uploaded_at,
            chunk_count=doc.chunk_count,
        )
        for doc in document_store.list_documents()
    ]


@app.post("/api/documents", response_model=List[DocumentInfo])
async def upload_documents(files: List[UploadFile] = File(...)):
    uploaded = []

    for file in files:
        file_bytes = await file.read()

        try:
            text = extract_text(file.filename or "unnamed", file_bytes)
        except UnsupportedFileType as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        try:
            record = document_store.add_document(file.filename or "unnamed", text)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        uploaded.append(
            DocumentInfo(
                id=record.id,
                filename=record.filename,
                uploaded_at=record.uploaded_at,
                chunk_count=record.chunk_count,
            )
        )

    return uploaded


@app.delete("/api/documents/{doc_id}", response_model=DeleteResponse)
def delete_document(doc_id: str):
    deleted = document_store.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DeleteResponse(status="deleted", id=doc_id)


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        return run_chat(request.message, request.conversation_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))