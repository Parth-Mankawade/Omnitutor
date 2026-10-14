// Shared Zod contract. This is the single source of truth for every shape that
// crosses the boundary between `@sc/core`, the `/api/*` routes and the UI.
// See docs/ARCHITECTURE.md §7 (shared contract) and §8 (API surface).
//
// Two invariants are encoded here rather than left to callers, because the
// product's promise depends on them:
//
//  1. Provenance. A citation carries exactly one locator, and the locator kind
//     is determined by the source type: PDF -> page, PPTX -> slide,
//     VIDEO -> tStart/tEnd. See docs/ARCHITECTURE.md §5, "Citation invariant".
//  2. Grounding. A `material` block must cite at least one chunk, and an
//     `outside` block must cite none; blocks and transcript turns are strict,
//     so an unexpected key is rejected rather than stripped. The tutor route's
//     server-side guards relabel an uncited material block as outside, so a
//     value that parses here is one the UI can render without a second trust
//     check.

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Enumerations                                                               */
/* -------------------------------------------------------------------------- */

export const SourceTypeSchema = z.enum(["PDF", "PPTX", "VIDEO"]);

/** `PENDING` before ingestion starts, `FAILED` carries an `error`. */
export const SourceStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "READY",
  "FAILED",
]);

/** How well the retrieved chunks support a tutor answer. */
export const CoverageSchema = z.enum([
  "supported",
  "partial",
  "not_covered",
]);

/** `material` is source-backed, `outside` is the model's own knowledge. */
export const BlockOriginSchema = z.enum(["material", "outside"]);

export const QuestionKindSchema = z.enum(["MCQ", "SHORT", "NUMERIC"]);

/** Difficulty band: 1 easy, 2 medium, 3 hard (see ARCHITECTURE.md §6.4). */
export const DifficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const AssessmentKindSchema = z.enum([
  "DIAGNOSTIC",
  "QUIZ",
  "MOCK",
]);

/** Which signal moved a learner's mastery. */
export const MasterySourceSchema = z.enum(["QUIZ", "CHAT"]);

export const ChatRoleSchema = z.enum(["learner", "assistant"]);

/** BKT probabilities live in [0, 1]. */
const ProbabilitySchema = z.number().min(0).max(1);

/* -------------------------------------------------------------------------- */
/* Citation                                                                   */
/* -------------------------------------------------------------------------- */

/** Which locator a source type is allowed to carry. */
export const LOCATOR_BY_SOURCE_TYPE = {
  PDF: "page",
  PPTX: "slide",
  VIDEO: "tStart",
} as const;

export type LocatorField = (typeof LOCATOR_BY_SOURCE_TYPE)[SourceType];

export const CitationSchema = z
  .object({
    chunkId: z.string().min(1),
    sourceId: z.string().min(1),
    sourceType: SourceTypeSchema,
    /** 1-based PDF page. */
    page: z.number().int().positive().optional(),
    /** 1-based slide number, in presentation order. */
    slide: z.number().int().positive().optional(),
    /** Seconds into the lecture video. */
    tStart: z.number().nonnegative().optional(),
    tEnd: z.number().nonnegative().optional(),
    excerpt: z.string().min(1),
  })
  .superRefine((citation, ctx) => {
    const locators = (
      ["page", "slide", "tStart"] as const
    ).filter((field) => citation[field] !== undefined);

    if (locators.length !== 1) {
      ctx.addIssue({
        code: "custom",
        message: `expected exactly one locator (page, slide or tStart), received ${locators.length}`,
        path: ["page"],
      });
      return;
    }

    const present = locators[0];
    const expected = LOCATOR_BY_SOURCE_TYPE[citation.sourceType];
    if (present !== expected) {
      ctx.addIssue({
        code: "custom",
        message: `${citation.sourceType} citations locate by "${expected}", received "${present}"`,
        path: [present],
      });
    }

    if (
      citation.tStart !== undefined &&
      citation.tEnd !== undefined &&
      citation.tEnd < citation.tStart
    ) {
      ctx.addIssue({
        code: "custom",
        message: `tEnd (${citation.tEnd}s) precedes tStart (${citation.tStart}s)`,
        path: ["tEnd"],
      });
    }
  });

/* -------------------------------------------------------------------------- */
/* Sources                                                                    */
/* -------------------------------------------------------------------------- */

export const SourceSchema = z.object({
  id: z.string().min(1),
  type: SourceTypeSchema,
  name: z.string().min(1),
  status: SourceStatusSchema,
  /** Populated only when `status` is `FAILED`. */
  error: z.string().min(1).nullable(),
  chunkCount: z.number().int().nonnegative(),
  sizeBytes: z.number().int().positive(),
  addedAt: z.iso.datetime(),
});

/* -------------------------------------------------------------------------- */
/* Learner model                                                              */
/* -------------------------------------------------------------------------- */

export const LearnerSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
});

export const MasteryTopicSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Posterior probability the learner knows this topic. */
  p: ProbabilitySchema,
  /** Observations folded into `p`. */
  n: z.number().int().nonnegative(),
  prereqIds: z.array(z.string().min(1)),
});

export const MasteryPointSchema = z.object({
  topicId: z.string().min(1),
  at: z.iso.datetime(),
  p: ProbabilitySchema,
  source: MasterySourceSchema,
});

export const MasteryViewSchema = z.object({
  topics: z.array(MasteryTopicSchema),
  /** Oldest first, so the dashboard history chart can plot it directly. */
  history: z.array(MasteryPointSchema),
});

/* -------------------------------------------------------------------------- */
/* Quiz                                                                       */
/* -------------------------------------------------------------------------- */

export const QuizQuestionSchema = z
  .object({
    id: z.string().min(1),
    topicId: z.string().min(1),
    type: QuestionKindSchema,
    difficulty: DifficultySchema,
    stem: z.string().min(1),
    /** MCQ only. Deliberately no answer key: it is never sent to the client. */
    options: z.array(z.string().min(1)).min(2).optional(),
    /** NUMERIC only, as a fraction of the expected answer (1% by default). */
    numericTolerance: z.number().positive().optional(),
  })
  .superRefine((question, ctx) => {
    if (question.type === "MCQ" && question.options === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "an MCQ needs at least two options",
        path: ["options"],
      });
    }
    if (question.type !== "MCQ" && question.options !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: `${question.type} questions are answered as free text and carry no options`,
        path: ["options"],
      });
    }
  });

export const QuizSchema = z.object({
  assessmentId: z.string().min(1),
  kind: AssessmentKindSchema,
  questions: z.array(QuizQuestionSchema).min(1),
});

/* -------------------------------------------------------------------------- */
/* Attempts and report                                                        */
/* -------------------------------------------------------------------------- */

export const FeedbackSchema = z.object({
  text: z.string().min(1),
  citations: z.array(CitationSchema),
});

export const AttemptSchema = z.object({
  questionId: z.string().min(1),
  /** The learner's raw answer: an MCQ option, a numeric value, or prose. */
  response: z.string().min(1),
  correct: z.boolean(),
  feedback: FeedbackSchema,
  /** The misconception this wrong answer exposed, when one was identified. */
  misconception: z.string().min(1).nullable(),
});

export const TopicScoreSchema = z.object({
  topicId: z.string().min(1),
  name: z.string().min(1),
  correct: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  masteryBefore: ProbabilitySchema,
  masteryAfter: ProbabilitySchema,
});

export const MisconceptionSchema = z.object({
  label: z.string().min(1),
  topicId: z.string().min(1),
  count: z.number().int().positive(),
});

export const QuizReportSchema = z.object({
  assessmentId: z.string().min(1),
  perTopic: z.array(TopicScoreSchema),
  misconceptions: z.array(MisconceptionSchema),
  /** Chunks the learner should re-read, ordered by weakness. */
  revisit: z.array(CitationSchema),
  attempts: z.array(AttemptSchema),
});

/* -------------------------------------------------------------------------- */
/* Tutor                                                                      */
/* -------------------------------------------------------------------------- */

export const TutorBlockSchema = z
  .strictObject({
    text: z.string().min(1),
    origin: BlockOriginSchema,
    citations: z.array(CitationSchema),
  })
  .superRefine((block, ctx) => {
    if (block.origin === "material" && block.citations.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "a material block must cite at least one chunk; relabel it outside instead",
        path: ["citations"],
      });
    }
    if (block.origin === "outside" && block.citations.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "an outside block must not cite course material",
        path: ["citations"],
      });
    }
  });

/** The body returned by `POST /api/chat`, before it is stored as a message. */
export const TutorAnswerSchema = z.object({
  coverage: CoverageSchema,
  /** True when the route refused because nothing in the material covers it. */
  refused: z.boolean(),
  blocks: z.array(TutorBlockSchema).min(1),
});

/**
 * A stored turn in the transcript. Discriminated on `role` and strict, so a
 * learner turn cannot carry grounding fields and an assistant turn cannot omit
 * them: an unexpected key is rejected rather than quietly stripped.
 */
export const TutorMessageSchema = z.discriminatedUnion("role", [
  z.strictObject({
    id: z.string().min(1),
    role: z.literal("learner"),
    text: z.string().min(1),
  }),
  TutorAnswerSchema.extend({
    id: z.string().min(1),
    role: z.literal("assistant"),
  }).strict(),
]);

/* -------------------------------------------------------------------------- */
/* Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type SourceType = z.infer<typeof SourceTypeSchema>;
export type SourceStatus = z.infer<typeof SourceStatusSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
export type BlockOrigin = z.infer<typeof BlockOriginSchema>;
export type QuestionKind = z.infer<typeof QuestionKindSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type AssessmentKind = z.infer<typeof AssessmentKindSchema>;
export type MasterySource = z.infer<typeof MasterySourceSchema>;
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export type Citation = z.infer<typeof CitationSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Learner = z.infer<typeof LearnerSchema>;
export type MasteryTopic = z.infer<typeof MasteryTopicSchema>;
export type MasteryPoint = z.infer<typeof MasteryPointSchema>;
export type MasteryView = z.infer<typeof MasteryViewSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type Feedback = z.infer<typeof FeedbackSchema>;
export type Attempt = z.infer<typeof AttemptSchema>;
export type TopicScore = z.infer<typeof TopicScoreSchema>;
export type Misconception = z.infer<typeof MisconceptionSchema>;
export type QuizReport = z.infer<typeof QuizReportSchema>;
export type TutorBlock = z.infer<typeof TutorBlockSchema>;
export type TutorAnswer = z.infer<typeof TutorAnswerSchema>;
export type TutorMessage = z.infer<typeof TutorMessageSchema>;
