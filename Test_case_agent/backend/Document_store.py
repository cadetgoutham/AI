import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock
from typing import Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from config import CHUNK_OVERLAP, CHUNK_SIZE, TOP_K_CHUNKS


@dataclass
class DocumentRecord:
    id: str
    filename: str
    uploaded_at: str
    chunk_count: int


@dataclass
class Chunk:
    doc_id: str
    filename: str
    chunk_index: int
    text: str


def _split_into_chunks(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Split on paragraph boundaries, then pack paragraphs into chunks of
    roughly `chunk_size` characters, carrying `overlap` characters of the
    previous chunk's tail into the next one for context continuity."""

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not paragraphs:
        return []

    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        if current and len(current) + len(paragraph) + 1 > chunk_size:
            chunks.append(current)
            current = (current[-overlap:] + "\n" + paragraph).strip()
        else:
            current = f"{current}\n{paragraph}".strip() if current else paragraph

    if current:
        chunks.append(current)

    return chunks


class DocumentStore:
    """In-memory store of documents and their chunks, with a TF-IDF index
    used to retrieve the most relevant chunks for a question across ALL
    uploaded documents.

    This resets when the process restarts. For persistence across
    restarts or larger corpora, swap this for a real vector database
    (e.g. pgvector, Chroma, Qdrant) behind the same add/search/delete
    interface -- nothing else in the app needs to change.
    """

    def __init__(self):
        self._lock = Lock()
        self._documents: dict[str, DocumentRecord] = {}
        self._chunks: list[Chunk] = []
        self._vectorizer: Optional[TfidfVectorizer] = None
        self._matrix = None

    def add_document(self, filename: str, text: str) -> DocumentRecord:
        pieces = _split_into_chunks(text, CHUNK_SIZE, CHUNK_OVERLAP)
        if not pieces:
            raise ValueError(f"No extractable text found in '{filename}'.")

        doc_id = str(uuid.uuid4())

        with self._lock:
            for index, piece in enumerate(pieces):
                self._chunks.append(
                    Chunk(doc_id=doc_id, filename=filename, chunk_index=index, text=piece)
                )

            record = DocumentRecord(
                id=doc_id,
                filename=filename,
                uploaded_at=datetime.now(timezone.utc).isoformat(),
                chunk_count=len(pieces),
            )
            self._documents[doc_id] = record
            self._rebuild_index_locked()

        return record

    def delete_document(self, doc_id: str) -> bool:
        with self._lock:
            if doc_id not in self._documents:
                return False
            del self._documents[doc_id]
            self._chunks = [c for c in self._chunks if c.doc_id != doc_id]
            self._rebuild_index_locked()
        return True

    def list_documents(self) -> list[DocumentRecord]:
        with self._lock:
            return sorted(self._documents.values(), key=lambda d: d.uploaded_at, reverse=True)

    def _rebuild_index_locked(self):
        if not self._chunks:
            self._vectorizer = None
            self._matrix = None
            return

        self._vectorizer = TfidfVectorizer(stop_words="english")
        self._matrix = self._vectorizer.fit_transform(c.text for c in self._chunks)

    def search(self, query: str, top_k: int = TOP_K_CHUNKS) -> list[Chunk]:
        with self._lock:
            if not self._chunks or self._vectorizer is None:
                return []

            query_vector = self._vectorizer.transform([query])
            scores = cosine_similarity(query_vector, self._matrix)[0]
            ranked = sorted(range(len(self._chunks)), key=lambda i: scores[i], reverse=True)

            return [self._chunks[i] for i in ranked[:top_k] if scores[i] > 0]


# Single shared instance used across the app
document_store = DocumentStore()