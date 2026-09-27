from typing import Optional

from pydantic import BaseModel, Field


class Car(BaseModel):
    brand: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    year: int = Field(ge=1886, le=2100)


class PromptRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=500)
    conversation_id: Optional[str] = None
