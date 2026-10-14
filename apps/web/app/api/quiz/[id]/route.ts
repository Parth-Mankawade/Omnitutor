import { getQuiz } from "@sc/core";
import { endpoints } from "@sc/schemas";
import { handle, json } from "../../_lib/http";

/** The quiz without answers (client-safe). */
export const GET = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  return json(endpoints.getQuiz.response, await getQuiz(id));
});
