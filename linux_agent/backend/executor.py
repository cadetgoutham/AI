import os
import shlex
import subprocess

from security import validate_command


COMMAND_TIMEOUT = 30


def execute_command(command: str):

    allowed, reason = validate_command(
        command
    )

    if not allowed:

        return {
            "command": command,
            "return_code": -1,
            "stdout": "",
            "stderr": reason,
            "success": False,
        }

    try:

        args = shlex.split(command)

        # shell=False means there's no shell to expand '~' or $VARS,
        # so a command like 'ls -la ~' would otherwise pass the
        # literal string '~' as a filename. Expand it ourselves.
        args = [
            os.path.expandvars(os.path.expanduser(arg))
            for arg in args
        ]

        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT,
            shell=False,
        )

        return {
            "command": command,
            "return_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "success": result.returncode == 0,
        }

    except subprocess.TimeoutExpired:

        return {
            "command": command,
            "return_code": -1,
            "stdout": "",
            "stderr": "Command timed out",
            "success": False,
        }

    except Exception as exc:

        return {
            "command": command,
            "return_code": -1,
            "stdout": "",
            "stderr": str(exc),
            "success": False,
        }