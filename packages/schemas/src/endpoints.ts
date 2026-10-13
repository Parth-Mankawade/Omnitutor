import { z } from "zod";
import { BuildRequest, BuildResponse, CreateLearnerRequest, Learner, SourceView, TopicView, UploadResponse } from "./course";
import { EvalAnswerRequest, EvalAnswerResponse } from "./eval";
import { MasteryView } from "./mastery";
import { CreateQuizRequest, Quiz, QuizReport, SubmitRequest } from "./quiz";
import { ChatMessageView, ChatRequest, TutorAnswer } from "./tutor";

type Endpoint = {
  method: "GET" | "POST";
  path: string;
  /** JSON body schema, a description for non-JSON input, or null (no body). */
  request: z.ZodType | string | null;
  response: z.ZodType;
  /** Backend module that makes it real (see docs/PROGRESS.md). Until then, use the mock. */
  module: number;
};

/**
 * Every JSON API route. Non-JSON route: GET /api/files/[id] serves the original
 * file (PDF/PPTX/MP4) with HTTP Range support (Module 4).
 */
export const endpoints = {
  listSources: { method: "GET", path: "/api/sources", request: null, response: z.array(SourceView), module: 4 },
  uploadSource: { method: "POST", path: "/api/sources", request: "multipart/form-data, field 'file'", response: UploadResponse, module: 4 },
  listLearners: { method: "GET", path: "/api/learners", request: null, response: z.array(Learner), module: 4 },
  createLearner: { method: "POST", path: "/api/learners", request: CreateLearnerRequest, response: Learner, module: 4 },
  buildCourse: { method: "POST", path: "/api/build", request: BuildRequest, response: BuildResponse, module: 9 },
  listTopics: { method: "GET", path: "/api/topics", request: null, response: z.array(TopicView), module: 9 },
  chat: { method: "POST", path: "/api/chat", request: ChatRequest, response: TutorAnswer, module: 10 },
  chatHistory: { method: "GET", path: "/api/chat?learnerId=", request: null, response: z.array(ChatMessageView), module: 10 },
  evalAnswer: { method: "POST", path: "/api/eval/answer", request: EvalAnswerRequest, response: EvalAnswerResponse, module: 10 },
  createQuiz: { method: "POST", path: "/api/quiz", request: CreateQuizRequest, response: Quiz, module: 12 },
  getQuiz: { method: "GET", path: "/api/quiz/[id]", request: null, response: Quiz, module: 12 },
  submitQuiz: { method: "POST", path: "/api/quiz/[id]/submit", request: SubmitRequest, response: QuizReport, module: 13 },
  getReport: { method: "GET", path: "/api/quiz/[id]/report", request: null, response: QuizReport, module: 13 },
  mastery: { method: "GET", path: "/api/mastery?learnerId=", request: null, response: MasteryView, module: 14 },
} as const satisfies Record<string, Endpoint>;

export type EndpointName = keyof typeof endpoints;
export type EndpointResponse<K extends EndpointName> = z.infer<(typeof endpoints)[K]["response"]>;
