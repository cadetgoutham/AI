# Linux Agent Setup Manual

Linux Agent is a React/Vite frontend with a FastAPI backend. The backend asks Groq to generate safe Linux commands, validates them against an allowlist, and executes approved commands locally.

## Requirements

- macOS or Linux
- Python 3.11+
- Node.js 18+
- npm
- A Groq API key

## 1. Configure the backend

Open a terminal in `linux_agent/backend` and create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

Do not commit `.env` or share the API key.

Create and activate a virtual environment:

```bash
cd linux_agent/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Start the API on port 8000:

```bash
uvicorn Main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/
```

Expected response:

```json
{"status":"ok","service":"Linux AI Agent"}
```

## 2. Start the frontend

Open a second terminal:

```bash
cd linux_agent/frontend/Linux_agent
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

The frontend sends requests to:

- `POST /agent` to generate a command
- `POST /agent/execute` to execute an approved command

## 3. Use the application

1. Describe a read-only Linux task, such as `show the current directory`.
2. Review the generated command, risk, and allowlist status.
3. Select Execute command.
4. Confirm the command in the modal.
5. Review stdout, stderr, exit code, and history.

The security layer blocks destructive commands, shell operators, and commands outside the allowlist. Command execution uses `shell=False` and has a 30-second timeout.

## Development checks

```bash
cd linux_agent/frontend/Linux_agent
npm run build
npm run lint
```

```bash
cd linux_agent/backend
python -m py_compile Main.py agent.py config.py executor.py models.py security.py tools.py
```

## Troubleshooting

### Port 8000 is already in use

Find the process:

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
```

Stop it if appropriate, or start the backend on another port and update the URLs in `src/App.tsx`.

### `ModuleNotFoundError: fastapi`

Use the virtual environment interpreter:

```bash
cd linux_agent/backend
source .venv/bin/activate
python -m pip install -r requirements.txt
```

### Groq configuration error

Confirm that `GROQ_API_KEY` and `GROQ_MODEL` are present in `backend/.env`, then restart Uvicorn.

### Browser CORS error

Open the frontend from a port listed in the backend CORS configuration in `Main.py`, normally `5173` or `3000`.
