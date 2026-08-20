#!/usr/bin/env bash
# Starts the backend API, the event worker, and the frontend dev server as
# three plain local processes — no Docker. Requires:
#   - backend/.env already filled in with your Neon/Atlas/Upstash connection
#     strings (see backend/.env.example)
#   - backend/.venv created with `python3 -m venv backend/.venv` and
#     `pip install -r backend/requirements.txt` already run inside it
#   - frontend/node_modules already installed (`npm install` in frontend/)
#
# Ctrl+C stops all three. macOS/Linux only — on Windows, run the three
# commands in backend/README-equivalent sections manually in separate
# terminals (or use WSL and run this script there).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f backend/.env ]; then
  echo "backend/.env not found. Copy backend/.env.example to backend/.env and fill in your"
  echo "Neon/Atlas/Upstash connection strings first."
  exit 1
fi

if [ ! -d backend/.venv ]; then
  echo "backend/.venv not found. Run:"
  echo "  cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

if [ ! -d frontend/node_modules ]; then
  echo "frontend/node_modules not found. Run: cd frontend && npm install"
  exit 1
fi

cleanup() {
  echo ""
  echo "Stopping..."
  kill "${BACKEND_PID:-}" "${WORKER_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting backend on :8000 ..."
(cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!

echo "Starting event worker ..."
(cd backend && source .venv/bin/activate && python -m app.workers.event_worker) &
WORKER_PID=$!

echo "Starting frontend on :5173 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

wait
