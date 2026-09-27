import json
import platform

from groq import Groq

from config import GROQ_API_KEY, GROQ_MODEL
from tools import execute_tool, get_tools
from security import validate_command


client = Groq(api_key=GROQ_API_KEY)


# The host this process actually runs on. Used to stop the model from
# proposing a Linux-only command (e.g. 'ip addr') on a machine where
# it doesn't exist (e.g. macOS, which only has 'ifconfig').
HOST_OS = platform.system()
NETWORK_COMMAND_HINT = "ifconfig" if HOST_OS == "Darwin" else "ip addr"


SYSTEM_PROMPT = f"""
You are a Linux troubleshooting assistant.

You can use tools to inspect the local machine before answering.

This machine is running: {HOST_OS}.
The correct command for network interface information on THIS machine
is: `{NETWORK_COMMAND_HINT}`. Do not propose `ip` on a machine where the
OS is Darwin (macOS) -- it is not installed there.

TOOL RULES:
- For IP addresses or network interfaces, use get_network_info.
- For disk usage, use get_disk_usage.
- For running processes, use get_processes.
- For Linux OS/kernel information, use get_system_info.
- For anything else read-only, use execute_linux_command.
- Never invent tool results. Only rely on what tools actually return.
- IMPORTANT: If a tool call already succeeded, your final proposed
  "command" must be that exact same command (or an equivalent you have
  already verified works on this machine) -- never substitute a
  different command you haven't tested, even if it seems more standard.

SAFETY RULES:
1. Prefer read-only operations.
2. Never use sudo.
3. Never delete files.
4. Never modify permissions.
5. Never modify users.
6. Never reboot or shut down the system.
7. Never kill processes.
8. Never modify system configuration.
9. If the user asks for a dangerous operation, explain that it is blocked.

RESPONSE FORMAT:
Once you have enough information, respond with ONLY a JSON object
(no markdown fences, no commentary before or after it) with exactly
these fields:

- "command": the single Linux command that answers the user's request
  (empty string "" if no safe command applies)
- "explanation": a short, plain-English explanation of what the command
  does and/or what you found
- "risk": one of "low", "medium", "high"
- "reason": if the request is unsafe or no command applies, explain why;
  otherwise this can be an empty string

Do not wrap the JSON in code fences. Do not include any text outside
the JSON object in your final response.
"""

MAX_TOOL_ITERATIONS = 5


def _parse_final_json(content: str) -> dict:
    """Best-effort parse of the model's final JSON answer, tolerating
    markdown code fences that some models add despite instructions."""

    text = (content or "").strip()

    if text.startswith("```"):
        # Strip opening fence (optionally with a language tag like ```json)
        text = text.split("\n", 1)[1] if "\n" in text else ""
        # Strip closing fence
        if text.rstrip().endswith("```"):
            text = text.rstrip()[: -3]
        text = text.strip()

    return json.loads(text)


def run_agent(user_prompt: str):

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": user_prompt,
        },
    ]

    tools = get_tools()

    for _ in range(MAX_TOOL_ITERATIONS):

        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0,
                parallel_tool_calls=False,
            )
        except Exception as exc:
            return {
                "command": "",
                "explanation": "",
                "risk": "high",
                "allowed": False,
                "reason": f"Groq API request failed: {exc}",
            }

        message = response.choices[0].message

        # --------------------------------
        # No tool call -> final answer
        # --------------------------------

        if not message.tool_calls:

            try:
                result = _parse_final_json(message.content)
            except (json.JSONDecodeError, IndexError):
                return {
                    "command": "",
                    "explanation": message.content or "",
                    "risk": "high",
                    "allowed": False,
                    "reason": "The agent returned an invalid command response.",
                }

            command = result.get("command", "") or ""
            allowed, reason = validate_command(command)

            return {
                "command": command,
                "explanation": result.get("explanation", ""),
                "risk": result.get("risk", "high"),
                "allowed": allowed,
                "reason": reason if not allowed else result.get("reason"),
            }

        # --------------------------------
        # Add assistant tool-call message.
        # Must be a plain dict, not the raw
        # SDK object, or the next .create()
        # call will fail.
        # --------------------------------

        messages.append(
            message.model_dump(exclude_none=True)
        )

        # --------------------------------
        # Execute tools
        # --------------------------------

        for tool_call in message.tool_calls:

            tool_name = tool_call.function.name

            try:
                arguments = json.loads(
                    tool_call.function.arguments or "{}"
                )
            except json.JSONDecodeError:
                arguments = {}
                result = {
                    "error": "The model generated an invalid tool request."
                }
            else:
                result = execute_tool(
                    tool_name,
                    arguments,
                )

            print("TOOL:", tool_name)
            print("ARGS:", arguments)
            print("RESULT:", result)

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result),
                }
            )

    return {
        "command": "",
        "explanation": "",
        "risk": "high",
        "allowed": False,
        "reason": "Agent reached the maximum number of tool calls.",
    }