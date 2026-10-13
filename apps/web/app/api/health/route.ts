import { connection } from "next/server";
import { prisma } from "@sc/db";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "APP_GEMINI_API_KEY",
  "LLM_MODEL_FAST",
  "LLM_MODEL_STRONG",
  "EMBED_MODEL",
  "REFUSAL_TAU",
] as const;

export async function GET() {
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

  return Response.json({ ok: db.ok, db, env }, { status: db.ok ? 200 : 503 });
}
