import os

from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not configured")

GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# Retrieval tuning
CHUNK_SIZE = 800      # target characters per chunk
CHUNK_OVERLAP = 150   # characters of trailing context carried into the next chunk
TOP_K_CHUNKS = 5       # chunks retrieved per question, across ALL documents

MAX_HISTORY_MESSAGES = 20

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5175",
    "http://127.0.0.1:5175"
]