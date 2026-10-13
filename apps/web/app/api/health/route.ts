import { checkModels } from "@sc/core";
import { prisma } from "@sc/db";
import { HealthQuery, HealthResponse } from "@sc/schemas";
import { handle, json, readQuery } from "../_lib/http";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "APP_GEMINI_API_KEY",
  "LLM_MODEL_FAST",
  "LLM_MODEL_STRONG",
  "EMBED_MODEL",
  "REFUSAL_TAU",
] as const;

export const GET = handle(async (req) => {
  const query = readQuery(req, HealthQuery);

  let db: HealthResponse["db"];
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = { ok: true, latencyMs: Date.now() - t0 };
  } catch (e) {
    // Prisma messages are multi-line with a leading blank; the last line is the cause.
    const msg = e instanceof Error ? e.message : String(e);
    db = { ok: false, error: msg.split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "unknown" };
  }

  // Report presence only, never values.
  const env = Object.fromEntries(REQUIRED_ENV.map((k) => [k, Boolean(process.env[k])]));

  // Opt-in (?gemini=1): model metadata lookups only, no generation and no tokens.
  const gemini = query.gemini ? await checkModels() : undefined;
  const ok = db.ok && (!gemini || Object.values(gemini).every((m) => m.ok));
  return json(HealthResponse, { ok, db, env, ...(gemini && { gemini }) }, ok ? 200 : 503);
});
