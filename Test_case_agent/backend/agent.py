import json
from groq import Groq
from Models import TestAgentResponse, GeneratedTestCase, QueryAgentResponse
from config import GROQ_API_KEY, GROQ_MODEL
from Prompts import Prompts

client = Groq(api_key=GROQ_API_KEY)

def test_agent(USER_PROMPT: str, FRAMEWORK: str, MAX_TOKENS: int = 5000):
    try:
        # Generate a chat completion
        completion = client.chat.completions.create(
            model=GROQ_MODEL,  # Or "openai/gpt-oss-20b"
            messages=[
                {
                    "role": "system",
                    "content": Prompts["TEST_SYSTEM_PROMPT"],
                },
                {"role": "user", "content": f"Framework: {FRAMEWORK}\nContext: {USER_PROMPT}"},
            ],
            max_tokens=MAX_TOKENS,
            temperature=0.7,
        )

        # Print the response text
        print(completion.choices[0].message.content)
        # return completion.choices[0].message.content
        # print(completion.choices[0].message.reasoning)
        response = TestAgentResponse.model_validate(
            json.loads(completion.choices[0].message.content)
        )
        return response.model_dump()
    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": "error occurred"}
    
def query_agent(USER_PROMPT: str, HISTORY: list[dict] | None = None, MAX_TOKENS: int = 5000):
    try:
        # Generate a chat completion
        completion = client.chat.completions.create(
            model=GROQ_MODEL,  # Or "openai/gpt-oss-20b"
            messages=[
                {
                    "role": "system",
                    "content": Prompts["SQL_SYSTEM_PROMPT"],
                },
                *(HISTORY or []),
                {"role": "user", "content": f"Context: {USER_PROMPT}"},
            ],
            max_tokens=MAX_TOKENS,
            temperature=0.5,
        )

        # Print the response text
        print(completion.choices[0].message.content)
        response = QueryAgentResponse.model_validate(
            json.loads(completion.choices[0].message.content)
        )
        return response.model_dump()
    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": "error occurred"}
