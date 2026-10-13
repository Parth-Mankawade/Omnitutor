# Track D Study Companion — Project Context

IIT Mandi Multimodal AI Hackathon 2026, **Track D: Personalized Tutoring & Adaptive Learning**.
Team of 2. ~10 hours to deadline (deadline NOT yet confirmed — check Devpost).
Architecture is decided (v2 below). Do not redesign it; implement it in small, verified steps.

## Rules for working in this repo
- Build the smallest complete version of each required path. Do not add features from the cut list.
- Verify each stage (typecheck, run, hit the endpoint) before building on it. Never claim something works untested.
- No secrets in code; use `.env` (provide `.env.example`).
- Ask before large refactors or new dependencies not listed here.

## Track D requirements (summary of official PDF)
1. Multimodal KB: ingest lecture video, textbook, slide deck with no manual preprocessing; organize into topics/concepts/prerequisites; every unit linked to page / slide / timestamp; use info from figures/diagrams.
2. Grounding: answers cite excerpts that open exact page/slide/timestamp; decline or flag off-material queries; separate outside knowledge from source-backed content.
3. Assessment: MCQ, short answer, numerical on student-chosen scope; each tagged with topic, source, difficulty; verify correctness (answer verification or cross-model); no repeats; cited feedback; post-quiz report with weak topics + misconceptions.
4. Learner model: per-topic mastery updated after every quiz AND conversation (BKT ok); cold start via diagnostic quiz.
5. Evaluation: RAGAS/DeepEval-style faithfulness, answer relevancy, context precision/recall on team-built test set incl. off-material queries; simulated students across sessions reporting mastery gains + repetition rate.
6. Optional: course map, revision material, study schedule, Hindi/Hinglish, audio.

Judging: KB & Grounding 20, Assessment 15, Personalization 20, UX & Demo 15, System Eval 15, Tech 15.

## Submission (Devpost)
Project description; public GitHub repo with README (setup, prerequisites, run instructions); 3–10 min YouTube demo (unlisted ok, English); both teammates added with real full names. Live deployment NOT required.

## Stack
Next.js (App Router) + TypeScript + Tailwind · Postgres via Prisma (docker-compose runs DB only) · Gemini API (`@google/genai`) · Zod · JSZip (PPTX) · pdf-lib (page split) · Recharts.
Model IDs come from env (`LLM_MODEL_FAST`, `LLM_MODEL_STRONG`, `EMBED_MODEL`) — use the IDs listed in our AI Studio project; 2.5 models may be restricted for new projects.

## Repo layout (Turborepo + npm workspaces)
- `apps/web` (`@sc/web`): Next.js 16 pages + thin API routes. Started via `scripts/next.mjs`, which loads the root `.env`.
- `packages/core` (`@sc/core`): all domain logic (llm, ingest/, retrieve, tutor, quiz, bkt). No Next.js imports.
- `packages/db` (`@sc/db`): Prisma schema/client; `prisma.config.ts` loads the root `.env`.
- `packages/schemas` (`@sc/schemas`): shared Zod contract.
- `tools/` (smoke, eval, sim): added in their modules. `docs/`: ARCHITECTURE.md, PROGRESS.md (update PROGRESS after every module).
- One `.env` at the repo root. Gemini key var is `APP_GEMINI_API_KEY`, passed explicitly to the SDK; never use a machine-wide `GEMINI_API_KEY`.
- Postgres: docker-compose, host port 5434, user/pass/db `study`.
- Windows: `npm run db:generate` fails with EPERM while the dev server runs (DLL lock). Stop dev first.
- Next 16 has breaking changes. Read `node_modules/next/dist/docs/` before using unfamiliar APIs. Cache Components is on: dynamic route handlers call `await connection()`.

## Architecture v2
Single Next.js process run locally (NOT serverless). One Postgres. Originals stored in `data/uploads/`, served by `/api/files/[id]` with HTTP Range support.
No worker: `POST /api/sources` saves file, sets `Source.status=PROCESSING`, starts ingestion without awaiting, UI polls status.
`packages/core/src/llm.ts` is the only file that calls Gemini (Zod-validated JSON, 1 retry, typed errors).

### Ingestion
- PDF: pdf-lib splits into single pages → one Gemini call per page (concurrency 4) → `{blocks:[text|figure|table], conceptLabels}` → chunks; figures are their own chunks (description). Citation = `page`.
- PPTX: JSZip; slide order from `ppt/presentation.xml`; text from `<a:t>`; images via slide rels → `ppt/media`. Gemini batches of 5 slides (text + images). Citation = `slide`.
- Video (≤20 min mp4): Gemini Files API upload, wait ACTIVE, one call → segments `{tStart,tEnd,transcript,onScreen,conceptLabels}`. Citation = `tStart/tEnd`. (Gemini files expire in 48h; we keep originals.)
- Embeddings: 768-dim, stored as `Float[]` in Postgres; cosine similarity computed in JS (no pgvector).
- Build step `POST /api/build`: one LLM call → 5–8 topics with descriptions + prerequisite links; chunks tagged to nearest topic by embedding.

### Prisma models
Course, Source(type PDF|PPTX|VIDEO, path, status, error), Chunk(kind TEXT|FIGURE|SLIDE|TRANSCRIPT, content, page?, slide?, tStart?, tEnd?, embedding Float[], topicId?), Topic(name, description, prereqIds String[]), Question(topicId, type MCQ|SHORT|NUMERIC, difficulty 1-3, stem, options Json, answer Json, distractorMisconceptions Json, sourceChunkIds String[], verified, stemHash), Learner, Mastery(learnerId, topicId, p, n; unique), MasteryEvent(topicId, before, after, source QUIZ|CHAT), Assessment(kind DIAGNOSTIC|QUIZ|MOCK, scopeTopicIds, report Json), Attempt(questionId, response, correct, feedback Json, misconception?), ChatMessage(role, content, citations Json, coverage).

### Tutor (`POST /api/chat`)
Embed query → top 6 chunks by cosine → load learner mastery + weak prereqs → one structured call:
`{coverage: supported|partial|not_covered, blocks:[{text, origin: material|outside, citations[]}], learnerEvidence:[{topicId, signal}]}`.
Server: drop citations not in retrieved set; uncited material blocks → outside; refuse if top score < τ (`REFUSAL_TAU`, calibrated on off-material tests) OR not_covered; damped BKT update (30%) from learnerEvidence.
Citation panel: PDF iframe `#page=N` + excerpt text beside it; slide = reconstructed slide card; video `<video>` seek to tStart. All three must work in the demo.

### Quiz
Select topics weighted by (1−mastery), difficulty by mastery band (<0.4 easy, 0.4–0.7 med, >0.7 hard). Diagnostic = 1 question/topic; Mock = all topics, 10 questions.
1 batched generate call (MCQ distractors carry misconception labels; prompt includes seen stems; reject seen stemHash) → 1 batched blind-verify call (drop mismatches; numeric compared in code, 1% tolerance) → on submit: MCQ/numeric graded in code, short answers in 1 batched LLM call; cited feedback; BKT update per answer; report (per-topic score, mastery delta, misconceptions, revisit citations).

### Learner model
BKT per topic: prior 0.3, learn 0.15, slip 0.1, guess MCQ 0.25 / short 0.1 / numeric 0.05.

### Evaluation
Test set: 15 answerable (5 per modality incl. 2 diagram, 2 video) with known locations + 5 off-material.
`tools/eval/ragas.py` → `/api/eval/answer`; `tools/eval/score.ts` → citation accuracy + refusal precision/recall.
`tools/sim`: no LLM; ~30-question pool, 4 profiles with hidden mastery, 3 sessions, adaptive vs random → mastery gain, estimation error, repetition rate. Simulator uses different params than the model (state this caveat).

### Pages
/sources, /tutor, /quiz, /quiz/[id]/report, /dashboard (mastery bars + prereqs, weak topics with citations, history chart). Learner picker in header; no auth.

## CUT (do not build)
Worker/queue, Docker app image, LibreOffice, YouTube input, pgvector, hybrid search/RRF, excerpt highlighting, mathjs, question-bank pre-warm, embedding dedup, mastery decay, prerequisite propagation, auth, streaming, deployment.
P1 only after full loop works: React Flow course map, Hindi/Hinglish toggle.

## Demo dataset (suggested)
OS CPU scheduling: 1 NPTEL/OCW lecture (15–20 min), 1 textbook chapter (20–30 pages), 1 deck (~20 slides, .pptx). Numericals (waiting/turnaround time), Gantt-chart diagrams, clear prerequisites.

## Ownership
- Parth: packages/core (ingest, llm, retrieve, tutor, quiz, bkt), packages/db (Prisma schema), apps/web/app/api routes.
- Teammate: dataset, test set, tools/eval, tools/sim, UI pages (apps/web/app) against mocked JSON, README, demo script.
- Shared contract: `packages/schemas` (Zod) for Chunk, TutorAnswer, Quiz, Report — agree first.

## Status
- [ ] Confirm deadline on Devpost
- [x] Module 0: skeleton (Turborepo, Postgres, Prisma, /api/health) — see docs/PROGRESS.md
- [ ] Module 1: Gemini smoke test (single-page PDF, Files API video upload, one PPTX slide batch, embeddings) — next step, needs model IDs
- [ ] Everything else
