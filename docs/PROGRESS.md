# Progress Tracker

Updated: **2026-10-14** · Deadline: **NOT CONFIRMED (check Devpost)**
Rule: one module at a time → test → user review → next. A module is ✅ only after its tests pass.

Legend: ✅ done & verified · 🟡 in progress / awaiting review · ⬜ not started · ❌ blocked

---

## 1. Module status

| # | Module | Status | Verified by |
|---|---|---|---|
| 0 | Skeleton: Turborepo (web/core/db/schemas) + Postgres + Prisma + `/api/health` | ✅ | §4 log |
| 1 | Gemini wrapper (`packages/core/src/llm.ts`) + smoke test (`tools/smoke`) | ✅ (video check deferred: no sample mp4) | §4 log |
| 2 | Prisma schema (11 tables) + migration `init` + seed + `db:verify` | ✅ | §4 log |
| 3 | `@sc/schemas` contract (14 endpoints) + mocks + 53 contract tests + teammate brief | 🟡 awaiting review | §4 log |
| 4 | Upload + `/api/files/[id]` (Range) | ⬜ | — |
| 5 | PDF ingestion (text + figures, page cite) | ⬜ | — |
| 6 | PPTX ingestion (slide cite) | ⬜ | — |
| 7 | Video ingestion (timestamp cite) | ⬜ | — |
| 8 | Embeddings + retrieval | ⬜ | — |
| 9 | Course build (topics + prereqs) | ⬜ | — |
| 10 | Tutor + grounding guards + citation panel | ⬜ | — |
| 11 | BKT learner model | ⬜ | — |
| 12 | Quiz generate + verify + no-repeat | ⬜ | — |
| 13 | Grading + post-quiz report | ⬜ | — |
| 14 | Dashboard | ⬜ | — |
| 15 | Eval (RAGAS) + simulator | ⬜ | — |
| 16 | README, demo video, Devpost | ⬜ | — |

## 2. Track D requirement coverage

| Requirement | Pts | Status |
|---|---|---|
| Multimodal KB (video/PDF/PPTX, topics, prereqs, locators, figures) | 20 | ⬜ |
| Grounding (cited excerpts, refusals, outside-knowledge labels) | (in 20) | ⬜ |
| Assessment (MCQ/short/numeric, tagged, verified, no repeats, report) | 15 | ⬜ |
| Learner model (BKT after quiz + chat, diagnostic cold start) | 20 | ⬜ |
| Evaluation (RAGAS metrics, simulated students) | 15 | ⬜ |
| UX & demo | 15 | ⬜ |

## 3. Health

| Check | Status | Last checked |
|---|---|---|
| Postgres (docker `study-companion-db`, :5434) | ✅ `SELECT 1` 1–17 ms | 2026-10-13 |
| Env: DATABASE_URL, REFUSAL_TAU | ✅ present | 2026-10-13 |
| Env: APP_GEMINI_API_KEY (from `.env` only) | ✅ present | 2026-10-13 |
| Env: LLM_MODEL_FAST / LLM_MODEL_STRONG = `gemini-3.1-flash-lite`, EMBED_MODEL = `gemini-embedding-001` | ✅ present | 2026-10-14 |
| Gemini API reachable (`/api/health?gemini=1`, metadata only, 0 tokens) | ✅ all 3 models ok | 2026-10-14 |
| Gemini smoke (`npm run smoke`) | ✅ 4/4 run checks pass, video skipped | 2026-10-14 |
| Typecheck (5 workspaces) / lint | ✅ clean | 2026-10-14 |
| Prisma CLI → DB (reads root `.env`) | ✅ connects to localhost:5434 | 2026-10-13 |
| Migrations (`npm run db:status`) | ✅ `init` applied, schema up to date | 2026-10-14 |
| Schema checks (`npm run db:verify`) | ✅ 12/12 | 2026-10-14 |
| Contract tests (`npm run test`) | ✅ 53/53 | 2026-10-14 |

Live check: `GET http://localhost:3000/api/health` (Postman or curl). Add `?gemini=1` to also check the key and models (no tokens used).
DB GUI: PostgreSQL · `localhost:5434` · user `study` · password `study` · db `study`

## 4. Test log

### Module 0 — 2026-10-13
| Test | Result |
|---|---|
| `npm run typecheck` (next typegen + tsc) | ✅ 0 errors |
| `npm run lint` | ✅ 0 problems |
| `npm run db:up` → container healthy | ✅ |
| `GET /api/health`, DB up | ✅ HTTP 200, `db.ok: true` |
| `GET /api/health`, DB stopped | ✅ HTTP 503, `"Server has closed the connection."` |
| `GET /api/health` after DB restart (recovery without app restart) | ✅ HTTP 200 |

### Module 0b — Turborepo restructure — 2026-10-13
| Test | Result |
|---|---|
| `npm install` (4 workspaces linked: @sc/web, @sc/core, @sc/db, @sc/schemas) | ✅ |
| `npm run db:up` on port 5434 | ✅ healthy |
| `npm run db:status` (Prisma CLI loads root `.env`) | ✅ connects to localhost:5434. Non-zero exit is expected: no migrations until Module 2 |
| `npm run typecheck` (turbo, 4 packages) | ✅ 0 errors |
| `npm run lint` | ✅ 0 problems |
| `npm run dev` (turbo) → `GET /` | ✅ HTTP 200 |
| `GET /api/health`, DB up / stopped / restarted | ✅ 200 / 503 / 200 |
| Env reaches route handlers from root `.env` | ✅ after fix (see issues) |

### Module 1 — Gemini wrapper + smoke test — 2026-10-14
Models: fast = strong = `gemini-3.1-flash-lite`, embed = `gemini-embedding-001` (768-dim).

| Check | Result | Time | Tokens in/out | What it proves |
|---|---|---|---|---|
| `json` | ✅ avg waiting = 17 (expected 17) | 9.1 s | 45 / 64 | Zod-schema JSON output + numeric reasoning |
| `pdf` | ✅ 3 blocks, figure described with P1/24 values, 4 concepts | 9.2 s | 578 / 318 | 1-page PDF input; diagrams extracted as figure blocks |
| `slides` | ✅ slide 1: 3 bars [red, green, blue]; slide 2: 2 bars [yellow, purple] | 8.3 s | 2214 / 137 | Batched text + image per slide, correct slide numbering |
| `video` | ⏭ skipped (no `tools/smoke/fixtures/sample.mp4`) | — | — | Files API upload → ACTIVE → timestamped segments |
| `embed` | ✅ dim 768; cosine RR=0.806 > FCFS=0.642 > bread=0.483 | 0.7 s | — | Embeddings + retrieval ranks the right doc first |
| `GET /api/health?gemini=1` | ✅ HTTP 200, all 3 models reachable | — | 0 | Key + model IDs valid from the web app |
| typecheck / lint | ✅ 5/5 packages, 0 problems | — | — | |

Total smoke cost: **~2.8k input / 0.5k output tokens**. Run one check: `npm run smoke -- pdf`.

### Module 2 — Database schema — 2026-10-14
Migration `init`: 11 tables, 9 enums, 18 foreign keys, 12 indexes. Seed: course `demo-course`, learner `demo-learner` (fixed ids for Postman).

| Check (`npm run db:verify`) | Result | Why it matters (module) |
|---|---|---|
| Source defaults (PENDING, progress 0/0) | ✅ | Upload + status polling (4) |
| Embedding 768 round-trip | ✅ max err 5.6e-17 | Retrieval (8). Exact bit equality fails: Prisma sends ~16 significant digits. Irrelevant, since Gemini vectors are float32 (~1e-7) |
| PDF locator (page) + concept labels | ✅ | Citations (5, 10), course build (9) |
| Video tStart/tEnd as float seconds | ✅ | Video seek (7, 10) |
| Mastery defaults p=0.3, n=0 | ✅ | BKT prior (11) |
| Mastery unique (learner, topic) | ✅ P2002 on duplicate | One mastery value per topic (11) |
| Question JSON round-trip (options/answer/misconceptions) | ✅ | Quiz generation + grading (12, 13) |
| Attempt unique (assessment, question) | ✅ P2002 on duplicate | No double submissions (13) |
| Mastery history linked to attempt + chat message | ✅ | "Updated after every quiz AND conversation" evidence (11, 14) |
| Seen-stems query per learner | ✅ | No-repeat rule (12) |
| Topic delete → chunks untagged, mastery/questions removed | ✅ | Course rebuild (9) |
| Course delete cascades, no leftovers | ✅ | Clean resets |
| Seed run twice (idempotent) | ✅ same ids | |
| `/api/health` after schema change | ✅ HTTP 200 | |
| typecheck / lint | ✅ 5/5, 0 problems | |

### Module 3 — Shared contract `@sc/schemas` — 2026-10-14
Files: `common`, `citation`, `course`, `tutor`, `quiz`, `mastery`, `eval`, `endpoints` (registry of 14 JSON endpoints), `mocks` (one per endpoint + 4 extra UI states).

| Test group (`npm run test`, node:test via tsx) | Tests | Result |
|---|---|---|
| Every endpoint mock validates against its response schema; no missing/extra mocks; extra UI states valid | 16 | ✅ |
| Valid requests parse; invalid ones rejected (QUIZ without topics, blank message, duplicate answers, malformed response) | 5 | ✅ |
| Citations: exactly one locator per type, tEnd ≥ tStart, positive page, non-empty excerpt | 5 | ✅ |
| Grounding: material ⇒ ≥ 1 citation; outside ⇒ none; refused ⇒ no material; NOT_COVERED ⇒ refused | 6 | ✅ |
| Quiz safety: client question strips answer/explanation/misconceptions/verifier data; MCQ ≥ 2 options; difficulty 1–3 | 3 | ✅ |
| Mastery bands (0.4 / 0.7 boundaries) + band/p consistency | 2 | ✅ |
| Helpers: formatTime, formatLocator, citationHref | 3 | ✅ |
| Eval test-set schema + composition gaps | 4 | ✅ |
| Zod enums == Prisma enums (9) | 9 | ✅ |
| **Total** | **53** | **✅ 53/53** |

Other checks: all 14 mocks validate inside the Next.js app via `@sc/schemas` + `@sc/schemas/mocks` (temporary route, removed) ✅; the brief's `api.ts` fetch snippet typechecks ✅; DB has no drift after the schema comment edit (`migrate diff` → no difference) ✅; typecheck 5/5, lint clean ✅.

## 5. Accuracy / eval metrics (filled in Module 15)

| Metric | Target | Current |
|---|---|---|
| Faithfulness | ≥ 0.85 | — |
| Answer relevancy | ≥ 0.80 | — |
| Context precision / recall | ≥ 0.75 | — |
| Citation accuracy (correct page/slide/timestamp) | ≥ 80% | — |
| Refusal precision / recall (off-material) | ≥ 0.8 / ≥ 0.8 | — |
| Quiz verify pass rate | report | — |
| Sim: mastery gain, adaptive vs random | adaptive > random | — |
| Sim: repetition rate | 0% | — |

## 6. Open issues / decisions
- Prisma pinned to **6.19.3**: npm `latest` currently points at an 8.0 RC, and 7.x needs driver adapters. 6 is the stable, simple choice.
- Postgres on host port **5434**: 5432 and 5433 are used by other containers on the dev machine.
- Gemini key var renamed to `APP_GEMINI_API_KEY` so a machine-wide `GEMINI_API_KEY` can never override `.env`. `packages/core/src/llm.ts` must pass `apiKey` explicitly (the SDK otherwise falls back to `GEMINI_API_KEY` / `GOOGLE_API_KEY`).
- **Root `.env` in a monorepo:** loading it from `next.config.ts` did NOT reach route handlers (Next 16 runs them in a separate process). Fix: `apps/web/scripts/next.mjs` calls Node's `process.loadEnvFile` before starting Next, so child processes inherit the values.
- **Windows DLL lock:** `prisma generate` fails with EPERM while the dev server runs. Typecheck no longer depends on it. The client is generated on `npm install` (postinstall) and at `npm run dev` start.
- Schema additions beyond the original plan (each needed by a later module): Source `filename/mimeType/sizeBytes/progressDone/progressTotal/pageCount/durationSec/gemini*`; Chunk `seq/title/conceptLabels`; Topic `seq/embedding`; Question `assessmentId/position/explanation/verifierAnswer`; Assessment `status/courseId/submittedAt`; Attempt `score`; MasteryEvent `attemptId/chatMessageId`; ChatMessage `blocks/refused/topScore/courseId`.
- **Rebuilding topics wipes mastery and questions for those topics** (cascade). That's acceptable for the demo: build the course once, before learners start.
- Contract additions vs. the original API list: `GET /api/topics` (quiz scope picker), `GET /api/chat?learnerId=` (history), `GET /api/quiz/[id]` and `GET /api/quiz/[id]/report` (pages load after navigation), `TutorAnswer.masteryUpdates` (shows learner-model updates from chat), `MasteryView.needsDiagnostic` (cold start), standard `ApiErrorBody`.
- **Promised to teammate:** Module 11 exports `updateMastery(p, correct, type, weight?) => number` from `@sc/core` (the simulator depends on it).
- `data/demo/` created for the dataset (gitignored except its README).
- Considered and deferred: an `LlmCall` table logging tokens per call (useful for quota tracking). Add only if needed.
- **Stop the dev server before `npm install`**: `@sc/db`'s postinstall (`prisma generate`) hits the same Windows DLL lock.
- `@sc/core` and `@sc/schemas` are `"type": "module"`. Without it `tsx` loaded them as CommonJS and named exports failed. `@sc/db` stays CommonJS because `prisma.config.ts` uses `__dirname`.
- Free tier: the limits are requests per minute and per day, and no charges apply unless billing is enabled on the AI Studio project. Check per-model limits in AI Studio → Rate limits.
- First `docker pull` failed with a transient Docker Hub auth EOF; the retry worked.
