import os

from dotenv import load_dotenv


load_dotenv()


GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_MODEL = os.getenv("GROQ_MODEL")


if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is not configured"
    )


if not GROQ_MODEL:
    raise RuntimeError(
        "GROQ_MODEL is not configured"
    )