import { z } from "zod";
import { Count, Id, IsoDate, SourceStatus, SourceType } from "./common";

// ── Sources ──

/** Accepted upload MIME types per source type. */
export const ACCEPTED_UPLOADS: Record<SourceType, string[]> = {
  PDF: ["application/pdf"],
  PPTX: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  VIDEO: ["video/mp4"],
};
export const MAX_VIDEO_MINUTES = 20;

export const SourceView = z.object({
  id: Id,
  type: SourceType,
  filename: z.string(),
  status: SourceStatus,
  error: z.string().nullable(),
  progressDone: Count, // poll GET /api/sources until READY or FAILED
  progressTotal: Count,
  chunkCount: Count,
  createdAt: IsoDate,
});
export type SourceView = z.infer<typeof SourceView>;

/** POST /api/sources (multipart/form-data, field "file") */
export const UploadResponse = z.object({ id: Id, status: SourceStatus });
export type UploadResponse = z.infer<typeof UploadResponse>;

// ── Topics / course build ──

export const TopicView = z.object({
  id: Id,
  seq: Count, // display order, roughly prerequisite order
  name: z.string().min(1),
  description: z.string(),
  prereqIds: z.array(Id),
  chunkCount: Count,
});
export type TopicView = z.infer<typeof TopicView>;

export const BuildRequest = z.object({ courseId: Id.optional() });
export type BuildRequest = z.infer<typeof BuildRequest>;

export const BuildResponse = z.object({ topics: z.array(TopicView) });
export type BuildResponse = z.infer<typeof BuildResponse>;

// ── Learners (no auth; picker in the header) ──

export const Learner = z.object({ id: Id, name: z.string(), createdAt: IsoDate });
export type Learner = z.infer<typeof Learner>;

export const CreateLearnerRequest = z.object({ name: z.string().trim().min(1).max(60) });
export type CreateLearnerRequest = z.infer<typeof CreateLearnerRequest>;
