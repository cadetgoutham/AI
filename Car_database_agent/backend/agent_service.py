import json
import re
import uuid
from typing import Dict, List

from groq import Groq

from config import GROQ_API_KEY, GROQ_MODEL, MAX_HISTORY_MESSAGES, MAX_TOOL_ROUNDS
from database import (
    db_add_car,
    db_delete_car,
    db_fetch_cars,
    db_filter_cars,
    db_search_cars_by_brand,
    db_update_car,
)


groq_client = Groq(api_key=GROQ_API_KEY)

conversations: Dict[str, List[dict]] = {}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "db_fetch_cars",
            "description": "Get the complete list of cars from the database.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "db_search_cars_by_brand",
            "description": "Find cars that match a given brand. Use this before updating or deleting a car when you only know its brand, to find its id first.",
            "parameters": {
                "type": "object",
                "properties": {"brand": {"type": "string", "description": "Brand to search for"}},
                "required": ["brand"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "db_filter_cars",
            "description": "Filter cars by the user's preferences, such as brand, model, exact year, or a year range. Use this for requests to show, find, or recommend cars matching preferences.",
            "parameters": {
                "type": "object",
                "properties": {
                    "brand": {"type": "string", "description": "Preferred brand"},
                    "model": {"type": "string", "description": "Preferred model"},
                    "year": {"type": "integer", "description": "Exact preferred year"},
                    "min_year": {"type": "integer", "description": "Minimum preferred year"},
                    "max_year": {"type": "integer", "description": "Maximum preferred year"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "db_add_car",
            "description": "Add a new car entry into the database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "brand": {"type": "string", "description": "Car manufacturer"},
                    "model": {"type": "string", "description": "Car model name"},
                    "year": {"type": "integer", "description": "Manufactured year"},
                },
                "required": ["brand", "model", "year"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "db_update_car",
            "description": "Change one or more fields of an existing car. The numeric id is required.",
            "parameters": {
                "type": "object",
                "properties": {
                    "car_id": {"type": "integer", "description": "Car id"},
                    "brand": {"type": "string", "description": "New brand"},
                    "model": {"type": "string", "description": "New model"},
                    "year": {"type": "integer", "description": "New year"},
                },
                "required": ["car_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "db_delete_car",
            "description": "Delete a car permanently. The numeric id is required.",
            "parameters": {
                "type": "object",
                "properties": {"car_id": {"type": "integer", "description": "Car id"}},
                "required": ["car_id"],
            },
        },
    },
]

READ_TOOLS = {"db_fetch_cars", "db_search_cars_by_brand", "db_filter_cars"}
WRITE_TOOL_FLAGS = {
    "db_add_car": "added",
    "db_update_car": "updated",
    "db_delete_car": "deleted",
}

SYSTEM_PROMPT = (
    "You are a database assistant for a car list. Use the available tools to answer "
    "requests, and you may use more than one tool in the same turn.\n\n"
    "Rules:\n"
    "- To update or delete a car, you need its numeric id. Look it up first if needed.\n"
    "- For preference-based requests, use db_filter_cars with every filter the user gave, such as brand, model, or year range.\n"
    "- If a lookup finds no match or multiple matches, ask one short clarifying question.\n"
    "- Clarifying questions must end with '?'. Completed actions must be one short sentence.\n"
    "- Never list every car field-by-field; the app already shows the car list."
)


def _extract_preference_filters(prompt: str) -> dict | None:
    """Extract simple read-only preferences before invoking tool calling."""
    normalized = prompt.strip()
    if not re.search(r"\b(show|find|list|filter|recommend|display)\b", normalized, re.I):
        return None
    if not re.search(r"\b(car|cars|vehicle|vehicles)\b", normalized, re.I):
        return None
    if re.search(r"\b(add|change|update|delete|remove|erase)\b", normalized, re.I):
        return None

    filters: dict[str, str | int] = {}
    brand_match = re.search(
        r"\b(?:show|find|list|filter|recommend|display)\s+(?:me\s+|my\s+|the\s+)?"
        r"([A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z][A-Za-z0-9-]*)?)\s+cars?\b",
        normalized,
        re.I,
    )
    if brand_match:
        candidate = brand_match.group(1).strip()
        if candidate.lower() not in {"all", "any", "available"}:
            filters["brand"] = candidate

    model_match = re.search(r"\bmodel\s+([A-Za-z0-9-]+)", normalized, re.I)
    if model_match:
        filters["model"] = model_match.group(1)

    between_match = re.search(r"(?:between|from)\s+(19\d{2}|20\d{2})\s+(?:and|to)\s+(19\d{2}|20\d{2})", normalized, re.I)
    if between_match:
        filters["min_year"] = int(between_match.group(1))
        filters["max_year"] = int(between_match.group(2))
    else:
        minimum_match = re.search(r"(?:from|after|since|newer than|at least)\s+(19\d{2}|20\d{2})", normalized, re.I)
        maximum_match = re.search(r"(?:before|until|older than|at most)\s+(19\d{2}|20\d{2})", normalized, re.I)
        if minimum_match:
            filters["min_year"] = int(minimum_match.group(1))
        if maximum_match:
            filters["max_year"] = int(maximum_match.group(1))

    exact_year_match = re.search(r"\b(?:year\s+)?(19\d{2}|20\d{2})\b", normalized)
    if exact_year_match and "min_year" not in filters and "max_year" not in filters:
        filters["year"] = int(exact_year_match.group(1))

    return filters


def run_preference_filter(prompt: str, conversation_id: str | None) -> dict | None:
    filters = _extract_preference_filters(prompt)
    if filters is None:
        return None

    result = db_filter_cars(**filters)
    if result.get("status") == "error":
        raise RuntimeError(result.get("message", "Unable to filter cars."))

    count = len(result.get("data", []))
    return {
        "response": f"Found {count} matching {'car' if count == 1 else 'cars'}.",
        "conversation_id": conversation_id or str(uuid.uuid4()),
        "needs_clarification": False,
        "added": False,
        "updated": False,
        "deleted": False,
        "viewed": True,
        "data": result.get("data", []),
    }


def trim_conversation(messages: list) -> list:
    if len(messages) <= MAX_HISTORY_MESSAGES:
        return messages
    return [messages[0]] + messages[-(MAX_HISTORY_MESSAGES - 1):]


def run_tool(func_name: str, args: dict) -> dict:
    if func_name == "db_fetch_cars":
        return db_fetch_cars()
    if func_name == "db_search_cars_by_brand":
        return db_search_cars_by_brand(args["brand"])
    if func_name == "db_filter_cars":
        return db_filter_cars(
            args.get("brand"),
            args.get("model"),
            int(args["year"]) if args.get("year") is not None else None,
            int(args["min_year"]) if args.get("min_year") is not None else None,
            int(args["max_year"]) if args.get("max_year") is not None else None,
        )
    if func_name == "db_add_car":
        return db_add_car(args["brand"], args["model"], int(args["year"]))
    if func_name == "db_update_car":
        return db_update_car(
            int(args["car_id"]),
            args.get("brand"),
            args.get("model"),
            int(args["year"]) if args.get("year") is not None else None,
        )
    if func_name == "db_delete_car":
        return db_delete_car(int(args["car_id"]))
    return {"status": "error", "message": f"Unknown tool '{func_name}'"}


def run_agent(prompt: str, conversation_id: str | None = None) -> dict:
    preference_result = run_preference_filter(prompt, conversation_id)
    if preference_result is not None:
        return preference_result

    if conversation_id and conversation_id in conversations:
        current_id = conversation_id
        messages = conversations[current_id]
    else:
        current_id = str(uuid.uuid4())
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    messages.append({"role": "user", "content": prompt})
    flags = {"added": False, "updated": False, "deleted": False, "viewed": False}
    final_text = ""
    last_read_data = None

    for _ in range(MAX_TOOL_ROUNDS):
        try:
            response = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                max_tokens=300,
            )
        except Exception:
            # Some models occasionally emit a malformed tool call
            # (Groq returns a 400 tool_use_failed in that case). Rather
            # than crashing the whole request with a raw 500, drop the
            # user turn that triggered it and ask them to rephrase.
            if messages and messages[-1].get("role") == "user":
                messages.pop()
            final_text = (
                "I had trouble understanding how to do that. "
                "Could you rephrase your request?"
            )
            conversations[current_id] = trim_conversation(messages)
            return {
                "response": final_text,
                "conversation_id": current_id,
                "needs_clarification": True,
                **flags,
                "data": None,
            }

        response_message = response.choices[0].message
        messages.append(response_message.model_dump(exclude_none=True))

        if not response_message.tool_calls:
            final_text = response_message.content or ""
            break

        for tool_call in response_message.tool_calls:
            func_name = tool_call.function.name
            args = json.loads(tool_call.function.arguments or "{}")
            result = run_tool(func_name, args)

            if func_name in READ_TOOLS:
                flags["viewed"] = True
                if result.get("status") == "success":
                    last_read_data = result.get("data", [])
            elif func_name in WRITE_TOOL_FLAGS and result.get("status") == "success":
                flags[WRITE_TOOL_FLAGS[func_name]] = True

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, default=str),
                }
            )
    else:
        final_text = "That took more steps than expected. Could you rephrase what you'd like to do?"

    conversations[current_id] = trim_conversation(messages)
    return {
        "response": final_text,
        "conversation_id": current_id,
        "needs_clarification": final_text.strip().endswith("?"),
        **flags,
        "data": last_read_data,
    }