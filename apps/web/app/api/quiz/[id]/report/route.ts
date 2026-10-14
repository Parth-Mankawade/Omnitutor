import { getReport } from "@sc/core";
import { endpoints } from "@sc/schemas";
import { handle, json } from "../../../_lib/http";

/** The post-quiz report (409 until submitted). */
export const GET = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  return json(endpoints.getReport.response, await getReport(id));
});
