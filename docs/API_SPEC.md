# API Specification

Audited: **2026-10-14** against the repository at commit `2d5d93a` (plus uncommitted doc edits).
Source of truth for shapes: **`packages/schemas/src/*.ts`** (Zod). This document restates those schemas field by field. If the two ever disagree, the code wins and this doc is wrong.

**Status legend**

| Label | Meaning |
|---|---|
| ✅ IMPLEMENTED | Route file exists and was called successfully during this audit |
| 📄 PLANNED | Defined in `@sc/schemas` (`endpoints.ts`) and docs; **no route file**; returns Next's HTML 404 today |
| 🔶 PROPOSED | Not in schemas; this doc proposes it, and both devs must agree before use |
| ❓ UNRESOLVED | A decision is needed (see §5) |

**Example provenance labels:** `[mock]` = copied from `packages/schemas/src/mocks.ts` (validated by `npm run test`) · `[test]` = taken from `packages/schemas/test/contract.test.ts` · `[route]` = observed from the running route · `[proposed]` = written for this spec and valid against the Zod schema, but no backend produces it yet.

---

## 0. Verified state (evidence)

Probed on `localhost:3000` during the audit with `curl -X <method> -H "Content-Type: application/json" -d '{}'`:

| Request | HTTP | Content-Type |
|---|---|---|
| `GET /api/health` | **200** | application/json |
| `POST /api/health` | **405** | (empty body) |
| `GET /api/sources`, `POST /api/sources`, `GET /api/files/x`, `GET/POST /api/learners`, `POST /api/build`, `GET /api/topics`, `POST /api/chat`, `GET /api/chat?learnerId=…`, `POST /api/eval/answer`, `POST /api/quiz`, `GET /api/quiz/x`, `POST /api/quiz/x/submit`, `GET /api/quiz/x/report`, `GET /api/mastery?learnerId=…` | **404** | **text/html** (Next's not-found page) |

Route files on disk: only `apps/web/app/api/health/route.ts`.
Contract tests: `npm run test` → **53/53 pass** (every mock validates against its response schema).
No application code imports `@sc/schemas` yet (grep found only `transpilePackages` in `apps/web/next.config.ts`).

---

## 1. Conventions (apply to every JSON endpoint)

| Topic | Rule | Status |
|---|---|---|
| Base URL | Same origin as the UI: `http://localhost:3000` | ✅ |
| Request body | `Content-Type: application/json`, except upload (multipart) | 📄 |
| Dates | ISO-8601 UTC strings (`z.iso.datetime()`), e.g. `"2026-10-14T09:00:00.000Z"` | 📄 schema |
| IDs | Opaque non-empty strings (`Id = z.string().min(1)`). The DB uses cuids; seed and mocks use readable ids (`demo-learner`, `t-rr`). **Never parse or validate id format in the UI.** | 📄 schema |
| Probabilities | Numbers in `[0, 1]` | 📄 schema |
| Auth | **None.** The learner is identified by `learnerId` in the body or query string. Fixed seed learner: `demo-learner` | 📄 by design (CLAUDE.md: "no auth") |
| Course | Single course. `courseId` is optional everywhere and **defaults to `demo-course`** (seed) | 📄 docs |
| Success status | ❓ Not specified in schemas. **Proposed: 200 for every successful JSON response, including POST.** The client only relies on `res.ok` | ❓ Q1 |
| Errors | `ApiErrorBody` (below). No route emits it yet; `/api/health` uses its own shape | 📄 schema |
| Response validation | Server should validate the outgoing payload with the endpoint's response schema (CLAUDE.md: "API routes must validate with it") | 📄 rule, nothing implemented |

### 1.1 Error contract: `ApiErrorBody` (`packages/schemas/src/common.ts`)

```ts
{ error: { code: ApiErrorCode, message: string } }
```

| `code` | HTTP (from comments in `common.ts`) | Used when |
|---|---|---|
| `bad_request` | 400 | Request failed Zod validation (body or query) |
| `not_found` | 404 | Unknown learner / quiz / source id |
| `not_ready` | 409 | Sources still processing, course not built, report requested before submit |
| `rate_limited` | 429 | Gemini quota hit (`LlmError.kind === "rate_limit"`) |
| `llm_error` | 502 | Gemini failed after one retry |
| `internal` | 500 | Anything else |

Example `[mock]` (`mockStates.error`):
```json
{ "error": { "code": "not_ready", "message": "Sources are still processing. Try again when all are READY." } }
```

**Non-JSON failures the client must survive (verified):**
- An unknown route returns **404 `text/html`**.
- A wrong method on an existing route returns **405 with an empty body**.
- Neither is `ApiErrorBody`. See INTEGRATION_AUDIT issue I-01.

### 1.2 Citation (`packages/schemas/src/citation.ts`), used by many responses

A discriminated union on `sourceType`. **Exactly one locator per type.**

| Field | Type | All types | Notes |
|---|---|---|---|
| `sourceType` | `"PDF" \| "PPTX" \| "VIDEO"` | ✓ | discriminator |
| `chunkId` | Id | ✓ | the `Chunk.id` cited |
| `sourceId` | Id | ✓ | the `Source.id`; used to build the file URL |
| `filename` | string (min 1) | ✓ | original upload name |
| `kind` | `"TEXT" \| "FIGURE" \| "SLIDE" \| "TRANSCRIPT"` | ✓ | |
| `title` | string \| **null** | ✓ | key **required**; slide title / figure caption, or `null` |
| `excerpt` | string (min 1) | ✓ | text to show beside the opened source. ❓ no max length (Q10) |
| `page` | int ≥ 1 | PDF only | 1-based page index **in the file** |
| `slide` | int ≥ 1 | PPTX only | 1-based slide number (presentation order) |
| `tStart`, `tEnd` | number ≥ 0, `tEnd ≥ tStart` | VIDEO only | seconds (float) |

Helpers exported from `@sc/schemas` (tested):

| Helper | PDF | PPTX | VIDEO |
|---|---|---|---|
| `formatLocator(c)` | `"p. 7"` | `"slide 9"` | `"12:34–13:32"` |
| `citationHref(c)` | `/api/files/{sourceId}#page=7` | `/api/files/{sourceId}` (UI shows a slide card instead) | `/api/files/{sourceId}#t=754` |

`formatTime(s)`: `75.4 → "1:15"`, `3725 → "1:02:05"`.

Examples `[mock]` (`citations` in `mocks.ts`):
```json
{ "sourceType": "PDF", "sourceId": "src-pdf", "filename": "Galvin_Ch5_CPU_Scheduling.pdf",
  "chunkId": "c-pdf-7-1", "kind": "FIGURE", "title": "Figure 5.4 Gantt chart for FCFS", "page": 7,
  "excerpt": "Gantt chart: P1 runs 0–24 ms, P2 runs 24–27 ms, P3 runs 27–30 ms. Waiting times 0, 24, 27 ms; average 17 ms." }

{ "sourceType": "PPTX", "sourceId": "src-pptx", "filename": "CPU_Scheduling_Lecture.pptx",
  "chunkId": "c-pptx-9", "kind": "SLIDE", "title": "Round Robin: the time quantum", "slide": 9,
  "excerpt": "Each process gets a small unit of CPU time (time quantum q), usually 10–100 ms. After q expires, the process is preempted and added to the end of the ready queue." }

{ "sourceType": "VIDEO", "sourceId": "src-video", "filename": "NPTEL_OS_Lec12_Scheduling.mp4",
  "chunkId": "c-video-14", "kind": "TRANSCRIPT", "title": null, "tStart": 754, "tEnd": 812.5,
  "excerpt": "If the quantum is very large, round robin degenerates into FCFS. If it is very small, context-switch overhead dominates." }
```

---

## 2. Endpoint inventory

| # | Method | Path | Status | Backend module | Request schema | Response schema |
|---|---|---|---|---|---|---|
| E1 | GET | `/api/health` | ✅ | 0 | query `gemini=1` (optional) | route-local (not in `@sc/schemas`) |
| E2 | GET | `/api/learners` | 📄 | 4 | none | `Learner[]` |
| E3 | POST | `/api/learners` | 📄 | 4 | `CreateLearnerRequest` | `Learner` |
| E4 | POST | `/api/sources` | 📄 | 4 | multipart `file` | `UploadResponse` |
| E5 | GET | `/api/sources` | 📄 | 4 (status from 5–7) | none | `SourceView[]` |
| E6 | GET | `/api/files/[id]` | 📄 (comment in `endpoints.ts` only) | 4 | `Range` header | file bytes |
| E7 | POST | `/api/build` | 📄 | 9 | `BuildRequest` | `BuildResponse` |
| E8 | GET | `/api/topics` | 📄 | 9 | none | `TopicView[]` |
| E9 | POST | `/api/chat` | 📄 | 10 (+11 for mastery) | `ChatRequest` | `TutorAnswer` |
| E10 | GET | `/api/chat?learnerId=` | 📄 | 10 | query `learnerId` | `ChatMessageView[]` |
| E11 | POST | `/api/eval/answer` | 📄 | 10 | `EvalAnswerRequest` | `EvalAnswerResponse` |
| E12 | POST | `/api/quiz` | 📄 | 12 | `CreateQuizRequest` | `Quiz` |
| E13 | GET | `/api/quiz/[id]` | 📄 | 12 | none | `Quiz` |
| E14 | POST | `/api/quiz/[id]/submit` | 📄 | 13 (+11) | `SubmitRequest` | `QuizReport` |
| E15 | GET | `/api/quiz/[id]/report` | 📄 | 13 | none | `QuizReport` |
| E16 | GET | `/api/mastery?learnerId=` | 📄 | 14 (+11) | query `learnerId` | `MasteryView` |
| E17 | DELETE or POST | `/api/sources/[id]` (delete / retry failed source) | 🔶 | — | — | — |
| E18 | GET | `/api/assessments?learnerId=` (quiz history list) | 🔶 | — | — | — |

The registry in `packages/schemas/src/endpoints.ts` contains E2–E5 and E7–E16 (14 entries). **E1 and E6 are not in the registry.** E17/E18 are only proposals from this audit (see INTEGRATION_AUDIT §7). Nothing depends on them yet.

---

## 3. Endpoint details

### E1. `GET /api/health`: ✅ IMPLEMENTED
- **Code:** `apps/web/app/api/health/route.ts`
- **Purpose:** liveness of the DB and env, and optionally Gemini. The UI may show a status dot; Postman uses it for smoke checks.
- **Query:** `gemini=1` (optional). Also calls `checkModels()` in `packages/core/src/llm.ts` (Gemini `models.get` per model; metadata only, no tokens).
- **Responses:** **200** when healthy, **503** when the DB (or Gemini, with `?gemini=1`) fails. Shape `[route]`:
```json
{ "ok": true,
  "db": { "ok": true, "latencyMs": 2 },
  "env": { "DATABASE_URL": true, "APP_GEMINI_API_KEY": true, "LLM_MODEL_FAST": true, "LLM_MODEL_STRONG": true, "EMBED_MODEL": true, "REFUSAL_TAU": true },
  "gemini": { "LLM_MODEL_FAST": { "ok": true }, "LLM_MODEL_STRONG": { "ok": true }, "EMBED_MODEL": { "ok": true } } }
```
- DB down `[route, verified in Module 0]`: `503 {"ok":false,"db":{"ok":false,"error":"Server has closed the connection."},"env":{…}}`
- `gemini` key only present with `?gemini=1`. On a client-level failure it is `{"error": "..."}`.
- **Not `ApiErrorBody`. Not in `@sc/schemas`.** The env map reports presence only (booleans), never values.
- **DB / modules:** raw `SELECT 1` via `@sc/db`, plus `@sc/core.checkModels`.

### E2. `GET /api/learners`: 📄 PLANNED (Module 4)
- **Purpose:** fills the header learner picker.
- **Response 200:** `Learner[]`, where `Learner = { id: Id, name: string, createdAt: IsoDate }`
- `[mock]`:
```json
[ { "id": "demo-learner", "name": "Demo Learner", "createdAt": "2026-10-14T09:00:00.000Z" },
  { "id": "learner-asha", "name": "Asha", "createdAt": "2026-10-14T09:05:00.000Z" } ]
```
- **DB:** `Learner` (read). Order ❓ (proposed: `createdAt asc`).

### E3. `POST /api/learners`: 📄 PLANNED (Module 4)
- **Body:** `CreateLearnerRequest = { name: string }`. Trimmed, length 1–60.
- **Response 200 (Q1):** `Learner`.
- **Errors:** 400 `bad_request` (empty or too long name).
- `[test]` request `{ "name": "Asha" }` → `[mock]` response `{ "id": "learner-asha", "name": "Asha", "createdAt": "2026-10-14T09:05:00.000Z" }`
- **DB:** `Learner` (insert). No uniqueness on `name`.

### E4. `POST /api/sources`: 📄 PLANNED (Module 4; processing in 5–7)
- **Content-Type:** `multipart/form-data`, **single field `file`** (per the `endpoints.ts` request description).
- **Accepted MIME types** (`ACCEPTED_UPLOADS` in `course.ts`):

| `SourceType` | MIME |
|---|---|
| PDF | `application/pdf` |
| PPTX | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| VIDEO | `video/mp4` |

- `MAX_VIDEO_MINUTES = 20`. **The file-size limit is ❓ unresolved (Q2)**, and so is how video duration is enforced.
- **Behaviour (ARCHITECTURE §6.1):**
  1. Save the file to `data/uploads/<id>.<ext>`.
  2. Create `Source` with `status=PROCESSING`.
  3. Start ingestion **without awaiting** it.
  4. Return immediately.
- **Response 200 (Q1):** `UploadResponse = { id: Id, status: SourceStatus }`, e.g. `[mock]` `{ "id": "src-video", "status": "PROCESSING" }`
- **Errors (proposed):** 400 `bad_request` for a missing `file` field, an unsupported type (Q13), or an empty file.
- **Courseless:** goes to the default course.
- Example request `[proposed]`:
```
POST /api/sources HTTP/1.1
Content-Type: multipart/form-data; boundary=----X

------X
Content-Disposition: form-data; name="file"; filename="Galvin_Ch5_CPU_Scheduling.pdf"
Content-Type: application/pdf

%PDF-1.7 …binary…
------X--
```
  Browser: `const fd = new FormData(); fd.append("file", file); fetch("/api/sources", { method: "POST", body: fd })`. **Do not set a Content-Type header manually.**
- **DB:** `Source` (insert/update), `Chunk` (insert by ingestion).

### E5. `GET /api/sources`: 📄 PLANNED (Module 4)
- **Purpose:** source list plus ingestion progress. **The UI polls it every 2 s while any source is `PENDING` or `PROCESSING`.**
- **Response 200:** `SourceView[]`

| Field | Type | Notes |
|---|---|---|
| `id` | Id | |
| `type` | `"PDF" \| "PPTX" \| "VIDEO"` | |
| `filename` | string | |
| `status` | `"PENDING" \| "PROCESSING" \| "READY" \| "FAILED"` | |
| `error` | string \| null | set when FAILED |
| `progressDone`, `progressTotal` | int ≥ 0 | PDF: pages · PPTX: slide batches of 5 · VIDEO: 0→1 (from the `schema.prisma` comment) |
| `chunkCount` | int ≥ 0 | |
| `createdAt` | IsoDate | |

`[mock]` (`mocks.listSources[0]`, plus the failed state from `mockStates.failedSource`):
```json
[ { "id": "src-pdf", "type": "PDF", "filename": "Galvin_Ch5_CPU_Scheduling.pdf", "status": "READY", "error": null,
    "progressDone": 28, "progressTotal": 28, "chunkCount": 61, "createdAt": "2026-10-14T09:00:00.000Z" },
  { "id": "src-bad", "type": "PPTX", "filename": "broken.pptx", "status": "FAILED", "error": "Could not read ppt/presentation.xml",
    "progressDone": 0, "progressTotal": 0, "chunkCount": 0, "createdAt": "2026-10-14T09:03:00.000Z" } ]
```
- `SourceView` deliberately omits `mimeType`, `sizeBytes`, `pageCount` and `durationSec`, which exist in the DB.
- **DB:** `Source` plus a count of `Chunk`.

### E6. `GET /api/files/[id]`: 📄 PLANNED (Module 4); documented only as a comment in `endpoints.ts`
- **Purpose:** serves the original upload for citations: the PDF in an iframe at `#page=N`, the video in `<video>` at `#t=S`, and the PPTX as a download.
- **Path param:** `id` = `Source.id`.
- **Request headers:** `Range: bytes=start-end` (sent by browsers for video seeking).
- **Responses (proposed, standard HTTP):**
  - `200` with the full file.
  - `206 Partial Content` with `Content-Range` when `Range` is sent.
  - `416` for an invalid range.
  - `404` with `ApiErrorBody` for an unknown id.
  - Always set `Content-Type` to `Source.mimeType`, `Accept-Ranges: bytes`, and `Content-Disposition: inline` (PDF/video).
- **Not JSON.** Not validated by `@sc/schemas`.
- **Risks:**
  - `Source.path` is relative to the **repo root**, but `next dev` runs with cwd `apps/web` (INTEGRATION_AUDIT I-09).
  - That `#page=N` works depends on the browser's PDF viewer (unverified).

### E7. `POST /api/build`: 📄 PLANNED (Module 9)
- **Body:** `BuildRequest = { courseId?: Id }`, so `{}` is valid.
- **Behaviour:** one LLM call produces 5–8 topics with prerequisites, then each chunk is tagged to its nearest topic by embedding.
- **Response 200:** `BuildResponse = { topics: TopicView[] }`. For `TopicView`, see E8.
- **Errors (proposed):** 409 `not_ready` (any source not READY, or no sources) · 429 / 502 LLM errors.
- ⚠ **Rebuilding deletes all `Topic` rows, which cascades to `Mastery`, `MasteryEvent` and `Question` for those topics** (`schema.prisma` delete rules). ❓ Q9: warn in the UI or forbid a rebuild once learners have data.
- **DB:** `Topic` (delete + insert), `Chunk.topicId` (update).

### E8. `GET /api/topics`: 📄 PLANNED (Module 9)
- **Response 200:** `TopicView[]` ordered by `seq`.

| Field | Type | Notes |
|---|---|---|
| `id` | Id | |
| `seq` | int ≥ 0 | display order, roughly prerequisite order |
| `name` | string (min 1) | |
| `description` | string | |
| `prereqIds` | Id[] | ids of other topics in the same course; **not FK-enforced** (`Topic.prereqIds String[]`) |
| `chunkCount` | int ≥ 0 | |

`[mock]` (2 of 6):
```json
[ { "id": "t-fcfs", "seq": 2, "name": "FCFS scheduling", "description": "First-come first-served; the convoy effect.", "prereqIds": ["t-crit"], "chunkCount": 9 },
  { "id": "t-rr", "seq": 4, "name": "Round Robin", "description": "Time-sliced scheduling; choosing the time quantum.", "prereqIds": ["t-fcfs"], "chunkCount": 10 } ]
```
- Returns `[]` before the course is built (proposed).

### E9. `POST /api/chat`: 📄 PLANNED (Module 10; mastery update needs Module 11)
- **Body:** `ChatRequest = { learnerId: Id, courseId?: Id, message: string }`. `message` is trimmed, length 1–2000.
- **Behaviour (ARCHITECTURE §6.3):**
  1. Embed the question and retrieve the top 6 chunks.
  2. Load the learner's mastery.
  3. Make one structured LLM call.
  4. Server-side guards: drop citations outside the retrieved set; turn uncited material into outside knowledge; refuse if `topScore < REFUSAL_TAU` or `NOT_COVERED`.
  5. Apply a damped (30%) BKT update.
  6. Store both messages.
- ❓ Q6: single-turn (no conversation history sent to the model) vs. multi-turn.
- **Response 200:** `TutorAnswer`

| Field | Type | Rule (enforced by schema, tested) |
|---|---|---|
| `messageId` | Id | id of the stored ASSISTANT message |
| `coverage` | `"SUPPORTED" \| "PARTIAL" \| "NOT_COVERED"` | `NOT_COVERED` ⇒ `refused: true` |
| `refused` | boolean | |
| `refusalReason` | `"off_material" \| "not_covered" \| null` | non-null **iff** `refused` |
| `blocks` | `TutorBlock[]` | render in order; must be non-empty unless refused |
| `masteryUpdates` | `MasteryUpdate[]` | `{topicId, topicName, before, after, source:"QUIZ"\|"CHAT"}` |

`TutorBlock` is a discriminated union on `origin`:
- `{ origin: "material", text: string(min 1), citations: Citation[] (min 1) }`
- `{ origin: "outside", text: string(min 1), citations: [] (max 0) }`, which **must be visually labelled as not from the course**.
- A refused answer may contain **outside** blocks only.

`[test]` request: `{ "learnerId": "demo-learner", "message": "What is a time quantum?" }`

`[mock]` response (`mocks.chat`, citations abbreviated to their ids here; real payloads carry full Citation objects):
```json
{ "messageId": "msg-2", "coverage": "SUPPORTED", "refused": false, "refusalReason": null,
  "blocks": [
    { "origin": "material", "text": "In Round Robin, each process runs for at most one time quantum q before it is preempted and moved to the back of the ready queue.", "citations": [ { "...": "rrSlide citation (§1.2)" } ] },
    { "origin": "material", "text": "If q is very large, RR behaves like FCFS; if it is very small, context-switch overhead dominates.", "citations": [ { "...": "rrVideo citation (§1.2)" } ] },
    { "origin": "outside", "text": "In practice, Linux's CFS scheduler doesn't use a fixed quantum at all; it derives time slices from a target latency.", "citations": [] } ],
  "masteryUpdates": [ { "topicId": "t-rr", "topicName": "Round Robin", "before": 0.42, "after": 0.47, "source": "CHAT" } ] }
```
Refusal `[mock]` (`mockStates.refusedAnswer`):
```json
{ "messageId": "msg-4", "coverage": "NOT_COVERED", "refused": true, "refusalReason": "off_material",
  "blocks": [ { "origin": "outside", "text": "Your course material doesn't cover photosynthesis, so I can't answer from it. Ask about CPU scheduling topics instead.", "citations": [] } ],
  "masteryUpdates": [] }
```
- **Errors (proposed):** 400 (validation) · 404 (unknown learner) · 409 `not_ready` (course not built / no chunks) · 429 / 502.
- **Latency:** each Gemini call took **8–9 s** in the Module 1 smoke run (`gemini-3.1-flash-lite`). Expect about 10 s or more per chat turn, so the UI needs a pending state.
- **DB:** `Chunk` (read), `Mastery` (read/upsert), `MasteryEvent` (insert, `chatMessageId`), `ChatMessage` (insert ×2).

### E10. `GET /api/chat?learnerId={id}`: 📄 PLANNED (Module 10)
- **Query:** `learnerId` (required). Query parameters are **not** schema-typed in `endpoints.ts` (the path string is `"/api/chat?learnerId="`).
- **Response 200:** `ChatMessageView[]`, oldest first:
  `{ id, role: "USER"|"ASSISTANT", content: string, blocks: TutorBlock[] | null, coverage: Coverage | null, refused: boolean, createdAt }`
- `blocks` and `coverage` are `null` for USER messages.
- History has **no `masteryUpdates`**; those only come in the live E9 response.
- `[mock]` (`mocks.chatHistory`):
```json
[ { "id": "msg-1", "role": "USER", "content": "How does the time quantum affect Round Robin?", "blocks": null, "coverage": null, "refused": false, "createdAt": "2026-10-14T09:10:00.000Z" },
  { "id": "msg-2", "role": "ASSISTANT", "content": "In Round Robin, each process runs … target latency.", "blocks": [ "…same as E9…" ], "coverage": "SUPPORTED", "refused": false, "createdAt": "2026-10-14T09:10:12.000Z" } ]
```
- **Errors (proposed):** 400 for a missing `learnerId`.
- **DB:** `ChatMessage` (read).

### E11. `POST /api/eval/answer`: 📄 PLANNED (Module 10)
- **Purpose:** used by `tools/eval` (RAGAS + citation scoring). Same pipeline as E9 but **no learner, no history, no mastery update**.
- **Body:** `EvalAnswerRequest = { question: string }` (trimmed, min 1).
- **Response 200:** `EvalAnswerResponse`
  `{ answer: string, contexts: string[], citations: Citation[], refused: boolean, coverage: Coverage, topScore: number in [-1, 1] }`
- `[mock]`:
```json
{ "answer": "In Round Robin, each process runs … target latency.",
  "contexts": [ "Each process gets a small unit of CPU time (time quantum q), …", "If the quantum is very large, round robin degenerates into FCFS. …" ],
  "citations": [ "…rrSlide…", "…rrVideo…" ], "refused": false, "coverage": "SUPPORTED", "topScore": 0.78 }
```
- ⚠ Unlike `TutorAnswer`, this shape doesn't enforce `NOT_COVERED ⇒ refused`.
- **DB:** `Chunk` (read only).

### E12. `POST /api/quiz`: 📄 PLANNED (Module 12)
- **Body:** `CreateQuizRequest`

| Field | Type | Rule |
|---|---|---|
| `learnerId` | Id | required |
| `courseId` | Id | optional |
| `kind` | `"DIAGNOSTIC" \| "QUIZ" \| "MOCK"` | |
| `topicIds` | Id[] (min 1) | **required when `kind = "QUIZ"`** (schema refine) |
| `count` | int 1–20 | optional. ❓ Q12: ignored for DIAGNOSTIC (1 per topic) and MOCK (10)? |

`[test]` requests:
- `{ "learnerId": "demo-learner", "kind": "DIAGNOSTIC" }`
- `{ "learnerId": "demo-learner", "kind": "QUIZ", "topicIds": ["t-rr"], "count": 5 }`

- **Behaviour:**
  1. Pick topics weighted by (1 − mastery), with difficulty set by mastery band.
  2. One batched generate call.
  3. One batched blind-verify call; drop questions where the two disagree.
  4. Reject stems this learner has already seen (`stemHash`).
- **Response 200:** `Quiz = { assessmentId, kind, createdAt, questions: QuizQuestion[] (min 1) }`

`QuizQuestion` is a discriminated union on `type`, **client-safe** (answers stripped, tested):

| `type` | Fields (plus common `id, position, topicId, topicName, difficulty 1–3, stem`) |
|---|---|
| `MCQ` | `options: string[]` (2–6) |
| `NUMERIC` | `unit: string \| null` (key required) |
| `SHORT` | none |

`[mock]` (`mocks.createQuiz`):
```json
{ "assessmentId": "asmt-1", "kind": "QUIZ", "createdAt": "2026-10-14T09:20:00.000Z",
  "questions": [
    { "id": "q-1", "position": 0, "topicId": "t-fcfs", "topicName": "FCFS scheduling", "difficulty": 1, "type": "MCQ",
      "stem": "P1, P2, P3 arrive at t=0 with bursts 24, 3, 3 ms. What is the average waiting time under FCFS?",
      "options": ["10 ms", "17 ms", "24 ms", "27 ms"] },
    { "id": "q-2", "position": 1, "topicId": "t-rr", "topicName": "Round Robin", "difficulty": 2, "type": "NUMERIC",
      "stem": "Same processes under Round Robin with q = 4 ms. What is P1's turnaround time (ms)?", "unit": "ms" },
    { "id": "q-3", "position": 2, "topicId": "t-rr", "topicName": "Round Robin", "difficulty": 2, "type": "SHORT",
      "stem": "Why does a very large time quantum make Round Robin behave like FCFS?" } ] }
```
- **Errors (proposed):** 400 · 404 (learner / topic) · 409 `not_ready` (course not built) · 429 / 502.
- **Latency:** at least 2 sequential LLM calls, about **20 s or more** at the measured 8–9 s per call. The UI needs a long-running state.
- **DB:** `Assessment` (insert), `Question` (insert, `verified`, `verifierAnswer`), `Mastery` (read), `Question.stemHash` via `Assessment.learnerId` (read).

### E13. `GET /api/quiz/[id]`: 📄 PLANNED (Module 12)
- **Path:** `id` = `assessmentId`.
- **Response 200:** `Quiz` (same as E12). Used to reload `/quiz/[id]` after navigation. Questions are only those with `verified = true`, ordered by `position` (proposed).
- **Errors:** 404. ❓ Q14: allowed after submission?

### E14. `POST /api/quiz/[id]/submit`: 📄 PLANNED (Module 13; BKT needs Module 11)
- **Body:** `SubmitRequest = { responses: { questionId: Id, response: QuizResponse }[] }`. **Duplicate `questionId`s are rejected.** Unanswered questions may be omitted and are graded as wrong.
- `QuizResponse` is a discriminated union on `type` and **must match the question's type** (server-side check, not expressible in the schema):

| `type` | Shape |
|---|---|
| `MCQ` | `{ "type": "MCQ", "index": 1 }` (0-based option index) |
| `NUMERIC` | `{ "type": "NUMERIC", "value": 30 }` (finite number; graded in code with 1% tolerance) |
| `SHORT` | `{ "type": "SHORT", "text": "…" }` (trimmed, max 2000; graded by one batched LLM call) |

`[test]` request:
```json
{ "responses": [ { "questionId": "q-1", "response": { "type": "MCQ", "index": 1 } },
                 { "questionId": "q-2", "response": { "type": "NUMERIC", "value": 30 } } ] }
```
- **Response 200:** `QuizReport`

| Field | Type |
|---|---|
| `assessmentId`, `kind`, `submittedAt` | Id, AssessmentKind, IsoDate |
| `score` | `{ correct: int, total: int }` |
| `perTopic` | `{ topicId, topicName, correct, total, masteryBefore, masteryAfter }[]` |
| `misconceptions` | `{ label, topicId, topicName, count ≥ 1 }[]` |
| `revisit` | `Citation[]` |
| `attempts` | `AttemptResult[]` (below) |

`AttemptResult`:
```ts
{ questionId, position, topicId, type, stem,
  response: QuizResponse | null,   // null = unanswered
  correct, score,                  // score in [0,1], partial credit for SHORT
  correctAnswer: string,           // display string
  feedback: { text, citations: Citation[] },
  misconception: string | null }
```
⚠ `AttemptResult` has **no `options`** and no display text for the learner's own MCQ answer (INTEGRATION_AUDIT I-06).

`[mock]` (`mocks.submitQuiz`, one attempt shown):
```json
{ "assessmentId": "asmt-1", "kind": "QUIZ", "submittedAt": "2026-10-14T09:30:00.000Z",
  "score": { "correct": 2, "total": 3 },
  "perTopic": [ { "topicId": "t-fcfs", "topicName": "FCFS scheduling", "correct": 1, "total": 1, "masteryBefore": 0.35, "masteryAfter": 0.52 },
                { "topicId": "t-rr", "topicName": "Round Robin", "correct": 1, "total": 2, "masteryBefore": 0.47, "masteryAfter": 0.44 } ],
  "misconceptions": [ { "label": "Confuses waiting time with turnaround time", "topicId": "t-rr", "topicName": "Round Robin", "count": 1 } ],
  "revisit": [ "…rrSlide…", "…rrVideo…" ],
  "attempts": [ { "questionId": "q-2", "position": 1, "topicId": "t-rr", "type": "NUMERIC",
      "stem": "Same processes under Round Robin with q = 4 ms. What is P1's turnaround time (ms)?",
      "response": { "type": "NUMERIC", "value": 6 }, "correct": false, "score": 0, "correctAnswer": "30 ms",
      "feedback": { "text": "P1 finishes last, at t = 30 ms, so its turnaround time is 30 ms. 6 ms is its waiting time.", "citations": [ "…rrSlide…" ] },
      "misconception": "Confuses waiting time with turnaround time" } ] }
```
- **Errors (proposed):** 400 (validation, or response type doesn't match the question) · 404 · 409 (already submitted) · 429 / 502 (SHORT grading).
- **DB:** `Attempt` (insert; unique `(assessmentId, questionId)`), `Mastery` (update), `MasteryEvent` (insert, `attemptId`), `Assessment` (status=SUBMITTED, `report`, `submittedAt`).

### E15. `GET /api/quiz/[id]/report`: 📄 PLANNED (Module 13)
- **Response 200:** `QuizReport` (same as E14, read from `Assessment.report`).
- **Errors:** 404 · 409 `not_ready` if not yet submitted (proposed).

### E16. `GET /api/mastery?learnerId={id}`: 📄 PLANNED (Module 14; values from Module 11)
- **Response 200:** `MasteryView`

| Field | Type | Notes |
|---|---|---|
| `learnerId` | Id | |
| `needsDiagnostic` | boolean | true until a DIAGNOSTIC assessment is SUBMITTED (proposed derivation) |
| `topics` | `TopicMastery[]` by `seq` | `{topicId, name, description, seq, prereqIds, p, n, band}`; **`band` must equal `masteryBand(p)`** (schema refine) |
| `weakTopics` | `{topicId, name, p, citations: Citation[] (max 3)}[]` | ❓ Q7: selection rule |
| `history` | `{topicId, at, before, after, source}[]` oldest first | no `topicName`, so join with `topics` |

Bands (`MASTERY_BANDS`): `p < 0.4` → `weak`, `0.4 ≤ p ≤ 0.7` → `developing`, `p > 0.7` → `strong`. A learner with no `Mastery` row for a topic should get the prior `p = 0.3, n = 0` (proposed; the DB default is 0.3).

`[mock]` (`mocks.mastery`, abbreviated):
```json
{ "learnerId": "demo-learner", "needsDiagnostic": false,
  "topics": [ { "topicId": "t-proc", "name": "Processes & CPU–I/O bursts", "description": "…", "seq": 0, "prereqIds": [], "p": 0.78, "n": 3, "band": "strong" },
              { "topicId": "t-sjf", "name": "SJF & SRTF", "description": "…", "seq": 3, "prereqIds": ["t-fcfs"], "p": 0.3, "n": 0, "band": "weak" } ],
  "weakTopics": [ { "topicId": "t-sjf", "name": "SJF & SRTF", "p": 0.3, "citations": [ "…sjfText (PDF p. 9)…" ] } ],
  "history": [ { "topicId": "t-rr", "at": "2026-10-14T09:10:12.000Z", "before": 0.42, "after": 0.47, "source": "CHAT" } ] }
```
Cold start `[mock]` (`mockStates.newLearnerMastery`): `needsDiagnostic: true`, every topic `p: 0.3, n: 0, band: "weak"`, `weakTopics: []`, `history: []`.
- **DB:** `Topic`, `Mastery`, `MasteryEvent`, `Assessment` (read); `Chunk` for weak-topic citations.

---

## 4. What the frontend can call today

| Endpoint | Callable now? |
|---|---|
| `GET /api/health` | ✅ yes |
| Everything else | ❌ No. Returns HTML 404. Use `@sc/schemas/mocks` |

## 5. Open decisions (both developers)

Questions Q3–Q5 and Q11 concern the client, quiz report and ingestion. They're in [INTEGRATION_AUDIT.md §8](INTEGRATION_AUDIT.md) along with this full list.

| # | Question | Proposal |
|---|---|---|
| Q1 | Success status codes | 200 for all JSON successes |
| Q2 | Upload size limit; how to enforce the 20-min video limit | Decide a byte cap (e.g. 500 MB). Measure duration server-side (parse the MP4 `mvhd` box) or trust the client (`<video>.duration`) |
| Q6 | Tutor: single-turn or include recent history? | Single-turn (matches ARCHITECTURE) |
| Q7 | `weakTopics` rule | `band === "weak"`, sorted by `p`, max 3 citations from the topic's chunks |
| Q8 | `MasteryEvent` granularity in a quiz | one event per attempt (ARCHITECTURE: "BKT update per answer"); mocks show one per topic |
| Q9 | Rebuild after learners have data | 409 unless `?force=1`; the UI warns |
| Q10 | Max `excerpt` length | 600 chars, truncated server-side with "…" |
| Q12 | `count` for DIAGNOSTIC/MOCK | ignored |
| Q13 | Error for unsupported type / too large upload | `bad_request` (400); the enum has no 413/415 codes |
| Q14 | `GET /api/quiz/[id]` after submit | allowed (read-only) |
| Q15 | Unknown `learnerId` | 404 `not_found` everywhere |
