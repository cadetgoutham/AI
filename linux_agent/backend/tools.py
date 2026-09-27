import platform

from executor import execute_command


def get_system_info():

    result = execute_command(
        "uname -a"
    )

    return result


def get_disk_usage():

    result = execute_command(
        "df -h"
    )

    return result


def get_processes():

    result = execute_command(
        "ps aux"
    )

    return result


def get_network_info():

    # 'ip' is Linux-only (iproute2); macOS/BSD only has 'ifconfig'.
    # Pick the right command for the OS this process is actually
    # running on, so the tool works in both dev (macOS) and
    # prod (Linux) environments.
    if platform.system() == "Darwin":
        command = "ifconfig"
    else:
        command = "ip addr"

    result = execute_command(
        command
    )

    return result


def execute_linux_command(
    command: str
):

    return execute_command(
        command
    )


def get_tools():
    return [
        {
            "type": "function",
            "function": {
                "name": "get_network_info",
                "description": (
                    "Get the IP addresses and network interface information "
                    "from the local Linux machine. Use this tool when the "
                    "user asks for their IP address or network interfaces."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_system_info",
                "description": "Get Linux operating system and kernel information.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_disk_usage",
                "description": "Get disk usage for mounted Linux filesystems.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_processes",
                "description": "Get currently running Linux processes.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "execute_linux_command",
                "description": (
                    "Execute one safe, read-only Linux command. "
                    "Only commands allowed by the application's security "
                    "validator can be executed."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": {
                            "type": "string",
                            "description": "A single Linux command.",
                        }
                    },
                    "required": ["command"],
                    "additionalProperties": False,
                },
            },
        },
    ]


def execute_tool(
    tool_name: str,
    arguments: dict
):

    if tool_name == "get_system_info":

        return get_system_info()

    if tool_name == "get_disk_usage":

        return get_disk_usage()

    if tool_name == "get_processes":

        return get_processes()

    if tool_name == "get_network_info":

        return get_network_info()

    if tool_name == "execute_linux_command":

        return execute_linux_command(
            arguments["command"]
        )

    return {
        "error": f"Unknown tool: {tool_name}"
    }