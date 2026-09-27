# Linux Agent Frontend

This is the React + Vite frontend for the Linux AI Agent. It sends user prompts to the FastAPI backend, shows the generated command, and asks for confirmation before execution.

## Features

- AI-generated Linux command suggestions
- Safe validation against an allowlist
- Modal confirmation before executing commands
- Output panel for stdout, stderr, exit code, and history
- Monochrome black-and-white styling with subtle motion effects

## Requirements

- Node.js 18+
- npm
- The backend running on port 8000

## Run locally

From this folder:

```bash
npm install
npm run dev
```

The Vite app usually opens at:

- http://localhost:5173

If port 5173 is already in use, Vite will use the next available port.

## Backend connection

The frontend expects the API at:

- http://127.0.0.1:8000

The backend endpoints used by the app are:

- POST /agent
- POST /agent/execute

## Example workflow

1. Enter a task such as "show the current directory".
2. Review the generated command and safety status.
3. Click Execute command.
4. Confirm in the modal.
5. View the result and command history.

## Development checks

```bash
npm run build
npm run lint
```

## Troubleshooting

### API connection errors

Make sure the backend is running:

```bash
cd ../../backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn Main:app --reload --host 127.0.0.1 --port 8000
```

### CORS issues

Use a frontend origin allowed by the backend config, typically localhost or 127.0.0.1 on the Vite port.

### Empty output or no result

Check that the command is in the allowlist and that the backend returned a valid JSON response.

---

For setup and backend details, see the project setup guide in [../../SETUP.md](../../SETUP.md).
