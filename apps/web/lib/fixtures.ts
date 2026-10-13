// Demo fixtures for the six routes, parsed through `@sc/schemas` at module load.
//
// These are the only place the UI's shapes are declared. Every route reads from
// here instead of holding its own MOCK_* array, so a field rename in the
// contract breaks the build rather than drifting silently.
//
// `parse` (not `satisfies`) is deliberate: the contract encodes two invariants
// that TypeScript cannot express — a citation's locator must match its source
// type, and a material block must cite at least one chunk. Parsing surfaces a
// violation at runtime the moment this module is imported.

import {
  CitationSchema,
  LearnerSchema,
  MasteryViewSchema,
  QuizReportSchema,
  QuizSchema,
  SourceSchema,
  TutorMessageSchema,
  type Citation,
  type Learner,
  type MasteryView,
  type Quiz,
  type QuizReport,
  type Source,
  type TutorMessage,
} from "@sc/schemas";

/* -------------------------------------------------------------------------- */
/* Learners                                                                   */
/* -------------------------------------------------------------------------- */

export const learners: Learner[] = LearnerSchema.array().parse([
  { id: "learner-rhea", displayName: "Rhea Kapoor" },
  { id: "learner-dev", displayName: "Dev Anand" },
]);

export const activeLearnerId = "learner-rhea";

export const activeLearner: Learner =
  learners.find((learner) => learner.id === activeLearnerId) ?? learners[0];

/* -------------------------------------------------------------------------- */
/* Sources                                                                    */
/* -------------------------------------------------------------------------- */

export const sources: Source[] = SourceSchema.array().parse([
  {
    id: "src-ttp-ch7",
    type: "PDF",
    name: "Operating Systems: Three Easy Pieces — Ch. 7, Scheduling",
    status: "READY",
    error: null,
    chunkCount: 142,
    sizeBytes: 9646899,
    addedAt: "2026-10-11T09:14:00.000Z",
  },
  {
    id: "src-nptel-lec04",
    type: "VIDEO",
    name: "NPTEL Lecture 04 — CPU Scheduling Algorithms (18 min)",
    status: "READY",
    error: null,
    chunkCount: 96,
    sizeBytes: 186646528,
    addedAt: "2026-10-11T09:31:00.000Z",
  },
  {
    id: "src-deck06",
    type: "PPTX",
    name: "CS301 Deck 06 — Scheduling Queues and Priorities",
    status: "PROCESSING",
    error: null,
    chunkCount: 0,
    sizeBytes: 3984588,
    addedAt: "2026-10-13T18:02:00.000Z",
  },
]);

/* -------------------------------------------------------------------------- */
/* Citations                                                                  */
/* -------------------------------------------------------------------------- */

export const citations: Citation[] = CitationSchema.array().parse([
  {
    chunkId: "chunk-ttp-071-03",
    sourceId: "src-ttp-ch7",
    sourceType: "PDF",
    page: 71,
    excerpt:
      "The time quantum bounds how long a process may hold the CPU, not how long it is entitled to it. A process that finishes early gives the CPU back at once.",
  },
  {
    chunkId: "chunk-nptel-04-0402",
    sourceId: "src-nptel-lec04",
    sourceType: "VIDEO",
    tStart: 402,
    tEnd: 447,
    excerpt:
      "Worked example: four processes rotate through the ready queue while the quantum stays fixed, so the queue order decides who runs next.",
  },
  {
    chunkId: "chunk-deck-06-014",
    sourceId: "src-deck06",
    sourceType: "PPTX",
    slide: 14,
    excerpt:
      "Convoy effect: one long CPU-bound process at the head of the queue keeps every short process waiting, inflating mean waiting time.",
  },
  {
    chunkId: "chunk-ttp-071-07",
    sourceId: "src-ttp-ch7",
    sourceType: "PDF",
    page: 71,
    excerpt:
      "Waiting time is the time a process spends in the ready queue. It is not burst time, and under SJF it is the sum of the bursts that ran before it.",
  },
  {
    chunkId: "chunk-deck-06-009",
    sourceId: "src-deck06",
    sourceType: "PPTX",
    slide: 9,
    excerpt:
      "Scheduling criteria: CPU utilisation, throughput, turnaround time, waiting time and response time — each measured over the same set of processes.",
  },
]);

/** Stable handles for the citations the fixtures reference by position. */
export const citationByChunkId = new Map(
  citations.map((citation) => [citation.chunkId, citation]),
);

/* -------------------------------------------------------------------------- */
/* Tutor transcript                                                           */
/* -------------------------------------------------------------------------- */

export const tutorThread: TutorMessage[] = TutorMessageSchema.array().parse([
  {
    id: "msg-01",
    role: "learner",
    text: "Round Robin is supposed to favour short jobs, but a small quantum still made the long job finish last in the lecture example. Why?",
  },
  {
    id: "msg-02",
    role: "assistant",
    coverage: "supported",
    refused: false,
    blocks: [
      {
        text: "The quantum is a ceiling on how long a process may hold the CPU, not a promise about how much it gets. A process that finishes inside its quantum returns the CPU immediately, so short jobs leave the ready queue early.",
        origin: "material",
        citations: [citationByChunkId.get("chunk-ttp-071-03")!],
      },
      {
        text: "When the quantum is small, the cost of switching between processes grows relative to the work being done. That overhead lands on every process, so the long job's total time inflates along with everyone else's.",
        origin: "material",
        citations: [citationByChunkId.get("chunk-nptel-04-0402")!],
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
    role: "learner",
    text: "So what does the lecture actually measure to decide a policy is better?",
  },
  {
    id: "msg-04",
    role: "assistant",
    coverage: "partial",
    refused: false,
    blocks: [
      {
        text: "The deck lists CPU utilisation, throughput, turnaround time, waiting time and response time, all computed over the same set of processes so the comparison is fair. Waiting time is the one the worked examples use most.",
        origin: "material",
        citations: [
          citationByChunkId.get("chunk-deck-06-009")!,
          citationByChunkId.get("chunk-ttp-071-07")!,
        ],
      },
    ],
  },
]);

/* -------------------------------------------------------------------------- */
/* Mastery                                                                    */
/* -------------------------------------------------------------------------- */

export const mastery: MasteryView = MasteryViewSchema.parse({
  topics: [
    {
      id: "t-process-model",
      name: "Process Model and States",
      p: 0.88,
      n: 7,
      prereqIds: [],
    },
    {
      id: "t-criteria",
      name: "Scheduling Criteria",
      p: 0.74,
      n: 5,
      prereqIds: ["t-process-model"],
    },
    {
      id: "t-fcfs",
      name: "First-Come, First-Served",
      p: 0.69,
      n: 4,
      prereqIds: ["t-criteria"],
    },
    {
      id: "t-sjf",
      name: "Shortest Job First",
      p: 0.41,
      n: 6,
      prereqIds: ["t-criteria"],
    },
    {
      id: "t-rr",
      name: "Round Robin",
      p: 0.33,
      n: 5,
      prereqIds: ["t-criteria", "t-sjf"],
    },
    {
      id: "t-mlfq",
      name: "Priority and Multi-Level Feedback",
      p: 0.22,
      n: 3,
      prereqIds: ["t-rr"],
    },
  ],
  history: [
    {
      topicId: "t-sjf",
      at: "2026-10-11T10:05:00.000Z",
      p: 0.3,
      source: "QUIZ",
    },
    {
      topicId: "t-rr",
      at: "2026-10-11T10:05:00.000Z",
      p: 0.3,
      source: "QUIZ",
    },
    {
      topicId: "t-sjf",
      at: "2026-10-12T16:40:00.000Z",
      p: 0.36,
      source: "CHAT",
    },
    {
      topicId: "t-rr",
      at: "2026-10-12T16:41:00.000Z",
      p: 0.31,
      source: "CHAT",
    },
    {
      topicId: "t-sjf",
      at: "2026-10-13T18:20:00.000Z",
      p: 0.41,
      source: "QUIZ",
    },
    {
      topicId: "t-rr",
      at: "2026-10-13T18:21:00.000Z",
      p: 0.33,
      source: "QUIZ",
    },
  ],
});

/* -------------------------------------------------------------------------- */
/* Quiz                                                                       */
/* -------------------------------------------------------------------------- */

export const diagnosticQuiz: Quiz = QuizSchema.parse({
  assessmentId: "asmnt-diagnostic-01",
  kind: "DIAGNOSTIC",
  questions: [
    {
      id: "q-rr-quantum",
      topicId: "t-rr",
      type: "MCQ",
      difficulty: 1,
      stem: "In Round Robin scheduling a process finishes its CPU burst before the time quantum expires. What does the scheduler do next?",
      options: [
        "Let it keep the CPU until the quantum expires",
        "Move it to the tail of the ready queue and wait for its next turn",
        "Release the CPU and dispatch the next ready process",
        "Raise its priority so it can continue immediately",
      ],
    },
    {
      id: "q-sjf-mean-wait",
      topicId: "t-sjf",
      type: "NUMERIC",
      difficulty: 2,
      stem: "Five processes arrive at time 0 with CPU bursts of 8, 4, 9, 5 and 2 ms. Under Shortest Job First, what is the mean waiting time in milliseconds?",
      numericTolerance: 0.01,
    },
    {
      id: "q-fcfs-convoy",
      topicId: "t-fcfs",
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
  perTopic: [
    {
      topicId: "t-fcfs",
      name: "First-Come, First-Served",
      correct: 1,
      total: 1,
      masteryBefore: 0.69,
      masteryAfter: 0.78,
    },
    {
      topicId: "t-sjf",
      name: "Shortest Job First",
      correct: 0,
      total: 1,
      masteryBefore: 0.41,
      masteryAfter: 0.3,
    },
    {
      topicId: "t-rr",
      name: "Round Robin",
      correct: 1,
      total: 1,
      masteryBefore: 0.33,
      masteryAfter: 0.47,
    },
  ],
  misconceptions: [
    {
      label: "Sums burst times instead of waiting times when computing the mean",
      topicId: "t-sjf",
      count: 1,
    },
  ],
  revisit: [
    citationByChunkId.get("chunk-ttp-071-07")!,
    citationByChunkId.get("chunk-deck-06-009")!,
  ],
  attempts: [
    {
      questionId: "q-rr-quantum",
      response: "Release the CPU and dispatch the next ready process",
      correct: true,
      feedback: {
        text: "Correct. The quantum is an upper bound on how long a process may hold the CPU, so a short burst returns the CPU before the quantum expires.",
        citations: [citationByChunkId.get("chunk-ttp-071-03")!],
      },
      misconception: null,
    },
    {
      questionId: "q-sjf-mean-wait",
      response: "10.5",
      correct: false,
      feedback: {
        text: "Not quite. Waiting time is time spent in the ready queue, so it is the sum of the bursts that ran earlier — not the sum of all burst times divided by the process count.",
        citations: [citationByChunkId.get("chunk-ttp-071-07")!],
      },
      misconception:
        "Sums burst times instead of waiting times when computing the mean",
    },
    {
      questionId: "q-fcfs-convoy",
      response:
        "A long process at the head of the queue holds the CPU until it finishes, so every short process behind it waits. Round Robin bounds that wait by preempting the long process at the end of each quantum.",
      correct: true,
      feedback: {
        text: "Correct, and you named a policy that removes the delay. Round Robin preempts at the end of each quantum, so the long process no longer blocks the queue.",
        citations: [
          citationByChunkId.get("chunk-deck-06-014")!,
          citationByChunkId.get("chunk-ttp-071-03")!,
        ],
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

