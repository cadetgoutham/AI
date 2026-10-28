from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

def _has_multiple_statements(query: str) -> bool:
    quote = None
    terminated = False
    index = 0

    while index < len(query):
        character = query[index]

        if quote:
            if character == quote:
                if index + 1 < len(query) and query[index + 1] == quote:
                    index += 2
                    continue
                quote = None
        elif query.startswith("--", index):
            newline = query.find("\n", index + 2)
            index = len(query) if newline == -1 else newline
            continue
        elif query.startswith("/*", index):
            comment_end = query.find("*/", index + 2)
            index = len(query) if comment_end == -1 else comment_end + 2
            continue
        elif character in ("'", '"', "`"):
            quote = character
        elif character == ";":
            terminated = True
        elif terminated and not character.isspace():
            return True

        index += 1

    return False

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class SourceRef(BaseModel):
    filename: str
    doc_id: str
    snippet: str


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: List[SourceRef]


class DocumentInfo(BaseModel):
    id: str
    filename: str
    uploaded_at: str
    chunk_count: int


class DeleteResponse(BaseModel):
    status: str
    id: str
    
class GeneratedTestCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    test_name: str = Field(min_length=1)
    category: Literal["happy_path", "edge_case", "boundary", "error_handling"]
    test_code: str = Field(min_length=1)

    @field_validator("test_name", "test_code")
    @classmethod
    def strip_non_empty_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must not be empty")
        return value

    @field_validator("test_code")
    @classmethod
    def reject_markdown_fences(cls, value: str) -> str:
        if "```" in value:
            raise ValueError("Test code must not contain markdown fences")
        return value


class TestAgentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1)
    No_of_functions: str = Field(pattern=r"^\d+$")
    No_of_test_cases: str = Field(pattern=r"^\d+$")
    No_of_edge_cases: str = Field(pattern=r"^\d+$")
    No_of_boundary_cases: str = Field(pattern=r"^\d+$")
    No_of_error_handling_cases: str = Field(pattern=r"^\d+$")
    No_of_skipped_tests: str = Field(pattern=r"^\d+$")
    test_cases: list[GeneratedTestCase]

    @field_validator("summary")
    @classmethod
    def strip_non_empty_summary(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Summary must not be empty")
        return value

    @model_validator(mode="after")
    def match_test_case_count(self):
        if int(self.No_of_test_cases) != len(self.test_cases):
            raise ValueError("No_of_test_cases must match the test_cases array")
        return self
    
class GeneratedQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1)
    explanation: str = Field(min_length=1)

    @field_validator("query", "explanation")
    @classmethod
    def strip_non_empty_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must not be empty")
        return value

    @field_validator("query")
    @classmethod
    def require_single_plain_statement(cls, value: str) -> str:
        if "```" in value or _has_multiple_statements(value):
            raise ValueError("Query must contain one plain SQL statement")
        return value


class QueryAgentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    queries: list[GeneratedQuery] = Field(max_length=5)
    explanation: str | None = Field(default=None, min_length=1)

    @field_validator("explanation")
    @classmethod
    def strip_non_empty_explanation(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Explanation must not be empty")
        return value