import os

from dotenv import load_dotenv

load_dotenv()

CARS_CACHE_NAMESPACE = "cars"
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
MAX_TOOL_ROUNDS = 5
MAX_HISTORY_MESSAGES = 20

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing from environment variables or .env file.")

DB_PARAMS = {
    "dbname": os.getenv("DB_NAME", "postgres"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
}

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
]

REDIS_URL = "redis://localhost:6379"