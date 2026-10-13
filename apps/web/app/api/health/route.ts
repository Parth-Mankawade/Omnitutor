import { connection, type NextRequest } from "next/server";
import { checkModels } from "@sc/core";
import { prisma } from "@sc/db";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "APP_GEMINI_API_KEY",
  "LLM_MODEL_FAST",
  "LLM_MODEL_STRONG",
  "EMBED_MODEL",
  "REFUSAL_TAU",
] as const;

export async function GET(request: NextRequest) {
  await connection(); // always run at request time

  let db: { ok: boolean; latencyMs?: number; error?: string };
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

  // Opt-in (?gemini=1): model metadata lookups only — no generation, no tokens.
  if (request.nextUrl.searchParams.get("gemini") !== "1") {
    return Response.json({ ok: db.ok, db, env }, { status: db.ok ? 200 : 503 });
  }
  const gemini = await checkModels().catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }));
  const geminiOk = !("error" in gemini) && Object.values(gemini).every((m) => m.ok);
  const ok = db.ok && geminiOk;
  return Response.json({ ok, db, env, gemini }, { status: ok ? 200 : 503 });
}
