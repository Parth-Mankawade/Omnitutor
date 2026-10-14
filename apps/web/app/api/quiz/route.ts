import { createQuiz } from "@sc/core";
import { endpoints } from "@sc/schemas";
import { handle, json, readBody } from "../_lib/http";

/** Generates a verified quiz (2 Gemini calls): DIAGNOSTIC, MOCK or QUIZ on chosen topics. */
export const POST = handle(async (req) => {
  const body = await readBody(req, endpoints.createQuiz.request);
  return json(endpoints.createQuiz.response, await createQuiz(body));
});
