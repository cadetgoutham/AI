# Project1 Setup Manual

Project1 is a car manager with a React/Vite frontend and a FastAPI backend. It uses PostgreSQL for car data, Redis for response caching, and Groq for natural-language car actions and preference-based filtering.

## Requirements

- macOS or Linux
- Python 3.11+
- Node.js 18+
- npm
- PostgreSQL running on port 5432
- Redis running on port 6379
- A Groq API key

## 1. Prepare PostgreSQL

Create a PostgreSQL database and a `cars` table:

```sql
CREATE DATABASE postgres;

CREATE TABLE cars (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1886 AND 2100)
);
```

Use an existing database if one is already configured. The backend reads these values from `.env`:

```env
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
```

## 2. Start Redis

Redis must be available at `redis://localhost:6379`.

With Homebrew:

```bash
brew install redis
brew services start redis
```

Check it:

```bash
redis-cli ping
```

Expected response:

```text
PONG
```

## 3. Configure and install the backend

Create or update `project1/backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379
```

Do not commit `.env` or share API keys or database passwords.

Project1 uses the shared virtual environment at `python/venv` in this workspace. Activate it, or create a new one:

```bash
cd project1/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install fastapi "uvicorn[standard]" groq python-dotenv pydantic psycopg2-binary fastapi-cache2 redis
```

Start the backend on port 8001 when Linux Agent is already using port 8000:

```bash
uvicorn Main:app --reload --host 127.0.0.1 --port 8001
```

Health/API checks:

```bash
curl http://127.0.0.1:8001/api/fetch-cars
```

## 4. Configure and start the frontend

Create `project1/frontend/my-react-app/.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8001
```

Install and start Vite:

```bash
cd project1/frontend/my-react-app
npm install
npm run dev
```

Open the Vite URL shown in the terminal. If port `5173` is already occupied, Vite normally selects `5174`.

## 5. Use the application

- `/cars` loads the current PostgreSQL car list.
- `/add` adds a car through the manual form and asks for confirmation.
- `/prompt` accepts natural-language actions.
- Preference queries such as `Show my BMW cars` or `Find Ford cars between 2015 and 2024` use safe database filters.
- Add, update, and delete actions use the Groq agent and conversation context.

## Development checks

```bash
cd project1/frontend/my-react-app
npm run build
npm run lint
```

```bash
cd project1/backend
python3 -m py_compile Main.py config.py models.py database.py cache.py agent_service.py routers/cars.py routers/ai.py
```

## Troubleshooting

### The frontend shows `Can't reach the server`

Confirm that the backend is running on the same port as `VITE_API_URL`:

```bash
curl http://127.0.0.1:8001/api/fetch-cars
```

Restart Vite after changing `.env.local`; Vite reads environment variables at startup.

### The API returns a database connection error

Check that PostgreSQL is running and that `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` match the local database.

### Redis startup or cache errors

Start Redis and verify it responds with `PONG`:

```bash
redis-cli ping
```

### Groq `tool_use_failed`

Preference-only read requests are parsed locally before Groq tool calling. For add, update, or delete requests, check `GROQ_MODEL`, restart the backend, and submit a concise prompt.

### CORS errors

Use a frontend origin listed in `backend/config.py`. The current list includes localhost and loopback ports `5173`, `5174`, and `3000`.
