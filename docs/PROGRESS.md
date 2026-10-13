# Progress Tracker

Updated: **2026-10-14** (cross-referenced with ARCHITECTURE.md) · Deadline: **NOT CONFIRMED (check Devpost)**
Rule: one module at a time → test → user review → next. A module is ✅ only after its tests pass.

Legend: ✅ done & verified · 🟡 in progress / awaiting review · ⬜ not started · ❌ blocked

---

## 0. Summary (2026-10-14, after Module 4)

- **Done:**
  - Backend Modules 0–2.
  - **Contract v1.1** (typed client `@sc/client`, path builders, registry status enforced by tests, audit fixes).
  - **Module 4:** learners, streamed uploads with content validation, source list/delete, file serving with Range.
- **Tests:** 162 unit/contract tests; 37 e2e tests passing against **both** the dev and production servers; production build with 0 warnings.
- **Next:** a Gemini rate limiter in `llm.ts` (I-12), then Module 5: PDF ingestion (+ retry endpoint, restart recovery).
- **Blocked / at risk:**
  - **Demo dataset** (teammate Task 1) is needed for real tests of Modules 5–7.
  - The video path is unverified against Gemini (no real mp4 yet).
  - Gemini free-tier limits unknown.
  - Deadline not confirmed.
- **Waiting on you:**
  - Review Module 4 (Postman collection in `docs/postman/`).
  - Push.
  - Send `docs/TEAMMATE_BRIEF.md` (v1.1, recreated; it was missing from disk).
  - Confirm the Devpost deadline.
  - Check AI Studio → Rate limits for `gemini-3.1-flash-lite` and `gemini-embedding-001`.

## 1. Backend modules (Parth): cross-referenced with ARCHITECTURE.md §10

| # | Module | "Done when" (ARCHITECTURE §10) | Status | Evidence / gap |
|---|---|---|---|---|
| 0 | Skeleton: Turborepo + Postgres + Prisma + `/api/health` | health returns `db.ok: true` | ✅ | §4 Module 0/0b |
| 1 | Gemini wrapper `llm.ts` + `tools/smoke` | all 5 checks pass | ✅ partial | 4/5 pass. **Video check never run** (no sample mp4); carried to Module 7 |
| 2 | Prisma schema + migration + seed | migrate succeeds, rows visible | ✅ | 11 tables + seed rows verified via psql and `db:verify` 12/12. Your Beekeeper check is pending |
| 3 | `@sc/schemas` contract + mocks | both teammates sign off | 🟡 | Built + tested. **Needs teammate sign-off** (v1.1 brief) |
| 3.1 | Contract v1.1 + `@sc/client` (audit fixes I-01…I-07) | integration issues resolved, tested | ✅ | 103 schema tests + 16 client tests; INTEGRATION_AUDIT §11 |
| 4 | Learners API, upload (streamed, validated), sources list/delete, `/api/files/[id]` (Range) | file uploads; video seeks in browser | 🟡 awaiting review | 43 core + 37 e2e (dev **and** prod). **Browser seek not yet tried with a real mp4** (server Range verified) |
| 5 | PDF ingestion | chunks with page + figure chunks | ⬜ | needs dataset PDF (synthetic PDF works for dev) |
| 6 | PPTX ingestion | one chunk per slide, in order | ⬜ | needs a .pptx |
| 7 | Video ingestion | timestamped segments | ⬜ | needs an mp4 (≤ 20 min) |
| 8 | Embeddings + retrieval | top-6 includes the right chunk | ⬜ | |
| 9 | Course build + `/api/build`, `/api/topics` | 5–8 sensible topics, chunks tagged | ⬜ | |
| 10 | Tutor API + grounding guards (+ `/api/eval/answer`) | cited answer; off-material refused | ⬜ | citation panel UI is teammate Task 3 |
| 11 | BKT `updateMastery` (unit tested) | known sequences → expected values | ⬜ | signature promised to teammate |
| 12 | Quiz generate + verify + no-repeat | verified questions, no seen stems | ⬜ | |
| 13 | Submit, grading, report API | report with misconceptions + citations | ⬜ | |
| 14 | Mastery API (`/api/mastery`) | mastery bars, history chart | ⬜ | dashboard UI is teammate Task 7 |
| 15 | Eval + simulator | metrics table in README | ⬜ | scripts are teammate Tasks 8–10; Parth runs + calibrates `REFUSAL_TAU` |
| 16 | README, demo video, Devpost | submitted | ⬜ | teammate Task 11 + both |

## 1b. Teammate track (docs/TEAMMATE_BRIEF.md §5)

| Task | What | Blocks / feeds | Status |
|---|---|---|---|
| 1 | Demo dataset (mp4 15–20 min, PDF 20–30 pp, .pptx ~20 slides) | **blocks Modules 5–7 real testing** | ⬜ brief (v1.1) not sent yet. Uploading each file now validates format and length |
| 2 | App shell + learner picker | all pages | ⬜ |
| 3 | Citation panel (PDF page / slide card / video seek) | Module 10 demo; judged (KB & Grounding 20) | ⬜ |
| 4 | `/sources` page | Modules 4–9 demo | ⬜ (its endpoints are **live**) |
| 5 | `/tutor` page | Module 10 | ⬜ |
| 6 | `/quiz` + report pages | Modules 12–13 | ⬜ |
| 7 | `/dashboard` | Module 14 | ⬜ |
| 8 | Eval test set (20 items) | Module 15; `REFUSAL_TAU` calibration | ⬜ |
| 9 | `score.ts` + `ragas.py` | Module 15 | ⬜ |
| 10 | Simulator `tools/sim` | Module 15 (needs `updateMastery`, Module 11) | ⬜ |
| 11 | README + demo script | Module 16 | ⬜ |

## 2. Track D requirement coverage

| Requirement | Pts | Status | Where it stands |
|---|---|---|---|
| Multimodal KB (video/PDF/PPTX, topics, prereqs, locators, figures) | 20 | 🟡 | **Upload of all 3 types works** (streamed, content-validated, page/slide count, video duration ≤ 20:00); originals served with Range for citations. Gemini reads PDF figures + slide images (smoke ✅). Parsing/chunking/topics not built (5–9) |
| Grounding (cited excerpts, refusals, outside-knowledge labels) | (in 20) | 🟡 foundation | Rules enforced in the contract + tested (material ⇒ citation, refusal shape). Tutor not built (10) |
| Assessment (MCQ/short/numeric, tagged, verified, no repeats, report) | 15 | 🟡 foundation | DB + contract support all fields, no-answer-leak tested. Engine not built (12–13) |
| Learner model (BKT after quiz + chat, diagnostic cold start) | 20 | 🟡 foundation | Mastery + event history (QUIZ/CHAT evidence) in DB; `needsDiagnostic` in contract. BKT not built (11) |
| Evaluation (RAGAS metrics, simulated students) | 15 | 🟡 foundation | Test-set schema + gap checker; eval endpoint contract. Scripts not built (15) |
| UX & demo | 15 | ⬜ | `@sc/client` + mocks ready for all pages; Postman collection for live endpoints; no pages yet |

## 3. Health

| Check | Status | Last checked |
|---|---|---|
| Postgres (docker `study-companion-db`, :5434) | ✅ `SELECT 1` 1–48 ms | 2026-10-14 |
| Env: DATABASE_URL, REFUSAL_TAU | ✅ present (`REFUSAL_TAU` = placeholder 0.55, uncalibrated) | 2026-10-14 |
| Env: APP_GEMINI_API_KEY (from `.env` only) | ✅ present | 2026-10-14 |
| Env: LLM_MODEL_FAST / LLM_MODEL_STRONG = `gemini-3.1-flash-lite`, EMBED_MODEL = `gemini-embedding-001` | ✅ present | 2026-10-14 |
| Gemini API reachable (`/api/health?gemini=1`, metadata only, 0 tokens) | ✅ all 3 models ok | 2026-10-14 |
| Gemini smoke (`npm run smoke`) | ✅ 4/5 (video skipped, never run) | 2026-10-14 (not re-run: costs tokens) |
| Typecheck (7 workspaces) / lint | ✅ clean | 2026-10-14 |
| Production build (`npm run build`) | ✅ 0 warnings; 5 dynamic API routes | 2026-10-14 |
| Prisma CLI → DB (reads root `.env`) | ✅ connects to localhost:5434 | 2026-10-14 |
| Migrations (`npm run db:status`) | ✅ `init` applied, schema up to date | 2026-10-14 |
| Schema checks (`npm run db:verify`) | ✅ 12/12 | 2026-10-14 |
| Unit + contract tests (`npm run test`) | ✅ 162/162 (schemas 103 · client 16 · core 43) | 2026-10-14 |
| End-to-end (`npm run test:e2e`) | ✅ 37/37 on dev server · 37/37 on production server | 2026-10-14 |

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

### Module 3.1 — Contract v1.1 + `@sc/client` — 2026-10-14
Fixes from INTEGRATION_AUDIT (I-01…I-07, I-17): typed client package, per-endpoint mock switching (`NEXT_PUBLIC_API_MODE=auto`), `paths` builders + query schemas, registry `status` enforced against route files, `HealthResponse` in the contract, `AttemptResult.options`, consistent mock timeline, 200-on-success + `API_ERROR_STATUS`.

| Test group | Tests | Result |
|---|---|---|
| Schemas: v1.0 contract (mocks, grounding, quiz safety, enums…) | 55 | ✅ |
| Schemas: `paths` ↔ registry pattern + query schema (one per endpoint) + encoding | 17 | ✅ |
| Schemas: registry `status` ↔ route files (both directions), non-JSON routes, no unregistered routes | 19 | ✅. **Red first:** 6 Module 4 checks failed until the routes existed |
| Schemas: mock consistency (n = events, chained values, report ↔ events, chat ↔ events, options) | 6 | ✅ |
| Schemas: v1.1 rules (options refine, response-type match, extensions, query blanks, error statuses, cap) | 6 | ✅ |
| Client: modes (mock/auto/live), deep-copied mocks, delay, baseUrl | 4 | ✅ |
| Client: HTML 404 / empty 405 → `http_error`, ApiErrorBody → code+status, contract break → `invalid_response`, network, health 503 | 6 | ✅ |
| Client: request validation before send, trimmed JSON, URL building, DELETE, raw upload, pre-send upload rejection | 6 | ✅ |

### Module 4 — Learners, uploads, sources, file serving — 2026-10-14
Code:
- `packages/core/src/{errors,storage,media,course,learners,sources,testing}.ts`.
- Routes `learners`, `sources`, `sources/[id]`, `files/[id]`, plus a refactored `health` on the shared `api/_lib/http.ts`.
- `tools/e2e`.

| Check | Result |
|---|---|
| Core: content validation (PDF pages / damaged / non-PDF; PPTX slides / not-a-deck / no slides / non-ZIP) | ✅ 7 |
| Core: MP4 duration (mvhd v0/v1, moov after mdat, 64-bit box, unknown marker, no moov, truncated) + 20:00 / 20:01 + non-MP4 | ✅ 11 |
| Core: streaming save (exact bytes, cap abort + cleanup, no overwrite); repo-root detection; path traversal refused | ✅ 5 |
| Core: `parseByteRange` (12 header cases) | ✅ 12 |
| Core (DB): learners; PDF/PPTX/MP4 upload → row, file, list, serve, delete; rejected uploads leave nothing; early Content-Length reject; base-name filenames; 409 while PROCESSING; missing course → 409 | ✅ 8 |
| e2e: registry vs server (live answer + validate; planned → 404; client `http_error`; 405s; ApiErrorBody) | ✅ 15 |
| e2e: learners (create/trim/list, 4 invalid bodies → 400, client pre-validation) | ✅ 3 |
| e2e: sources (unicode filename, repo-root path, PPTX slides, MP4 duration, delete + 404, 409 PROCESSING, 6 invalid uploads → 400 + no leftovers, early Content-Length reject) | ✅ 7 |
| e2e: **2 GiB chunked upload cut off after 503 MiB** (streaming proven; partial file removed) | ✅ |
| e2e: files (full GET headers + bytes, HEAD, 4 Range cases → 206, 416, multi-range → 200, video probe + seek, unknown id 404, missing file 404) | ✅ 12 |
| Production server: same 37 e2e tests | ✅ 37/37 |
| Production: `Accept-Encoding: gzip, br` on full and Range requests → no compression, bytes exact | ✅ |
| `next build` | ✅ 0 warnings (after fixes N-3, N-4) |
| Leftovers after all runs (`data/uploads`, test rows) | ✅ none |

Bugs found and fixed by these tests (INTEGRATION_AUDIT §11.2):
- **N-1:** a damaged PDF caused a 500 → now 400.
- **N-2:** `bytes=<size>-` returned 200 → now 416.
- **N-3:** a Turbopack warning on every request (`export *` from Prisma).
- **N-4:** whole-project output tracing.

Not verified yet:
- A real browser playing and seeking a real mp4.
- The PDF iframe `#page=N` in a browser (needs the UI).
- A real lecture file through the MP4 parser.

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
- **Cross-reference fixes (2026-10-14):**
  1. Module 1's "all 5 checks" isn't fully met, since video was never run. Tracked as a gap.
  2. Module 3 needs the teammate's sign-off.
  3. Modules 10 and 14 were split: the backend API is Parth's, and the citation panel and dashboard UI belong to the teammate. ARCHITECTURE §10 is updated to match.
  4. Module 4 now also covers the learners endpoints, and Module 9 covers `/api/topics`.
- **Module 4 decisions:**
  - Uploads are **raw bytes + `?filename=`** (not multipart) so they stream to disk.
  - The **extension decides the type** and the **content must match**; the browser MIME type is ignored.
  - Source ids are UUIDs.
  - New uploads stay `PENDING` until Module 5 starts ingestion.
- `docs/TEAMMATE_BRIEF.md` was missing from disk (never committed). It was recreated as v1.1. If it was deleted on purpose, delete it again.
- Considered and deferred: an `LlmCall` table logging tokens per call (useful for quota tracking). Add only if needed.
- **Stop the dev server before `npm install`**: `@sc/db`'s postinstall (`prisma generate`) hits the same Windows DLL lock.
- `@sc/core` and `@sc/schemas` are `"type": "module"`. Without it `tsx` loaded them as CommonJS and named exports failed. `@sc/db` stays CommonJS because `prisma.config.ts` uses `__dirname`.
- Free tier: the limits are requests per minute and per day, and no charges apply unless billing is enabled on the AI Studio project. Check per-model limits in AI Studio → Rate limits.
- First `docker pull` failed with a transient Docker Hub auth EOF; the retry worked.
