# GoalMind 🧠⚡

> A multi-agent autonomous reasoning system that analyzes any goal or business idea using specialized AI agents.

[![Backend](https://img.shields.io/badge/backend-FastAPI-009688?style=flat-square)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB?style=flat-square)](https://vitejs.dev/)

## What it does

GoalMind decomposes a user-defined goal into specialized tasks, runs a pipeline of AI agents (competitor analysis, news trends, financial sizing, regulatory review, fact-checking, and devil's advocate), then synthesizes a structured report with SWOT analysis, confidence scores, and citations.

## Architecture

```
GOALMAIN/
├── backend/        # FastAPI + multi-agent orchestration (Python 3.13)
│   ├── main.py         # API routes + SSE streaming
│   ├── orchestrator.py # Agent pipeline controller
│   ├── llm.py          # LLM clients (NVIDIA NIM / Gemini)
│   ├── agents/         # Specialist agent implementations
│   ├── tools/          # Web search, fact-check, financial tools
│   ├── clarity/        # Goal clarity scorer
│   └── feedback/       # Confidence + SWOT scoring
└── frontend/       # Vite + React + TailwindCSS v4
    └── src/
        ├── App.jsx         # Main application
        ├── components/     # UI components (DAG, AgentTrace, SWOT, etc.)
        └── utils/api.js    # Backend API client
```

## Running Locally

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your API keys
python main.py         # runs on http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
# Create a .env.local file:
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev            # runs on http://localhost:5173
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `NVIDIA_API_KEY` | NVIDIA NIM API key for LLaMA models |
| `GEMINI_API_KEY` | Google Gemini API key (fallback LLM) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (default: `http://localhost:8000`) |

## Deployment

- **Backend**: [Render](https://render.com) — uses the included `Procfile`
- **Frontend**: [Vercel](https://vercel.com) — set `VITE_API_URL` to your Render backend URL

## License

MIT
