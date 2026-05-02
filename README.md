# Bookr

Bookr is a full-stack booking and appointment system built with the MERN-style stack: a React + Vite frontend under `/frontend` and a Node.js + Express + MongoDB backend under `/backend`.

## Repository layout

- **`frontend/`** — React (Vite), Tailwind CSS, TanStack Query, Zustand, Axios API layer in `src/services`
- **`backend/`** — Express API with Mongoose, JWT-ready dependencies, `/api/v1` routes prefix

## Phase 1 — Local setup

### Backend

1. Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI` (and optionally `PORT`, `CLIENT_URL`).
2. From `backend/`: `npm install` then `npm run dev`.
3. Health check: `GET http://localhost:5000/api/v1/health` (or your `PORT`) should return JSON with `success: true` and message `Bookr API is running`.

### Frontend

1. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` (default targets `http://localhost:5000/api/v1`).
2. From `frontend/`: `npm install` then `npm run dev`.
