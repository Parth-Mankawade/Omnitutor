# Study Companion

Multimodal tutoring and adaptive learning (IIT Mandi Multimodal AI Hackathon 2026, Track D). It ingests a lecture video, a textbook PDF and a slide deck, then provides grounded tutor chat with page/slide/timestamp citations, verified adaptive quizzes, and a per-topic learner model.

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Progress and test results: [docs/PROGRESS.md](docs/PROGRESS.md)

## Prerequisites
- Node.js ≥ 20.12 (developed on 24)
- Docker Desktop (runs Postgres only)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Setup

```bash
npm install
cp .env.example .env     # fill APP_GEMINI_API_KEY and the three model IDs
npm run db:up            # Postgres on localhost:5434
npm run dev              # http://localhost:3000
```

Check that it's running: `GET http://localhost:3000/api/health` should return `{"ok": true, ...}`.

## Repo layout

| Path | Package | Contents |
|---|---|---|
| `apps/web` | `@sc/web` | Next.js UI and API routes |
| `packages/core` | `@sc/core` | Ingestion, LLM, retrieval, tutor, quiz, BKT |
| `packages/db` | `@sc/db` | Prisma schema and client |
| `packages/schemas` | `@sc/schemas` | Shared Zod contract |
| `docs/` | | Architecture and progress |
