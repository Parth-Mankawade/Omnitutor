// Ingestion orchestrator. Uploads are free; ingestion (which spends Gemini quota) starts only
// on request (POST /api/sources/[id]/ingest). Re-running is cheap: finished pages are cached.
import { readFile } from "node:fs/promises";
import { prisma } from "@sc/db";
import type { UploadResponse } from "@sc/schemas";
import { sha256Bytes } from "../cache";
import { AppError, LlmError, notFound, notReady } from "../errors";
import { embed as geminiEmbed, type EmbedTask } from "../llm";
import { resolveSourcePath } from "../storage";
import { embedText, extractPdf, type ChunkDraft, type ExtractPage, type PdfStats } from "./pdf";

export * from "./pdf";

/** Injectable for tests (defaults call Gemini through the limiter + cache). */
export type IngestDeps = {
  extractPage?: ExtractPage;
  embed?: (texts: string[], task: EmbedTask) => Promise<number[][]>;
};

/** A PROCESSING row with no progress for this long is considered interrupted. */
export const STALE_MS = 2 * 60_000;

const running = new Set<string>();

/** Turns any failure into a message a student/teacher can act on (stored in Source.error). */
function userMessage(e: unknown): string {
  if (e instanceof AppError) return e.message;
  const raw = e instanceof Error ? e.message : String(e);
  const cause = e instanceof Error ? e.cause : undefined;
  if (cause instanceof LlmError && cause.kind === "rate_limit") return raw; // already explains limits/budget
  return raw.replace(/^\[llm:\w+\] /, "").slice(0, 500);
}

/**
 * Validates and marks the source PROCESSING, then starts the job. The returned `job` never
 * rejects: failures are recorded as status FAILED with a readable `error`.
 */
export async function requestIngestion(sourceId: string, deps: IngestDeps = {}): Promise<{ response: UploadResponse; job: Promise<IngestResult> }> {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw notFound(`Source "${sourceId}" not found.`);
  if (source.type !== "PDF") {
    throw notReady(`${source.type} ingestion isn't built yet (PDF only for now). The file is stored and can be processed once it is.`);
  }
  const stale = Date.now() - source.updatedAt.getTime() > STALE_MS;
  if (running.has(sourceId) || (source.status === "PROCESSING" && !stale)) {
    throw notReady("This source is already being processed.");
  }
  running.add(sourceId);
  try {
    await prisma.source.update({ where: { id: sourceId }, data: { status: "PROCESSING", error: null, progressDone: 0, progressTotal: source.pageCount ?? 0 } });
  } catch (e) {
    running.delete(sourceId);
    throw e;
  }
  const job = runIngestion(sourceId, deps).finally(() => running.delete(sourceId));
  return { response: { id: sourceId, status: "PROCESSING" }, job };
}

export type IngestResult = { ok: true; chunks: number; stats: PdfStats } | { ok: false; error: string };

/** The job: extract → embed → replace the source's chunks atomically → READY (or FAILED). */
export async function runIngestion(sourceId: string, deps: IngestDeps = {}): Promise<IngestResult> {
  const embed = deps.embed ?? geminiEmbed;
  try {
    const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
    const bytes = new Uint8Array(await readFile(resolveSourcePath(source.path)));
    const { chunks, stats } = await extractPdf(bytes, sha256Bytes(bytes), {
      extractPage: deps.extractPage,
      onPageDone: async () => {
        await prisma.source.update({ where: { id: sourceId }, data: { progressDone: { increment: 1 } } });
      },
    });
    if (chunks.length === 0) throw new AppError("bad_request", "No content could be extracted from this PDF.");

    const vectors = await embed(chunks.map(embedText), "RETRIEVAL_DOCUMENT");
    if (vectors.length !== chunks.length) throw new Error(`Embedding returned ${vectors.length} vectors for ${chunks.length} chunks.`);

    await prisma.$transaction([
      prisma.chunk.deleteMany({ where: { sourceId } }),
      prisma.chunk.createMany({ data: chunks.map((c: ChunkDraft, seq) => ({ sourceId, seq, ...c, embedding: vectors[seq] })) }),
      prisma.source.update({ where: { id: sourceId }, data: { status: "READY", error: null, progressDone: stats.pages, progressTotal: stats.pages } }),
    ]);
    console.info(`[ingest] ${sourceId}: READY, ${chunks.length} chunks · ${stats.geminiCalls} Gemini calls, ${stats.cachedPages} cached pages, ${stats.inputTokens} input tokens`);
    return { ok: true, chunks: chunks.length, stats };
  } catch (e) {
    const error = userMessage(e);
    console.error(`[ingest] ${sourceId}: FAILED: ${error}`);
    await prisma.source.update({ where: { id: sourceId }, data: { status: "FAILED", error } }).catch(() => {});
    return { ok: false, error };
  }
}

/** Marks PROCESSING rows with no recent progress as FAILED (run at server start). Returns the count. */
export async function recoverInterruptedSources(staleMs = STALE_MS): Promise<number> {
  const { count } = await prisma.source.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - staleMs) } },
    data: { status: "FAILED", error: "Processing was interrupted (the server stopped). Run ingest again; finished pages are cached." },
  });
  return count;
}
