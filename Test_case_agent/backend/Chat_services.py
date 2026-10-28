import uuid
from typing import Dict, List, Optional
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL, MAX_HISTORY_MESSAGES, TOP_K_CHUNKS
from Document_store import Chunk, document_store
from Prompts import Prompts

groq_client = Groq(api_key=GROQ_API_KEY)

# In-memory per-conversation history, keyed by conversation_id.
conversations: Dict[str, List[dict]] = {}


def _format_context(chunks: List[Chunk]) -> str:
    if not chunks:
        return "No relevant document excerpts were found for this question."

    blocks = [
        f"[Source: {chunk.filename}, section {chunk.chunk_index + 1}]\n{chunk.text}"
        for chunk in chunks
    ]
    return "\n\n---\n\n".join(blocks)


def trim_conversation(messages: list) -> list:
    if len(messages) <= MAX_HISTORY_MESSAGES:
        return messages
    return [messages[0]] + messages[-(MAX_HISTORY_MESSAGES - 1):]


def run_chat(message: str, conversation_id: Optional[str] = None) -> dict:
    if conversation_id and conversation_id in conversations:
        current_id = conversation_id
        messages = conversations[current_id]
    else:
        current_id = str(uuid.uuid4())
        messages = [{"role": "system", "content": Prompts["Doc_SYSTEM_PROMPT"]}]

    relevant_chunks = document_store.search(message, top_k=TOP_K_CHUNKS)
    context = _format_context(relevant_chunks)

    # The retrieved context is injected into this turn only, not stored
    # verbatim on every future turn, to keep the conversation from
    # growing unbounded as more questions are asked.
    user_turn = f"Document excerpts:\n\n{context}\n\nQuestion: {message}"
    messages.append({"role": "user", "content": user_turn})

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=600,
        )
    except Exception as exc:
        messages.pop()
        return {
            "response": f"Something went wrong answering that: {exc}",
            "conversation_id": current_id,
            "sources": [],
        }

    answer = response.choices[0].message.content or ""
    messages.append({"role": "assistant", "content": answer})
    conversations[current_id] = trim_conversation(messages)

    sources = [
        {
            "filename": chunk.filename,
            "doc_id": chunk.doc_id,
            "snippet": chunk.text[:220] + ("…" if len(chunk.text) > 220 else ""),
        }
        for chunk in relevant_chunks
    ]

    return {
        "response": answer,
        "conversation_id": current_id,
        "sources": sources,
    }