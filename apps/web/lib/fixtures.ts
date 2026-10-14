// Demo fixtures for the six routes, parsed through `@sc/schemas` at module load.
//
// These are the only place the UI's demo data lives. Every route reads from
// here instead of holding its own MOCK_* array, so a field rename in the
// contract breaks the build rather than drifting silently.
//
// The shapes are the real API contract (the same schemas `/api/*` responses are
// validated against), so swapping a fixture for an `@sc/client` call later is a
// data-source change, not a reshaping job.
//
// `parse` (not `satisfies`) is deliberate: the contract encodes invariants
// that TypeScript cannot express (e.g. a material block must cite at least one
// chunk, a mastery band must match its probability). Parsing surfaces a
// violation at runtime the moment this module is imported.

import {
  Citation as CitationSchema,
  ChatMessageView as ChatMessageViewSchema,
  Learner as LearnerSchema,
  MasteryView as MasteryViewSchema,
  Quiz as QuizSchema,
  QuizReport as QuizReportSchema,
  SourceView as SourceViewSchema,
  masteryBand,
  type ChatMessageView,
  type Citation,
  type Learner,
  type MasteryView,
  type Quiz,
  type QuizReport,
  type SourceView,
} from "@sc/schemas";

/* -------------------------------------------------------------------------- */
/* Learners                                                                   */
/* -------------------------------------------------------------------------- */

export const learners: Learner[] = LearnerSchema.array().parse([
  { id: "learner-rhea", name: "Rhea Kapoor", createdAt: "2026-10-11T09:00:00.000Z" },
  { id: "learner-dev", name: "Dev Anand", createdAt: "2026-10-11T09:05:00.000Z" },
]);

export const activeLearnerId = "learner-rhea";

export const activeLearner: Learner =
  learners.find((learner) => learner.id === activeLearnerId) ?? learners[0];

/* -------------------------------------------------------------------------- */
/* Sources                                                                    */
/* -------------------------------------------------------------------------- */

export const sources: SourceView[] = SourceViewSchema.array().parse([
  {
    id: "src-ttp-ch7",
    type: "PDF",
    filename: "Operating Systems: Three Easy Pieces, Ch. 7, Scheduling",
    status: "READY",
    error: null,
    progressDone: 24,
    progressTotal: 24,
    chunkCount: 142,
    createdAt: "2026-10-11T09:14:00.000Z",
  },
  {
    id: "src-nptel-lec04",
    type: "VIDEO",
    filename: "NPTEL Lecture 04: CPU Scheduling Algorithms (18 min)",
    status: "READY",
    error: null,
    progressDone: 19,
    progressTotal: 19,
    chunkCount: 96,
    createdAt: "2026-10-11T09:31:00.000Z",
  },
  {
    id: "src-deck06",
    type: "PPTX",
    filename: "CS301 Deck 06: Scheduling Queues and Priorities",
    status: "PROCESSING",
    error: null,
    // Part-way through ingestion. Non-zero on purpose: this deck's slides are
    // already cited elsewhere in the fixtures, and a source that reports zero
    // chunks while being cited would be a contradiction on screen.
    progressDone: 3,
    progressTotal: 6,
    chunkCount: 12,
    createdAt: "2026-10-13T18:02:00.000Z",
  },
]);

/* -------------------------------------------------------------------------- */
/* Citations                                                                  */
/* -------------------------------------------------------------------------- */

const filenameOf = (sourceId: string) => sources.find((source) => source.id === sourceId)?.filename ?? sourceId;

export const citations: Citation[] = CitationSchema.array().parse([
  {
    chunkId: "chunk-ttp-071-03",
    sourceId: "src-ttp-ch7",
    filename: filenameOf("src-ttp-ch7"),
    kind: "TEXT",
    title: "Round Robin",
    sourceType: "PDF",
    page: 71,
    excerpt:
      "The time quantum bounds how long a process may hold the CPU, not how long it is entitled to it. A process that finishes early gives the CPU back at once.",
  },
  {
    chunkId: "chunk-nptel-04-0402",
    sourceId: "src-nptel-lec04",
    filename: filenameOf("src-nptel-lec04"),
    kind: "TRANSCRIPT",
    title: "Round Robin worked example",
    sourceType: "VIDEO",
    tStart: 402,
    tEnd: 447,
    excerpt:
      "Worked example: four processes rotate through the ready queue while the quantum stays fixed, so the queue order decides who runs next.",
  },
  {
    chunkId: "chunk-deck-06-014",
    sourceId: "src-deck06",
    filename: filenameOf("src-deck06"),
    kind: "SLIDE",
    title: "Convoy effect",
    sourceType: "PPTX",
    slide: 14,
    excerpt:
      "Convoy effect: one long CPU-bound process at the head of the queue keeps every short process waiting, inflating mean waiting time.",
  },
  {
    chunkId: "chunk-ttp-071-07",
    sourceId: "src-ttp-ch7",
    filename: filenameOf("src-ttp-ch7"),
    kind: "TEXT",
    title: "Waiting time",
    sourceType: "PDF",
    page: 71,
    excerpt:
      "Waiting time is the time a process spends in the ready queue. It is not burst time, and under SJF it is the sum of the bursts that ran before it.",
  },
  {
    chunkId: "chunk-deck-06-009",
    sourceId: "src-deck06",
    filename: filenameOf("src-deck06"),
    kind: "SLIDE",
    title: "Scheduling criteria",
    sourceType: "PPTX",
    slide: 9,
    excerpt:
      "Scheduling criteria: CPU utilisation, throughput, turnaround time, waiting time and response time, each measured over the same set of processes.",
  },
]);

/** Stable handles for the citations the fixtures reference by position. */
export const citationByChunkId = new Map(
  citations.map((citation) => [citation.chunkId, citation]),
);
const cite = (chunkId: string) => citationByChunkId.get(chunkId)!;

/* -------------------------------------------------------------------------- */
/* Tutor transcript (GET /api/chat history shape)                             */
/* -------------------------------------------------------------------------- */

export const tutorThread: ChatMessageView[] = ChatMessageViewSchema.array().parse([
  {
    id: "msg-01",
    role: "USER",
    content: "Round Robin is supposed to favour short jobs, but a small quantum still made the long job finish last in the lecture example. Why?",
    blocks: null,
    coverage: null,
    refused: false,
    createdAt: "2026-10-12T16:38:00.000Z",
  },
  {
    id: "msg-02",
    role: "ASSISTANT",
    content: "",
    coverage: "SUPPORTED",
    refused: false,
    createdAt: "2026-10-12T16:38:05.000Z",
    blocks: [
      {
        text: "The quantum is a ceiling on how long a process may hold the CPU, not a promise about how much it gets. A process that finishes inside its quantum returns the CPU immediately, so short jobs leave the ready queue early.",
        origin: "material",
        citations: [cite("chunk-ttp-071-03")],
      },
      {
        text: "When the quantum is small, the cost of switching between processes grows relative to the work being done. That overhead lands on every process, so the long job's total time inflates along with everyone else's.",
        origin: "material",
        citations: [cite("chunk-nptel-04-0402")],
      },
      {
        text: "For comparison: real general-purpose kernels no longer use a fixed Round Robin quantum. Linux schedules with a weighted fair-share model (CFS) where the time slice scales with a process's weight and priority rather than being constant.",
        origin: "outside",
        citations: [],
      },
    ],
  },
  {
    id: "msg-03",
    role: "USER",
    content: "So what does the lecture actually measure to decide a policy is better?",
    blocks: null,
    coverage: null,
    refused: false,
    createdAt: "2026-10-12T16:40:00.000Z",
  },
  {
    id: "msg-04",
    role: "ASSISTANT",
    content: "",
    coverage: "PARTIAL",
    refused: false,
    createdAt: "2026-10-12T16:40:04.000Z",
    blocks: [
      {
        text: "The deck lists CPU utilisation, throughput, turnaround time, waiting time and response time, all computed over the same set of processes so the comparison is fair. Waiting time is the one the worked examples use most.",
        origin: "material",
        citations: [cite("chunk-deck-06-009"), cite("chunk-ttp-071-07")],
      },
    ],
  },
]);

/* -------------------------------------------------------------------------- */
/* Mastery                                                                    */
/* -------------------------------------------------------------------------- */

const topic = (seq: number, topicId: string, name: string, description: string, p: number, n: number, prereqIds: string[]) => ({
  topicId, name, description, seq, prereqIds, p, n, band: masteryBand(p),
});

export const mastery: MasteryView = MasteryViewSchema.parse({
  learnerId: activeLearnerId,
  needsDiagnostic: false,
  topics: [
    topic(1, "t-process-model", "Process Model and States", "Process states and the transitions between them.", 0.88, 7, []),
    topic(2, "t-criteria", "Scheduling Criteria", "Utilisation, throughput, turnaround, waiting and response time.", 0.74, 5, ["t-process-model"]),
    topic(3, "t-fcfs", "First-Come, First-Served", "Non-preemptive FCFS and the convoy effect.", 0.69, 4, ["t-criteria"]),
    topic(4, "t-sjf", "Shortest Job First", "SJF and its preemptive variant SRTF.", 0.41, 6, ["t-criteria"]),
    topic(5, "t-rr", "Round Robin", "Time-sliced scheduling and choosing the quantum.", 0.33, 5, ["t-criteria", "t-sjf"]),
    topic(6, "t-mlfq", "Priority and Multi-Level Feedback", "Priority scheduling and multi-level feedback queues.", 0.22, 3, ["t-rr"]),
  ],
  weakTopics: [
    { topicId: "t-mlfq", name: "Priority and Multi-Level Feedback", p: 0.22, citations: [cite("chunk-deck-06-014")] },
    { topicId: "t-rr", name: "Round Robin", p: 0.33, citations: [cite("chunk-ttp-071-03"), cite("chunk-nptel-04-0402")] },
  ],
  history: [
    { topicId: "t-sjf", at: "2026-10-11T10:05:00.000Z", before: 0.3, after: 0.3, source: "QUIZ" },
    { topicId: "t-rr", at: "2026-10-11T10:05:00.000Z", before: 0.3, after: 0.3, source: "QUIZ" },
    { topicId: "t-sjf", at: "2026-10-12T16:40:00.000Z", before: 0.3, after: 0.36, source: "CHAT" },
    { topicId: "t-rr", at: "2026-10-12T16:41:00.000Z", before: 0.3, after: 0.31, source: "CHAT" },
    { topicId: "t-sjf", at: "2026-10-13T18:20:00.000Z", before: 0.36, after: 0.41, source: "QUIZ" },
    { topicId: "t-rr", at: "2026-10-13T18:21:00.000Z", before: 0.31, after: 0.33, source: "QUIZ" },
  ],
});

/* -------------------------------------------------------------------------- */
/* Quiz                                                                       */
/* -------------------------------------------------------------------------- */

const RR_OPTIONS = [
  "Let it keep the CPU until the quantum expires",
  "Move it to the tail of the ready queue and wait for its next turn",
  "Release the CPU and dispatch the next ready process",
  "Raise its priority so it can continue immediately",
];

export const diagnosticQuiz: Quiz = QuizSchema.parse({
  assessmentId: "asmnt-diagnostic-01",
  kind: "DIAGNOSTIC",
  createdAt: "2026-10-13T18:10:00.000Z",
  questions: [
    {
      id: "q-rr-quantum",
      position: 0,
      topicId: "t-rr",
      topicName: "Round Robin",
      type: "MCQ",
      difficulty: 1,
      stem: "In Round Robin scheduling a process finishes its CPU burst before the time quantum expires. What does the scheduler do next?",
      options: RR_OPTIONS,
    },
    {
      id: "q-sjf-mean-wait",
      position: 1,
      topicId: "t-sjf",
      topicName: "Shortest Job First",
      type: "NUMERIC",
      difficulty: 2,
      stem: "Five processes arrive at time 0 with CPU bursts of 8, 4, 9, 5 and 2 ms. Under Shortest Job First, what is the mean waiting time in milliseconds?",
      unit: "ms",
    },
    {
      id: "q-fcfs-convoy",
      position: 2,
      topicId: "t-fcfs",
      topicName: "First-Come, First-Served",
      type: "SHORT",
      difficulty: 2,
      stem: "FCFS is non-preemptive. Explain how one long CPU-bound process can delay every process behind it, and name one policy that removes that delay.",
    },
  ],
});

/* -------------------------------------------------------------------------- */
/* Quiz report                                                                */
/* -------------------------------------------------------------------------- */

export const diagnosticReport: QuizReport = QuizReportSchema.parse({
  assessmentId: diagnosticQuiz.assessmentId,
  kind: "DIAGNOSTIC",
  submittedAt: "2026-10-13T18:20:00.000Z",
  score: { correct: 2, total: 3 },
  perTopic: [
    { topicId: "t-fcfs", topicName: "First-Come, First-Served", correct: 1, total: 1, masteryBefore: 0.69, masteryAfter: 0.78 },
    { topicId: "t-sjf", topicName: "Shortest Job First", correct: 0, total: 1, masteryBefore: 0.41, masteryAfter: 0.3 },
    { topicId: "t-rr", topicName: "Round Robin", correct: 1, total: 1, masteryBefore: 0.33, masteryAfter: 0.47 },
  ],
  misconceptions: [
    {
      label: "Sums burst times instead of waiting times when computing the mean",
      topicId: "t-sjf",
      topicName: "Shortest Job First",
      count: 1,
    },
  ],
  revisit: [cite("chunk-ttp-071-07"), cite("chunk-deck-06-009")],
  attempts: [
    {
      questionId: "q-rr-quantum",
      position: 0,
      topicId: "t-rr",
      type: "MCQ",
      stem: diagnosticQuiz.questions[0].stem,
      options: RR_OPTIONS,
      response: { type: "MCQ", index: 2 },
      correct: true,
      score: 1,
      correctAnswer: RR_OPTIONS[2],
      feedback: {
        text: "Correct. The quantum is an upper bound on how long a process may hold the CPU, so a short burst returns the CPU before the quantum expires.",
        citations: [cite("chunk-ttp-071-03")],
      },
      misconception: null,
    },
    {
      questionId: "q-sjf-mean-wait",
      position: 1,
      topicId: "t-sjf",
      type: "NUMERIC",
      stem: diagnosticQuiz.questions[1].stem,
      options: null,
      response: { type: "NUMERIC", value: 10.5 },
      correct: false,
      score: 0,
      correctAnswer: "7.6 ms", // SJF order 2,4,5,8,9 → waits 0,2,6,11,19 → 38/5
      feedback: {
        text: "Not quite. Waiting time is time spent in the ready queue, so it is the sum of the bursts that ran earlier, not the sum of all burst times divided by the process count.",
        citations: [cite("chunk-ttp-071-07")],
      },
      misconception: "Sums burst times instead of waiting times when computing the mean",
    },
    {
      questionId: "q-fcfs-convoy",
      position: 2,
      topicId: "t-fcfs",
      type: "SHORT",
      stem: diagnosticQuiz.questions[2].stem,
      options: null,
      response: {
        type: "SHORT",
        text: "A long process at the head of the queue holds the CPU until it finishes, so every short process behind it waits. Round Robin bounds that wait by preempting the long process at the end of each quantum.",
      },
      correct: true,
      score: 1,
      correctAnswer: "The long job holds the CPU until it finishes (convoy effect); Round Robin or SJF removes the delay.",
      feedback: {
        text: "Correct, and you named a policy that removes the delay. Round Robin preempts at the end of each quantum, so the long process no longer blocks the queue.",
        citations: [cite("chunk-deck-06-014"), cite("chunk-ttp-071-03")],
      },
      misconception: null,
    },
  ],
});

/* -------------------------------------------------------------------------- */
/* Aggregate                                                                  */
/* -------------------------------------------------------------------------- */

export const fixtures = {
  learners,
  activeLearner,
  sources,
  citations,
  tutorThread,
  mastery,
  diagnosticQuiz,
  diagnosticReport,
} as const;
