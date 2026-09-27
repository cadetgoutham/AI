# Project1 Frontend

This is the Vite + React frontend for the car management application. It connects to the FastAPI backend to list cars, add new records, and use natural-language prompts to search and modify inventory.

## Features

- Car listing from PostgreSQL
- Add car form with confirmation modal
- AI prompt box for natural-language requests
- Preference-aware filtering such as brand, year range, and model queries
- Monochrome UI with soft animation and modal interaction

## Requirements

- Node.js 18+
- npm
- FastAPI backend running on port 8001
- Redis running locally
- PostgreSQL database available

## Run locally

From this folder:

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually one of:

- http://localhost:5173
- http://localhost:5174

## Environment config

Create a `.env.local` file in this folder if needed:

```env
VITE_API_URL=http://127.0.0.1:8001
```

This app calls the backend at `http://127.0.0.1:8001` for API access.

## Main app flow

- View the database list from the main home screen
- Add a vehicle with the form and confirm before saving
- Use the AI prompt area for requests such as:
  - "Show my BMW cars"
  - "Find Ford cars from 2015 to 2024"
  - "Add a 2022 Ferrari F8 Tributo"

## Development checks

```bash
npm run build
npm run lint
```

## Troubleshooting

### The page loads but data does not appear

Check that the backend is running and that the frontend env value matches the backend port:

```bash
curl http://127.0.0.1:8001/api/fetch-cars
```

### CORS errors

Ensure the app is served from a URL allowed by the backend CORS configuration, such as localhost or 127.0.0.1 with Vite ports 5173/5174.

### Database or Redis issues

Start Redis and verify PostgreSQL is reachable before testing the data flows.

---

For backend setup, database config, and API details, see the project guide in [../../SETUP.md](../../SETUP.md).
