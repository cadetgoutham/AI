# Test Case Agent

Test Case Agent is a small AI-assisted development toolkit with separate interfaces for generating JavaScript/TypeScript tests and SQL queries, plus a FastAPI backend containing document-grounded chat endpoints.

## Features

- Generate Jest, Cypress, or Playwright test cases from source code.
- Generate SQL queries from a request, with optional schema and SQL-dialect context.
- Upload PDF, DOCX, TXT, and Markdown documents for retrieval-assisted chat.
- View and delete uploaded documents through the API.

## Project Layout

```text
Test_case_agent/
  backend/       FastAPI application and AI/document services
  Test_generator/ React + Vite test-generation interface
  Sql_Generate/   React + Vite SQL-generation interface
```

## Requirements

- Python 3.10 or later
- Node.js and npm
- A Groq API key

## Configure and Run the Backend

In a terminal, move to `backend` and install the dependencies:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install fastapi uvicorn python-dotenv groq pydantic pypdf python-docx scikit-learn python-multipart
```

Create a `backend/.env` file containing your Groq API key. The model setting is optional; the default is `openai/gpt-oss-120b`.

```dotenv
GROQ_API_KEY=your_groq_api_key
# GROQ_MODEL=openai/gpt-oss-120b
```

Start the API from the `backend` directory:

```bash
uvicorn Main:app --reload
```

The API is available at `http://127.0.0.1:8000`. FastAPI's interactive documentation is at `http://127.0.0.1:8000/docs`.

## Run a Frontend

Run the frontend you want to use in its own terminal. Install dependencies the first time with `npm install`.

Test generation:

```bash
cd Test_generator
npm install
npm run dev
```

SQL generation:

```bash
cd Sql_Generate
npm install
npm run dev
```

Vite prints the local URL when the development server starts. Both frontends currently send API requests to `http://127.0.0.1:8000`.

## Active Backend API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Health check |
| `GET` | `/api/documents` | List uploaded documents |
| `POST` | `/api/documents` | Upload one or more files using multipart form field `files` |
| `DELETE` | `/api/documents/{doc_id}` | Delete an uploaded document |
| `POST` | `/api/chat` | Ask a question grounded in uploaded documents |

For chat, send JSON with a required `message` and an optional `conversation_id`:

```json
{
  "message": "Summarize the main risks in the report.",
  "conversation_id": null
}
```

The response includes the assistant's `response`, a `conversation_id` for follow-up questions, and matching `sources`. Conversations and uploaded documents are kept in process memory and are cleared when the backend restarts.

## Current Integration Note

The test and SQL frontends call `/generate-test` and `/generate-query`, respectively. Those route handlers appear earlier in `backend/Main.py`, but the module later replaces the FastAPI `app` instance. As a result, the active app currently does not register either generator route, and those frontend requests will fail until the app definitions are consolidated.