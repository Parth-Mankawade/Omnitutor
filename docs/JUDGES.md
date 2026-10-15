# Omnitutor: guide for judges

**Track D: Personalized Tutoring & Adaptive Learning.** Omnitutor turns a student's own lecture video, textbook PDF and slide deck into a tutor. It answers only from that material, cites the exact page, slide or second, declines what the material doesn't cover, and adapts quizzes and explanations to a per-topic model of what the student knows.

- **Run it:** [README → Setup and run](../README.md#setup-and-run): Node 20.12+, Docker (Postgres only) and a free Gemini API key.
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md) (as built; §0 lists every deviation from the original plan) · [index.html](index.html) (interactive diagram).
- **Evidence:** [PROGRESS.md](PROGRESS.md) records every module's real-data test run, with the numbers.

---

## 1. A 10-minute tour

Bring any lecture PDF, `.pptx` deck and `.mp4` video (up to 20 min). Our evaluation files are third-party course material, so they aren't redistributed (see [data/demo/README.md](../data/demo/README.md)).

1. **Sign up** (header) → **onboarding**: four questions (tutor personality, how you learn, your level, your goal). They shape every tutor answer; the personality also sets the model's sampling temperature.
2. **Sources:** upload the three files. Processing starts at once; when all three are Ready, click **Build topics**. You get 5–8 topics with prerequisites and cited concepts.
3. **Map:** a radial mind map of topics, concepts and prerequisites, coloured by your mastery.
4. **Quiz → Take the diagnostic:** one question per topic, to calibrate the learner model. Then try a **custom quiz** on topics you choose: MCQ, numerical and short answer, each tagged with topic, source and difficulty. Get one wrong on purpose and open the **report**: per-topic score, mastery change, the likely misconception, and cited places to revisit.
5. **Tutor:**
   - Ask something your material covers, then click a citation chip. The PDF opens at the page, the slide is shown, or the video jumps to the second.
   - Notice the dashed **"Outside your material"** blocks: the tutor's own analogies and examples, kept separate from what your sources say.
   - Ask something unrelated (e.g. "Who won the 2018 FIFA World Cup?"). It is declined.
6. **Dashboard:** mastery per topic (updated by quizzes, tutor chats and flashcards), weak topics with revise links, mastery history. **Flashcards:** generated per topic, verified by a second model, cited, scheduled with Leitner boxes.
7. **Privacy:** open the notebook menu in the header and create a second notebook. It's empty: files, chats, quizzes and mastery are per notebook and per account, enforced on the server.
8. **Evaluation page:** the measured metrics below, read from the committed reports in `data/eval/`.

## 2. Track D requirements → where they are → evidence

| Requirement | Implementation | Evidence (real data, real Gemini) |
|---|---|---|
| **Multimodal KB** with no manual preprocessing; units linked to page / slide / timestamp; figures used | `packages/core/src/ingest/pdf.ts` (one call per page image + text; figures become their own chunks), `pptx.ts` (exact XML text + picture descriptions, 5 slides per call), `video.ts` (≤60 s windows with true offsets) | Facts recovered: PDF 47/47 · PPTX 21/21 and 15/15 · video 12/12 at the true time (mean error 0.3 s). Unchanged code on an unseen real PDF: 21/21 |
| **Topics, concepts, prerequisites** | `build.ts` (one call → topics + prerequisite links; chunks tagged to the nearest topic by embedding; concepts from ingestion labels) | 6 topics with prerequisites on the demo course; 79% of sampled chunks tagged to the expected topic |
| **Grounding:** cited excerpts that open the source; decline off-material; separate outside knowledge | `tutor.ts` (`answerCore`, `groundAnswer`: unretrieved citations dropped, uncited "material" relabelled outside, `NOT_COVERED` or below `REFUSAL_TAU` → declined); `components/citation-viewer.tsx`; `/api/files/[id]` with HTTP Range | Citation accuracy **1.00** (37/37); off-material **17/21 declined**, the other 4 flagged *partly covered*; **0/37** answerable questions wrongly declined |
| **Assessment:** MCQ / short / numerical on chosen scope; tagged; verified; no repeats; cited feedback; report | `quiz.ts` (generate → code checks → **blind verification by a different model**, numeric compared in code ±1%; stem hashes block repeats), `grading.ts` (MCQ/numeric graded in code, short answers in one batched call with an alignment check) | Quiz acceptance checks 16/16; the verifier rejected 6 of 30 mock-exam candidates; short-answer grading 12/12 correct verdicts |
| **Learner model:** per-topic mastery after every quiz and conversation; cold start | `bkt.ts` (BKT: prior 0.3, learn 0.15, slip 0.1, guess MCQ 0.25 / short 0.1 / numeric 0.05; chat and flashcard evidence at weight 0.3), diagnostic quiz, `mastery.ts` | Simulated students: adaptive vs random mastery gain **0.39 vs 0.35** overall (novice 0.73 vs 0.64), lower estimation error in all 4 profiles |
| **Evaluation:** RAGAS-style metrics on a team test set incl. off-material; simulated students with mastery gain and repetition | `tools/e2e/src/eval-rag.ts` (RAGAS metric definitions, judged by a **different** Gemini model), `tools/e2e/src/sim-students.ts`; reports in `data/eval/`; `/evaluation` page | 58 questions (37 answerable, 21 off-material): faithfulness **0.95**, answer relevancy 0.85, context precision 0.92, context recall 0.94. Repetition **0%** adaptive vs 30% random |
| **Optional extras** | Course map (`/map`) · revision flashcards with spaced repetition (`/flashcards`) · the tutor answers in the language the student writes in (prompt rule) | Hindi/Hinglish has no UI toggle; no audio or study calendar |

## 3. Personalisation (beyond mastery numbers)
- **Onboarding profile** (`profile.ts`): tone (friendly, funny, serious, concise → temperature 0.45 / 0.8 / 0.15 / 0.2), explanation style (step by step, examples first, big picture), level and goal. All four go into every tutor prompt.
- **Mastery-aware teaching:** the tutor sees the student's mastery per topic; weak topics are taught from the basics, and weak prerequisites are named.
- **Adaptive practice:** quiz topics are weighted toward weakness, difficulty follows the mastery band, questions never repeat, and the home page suggests the next step.
- **Persistent, private history:** chat history, quizzes and mastery are saved per notebook and per account.

## 4. Engineering notes
- **One process, one database:** Next.js 16 (pages + thin API routes) and Postgres via Prisma. Every request and response is validated against one Zod contract (`packages/schemas`), shared by the server, the typed client and the tests.
- **One gateway to the model:** `packages/core/src/llm.ts` is the only file that calls Gemini. It handles rate limiting, a deterministic disk cache (re-ingesting a file is free), a usage ledger, multi-key rotation, a fallback model and timeouts.
- **Tests:** unit and DB tests (`npm run test`), end-to-end API tests against a running server (`npm run test:e2e`), a real-browser flow, and pre-registered checks on real course files (`tools/e2e`, results in [PROGRESS.md](PROGRESS.md)).

## 5. Honest limitations
See [README → Honest limitations](../README.md#honest-limitations). In short:
- Accounts are basic (no email verification or password reset).
- Retrieval is dense-only.
- Diagrams drawn with PowerPoint shapes lose their layout.
- The RAG metrics use a Gemini judge, not the `ragas` package.
- The test set is small and team-built, and the simulator is a model, not real students.

## 6. Documentation map
| Doc | What it is |
|---|---|
| [README.md](../README.md) | Setup, run, features, evaluation, limitations |
| [ARCHITECTURE.md](ARCHITECTURE.md) | The system as built (data model, pipelines, decisions) |
| [API_SPEC.md](API_SPEC.md) · [postman/](postman/) | HTTP API contract, plus a Postman collection |
| [INGESTION_SPEC.md](INGESTION_SPEC.md) | How PDF, PPTX and video become cited chunks |
| [PROGRESS.md](PROGRESS.md) | Build log: every module's tests and real-data results |
| [index.html](index.html) | Interactive architecture diagram |
| [SUBMISSION.md](SUBMISSION.md) | Devpost text and submission checklist |
| [INTEGRATION_AUDIT.md](INTEGRATION_AUDIT.md) · [TEAMMATE_BRIEF.md](TEAMMATE_BRIEF.md) | Process records from the build |
| `product-requirements.md`, `system-architecture.md`, `technical-design.md`, `database-and-rag.md`, `api-contracts.md`, `evaluation.md`, `security-privacy.md`, `development-deployment.md`, `delivery-plan.md`, `glossary-and-decisions.md` | Early design proposals, kept for history; each starts with a banner saying it is **not** the implemented system |
