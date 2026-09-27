import shlex


ALLOWED_COMMANDS = {
    "pwd",
    "ls",
    "cat",
    "head",
    "tail",
    "grep",
    "find",
    "ps",
    "df",
    "du",
    "free",
    "uname",
    "whoami",
    "date",
    "uptime",
    "ss",
    "ip",
    "hostname",
    "ifconfig",
    "netstat",
    "which",
    "id",
    "wc",
    "sort",
    "uniq",
}


BLOCKED_COMMANDS = {
    "rm",
    "rmdir",
    "mkfs",
    "fdisk",
    "parted",
    "dd",
    "shutdown",
    "reboot",
    "poweroff",
    "halt",
    "kill",
    "pkill",
    "chmod",
    "chown",
    "useradd",
    "userdel",
    "usermod",
    "passwd",
    "mount",
    "umount",
    "iptables",
    "nft",
    "systemctl",
    "service",
    "sudo",
}


BLOCKED_OPERATORS = {
    ";",
    "&&",
    "||",
    "|",
    ">",
    ">>",
    "<",
    "<<",
    "&",
}


def validate_command(command: str):

    if not command:
        return False, "Command is empty"

    command = command.strip()

    for operator in BLOCKED_OPERATORS:

        if operator in command:

            return (
                False,
                f"Command operator '{operator}' is not allowed",
            )

    try:

        parts = shlex.split(command)

    except ValueError as exc:

        return (
            False,
            f"Invalid command syntax: {exc}",
        )

    if not parts:

        return False, "Command is empty"

    executable = parts[0]

    if executable in BLOCKED_COMMANDS:

        return (
            False,
            f"Command '{executable}' is blocked",
        )

    if executable not in ALLOWED_COMMANDS:

        return (
            False,
            f"Command '{executable}' is not in the allowlist",
        )

    return True, "Command is allowed"