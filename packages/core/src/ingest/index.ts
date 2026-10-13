// Ingestion orchestrator. Uploads are free; ingestion (which spends Gemini quota) starts only
// on request (POST /api/sources/[id]/ingest). Re-running is cheap: finished work is cached.
import { readFile } from "node:fs/promises";
import { prisma, type Source } from "@sc/db";
import type { UploadResponse } from "@sc/schemas";
import { sha256File } from "../cache";
import { AppError, LlmError, notFound, notReady } from "../errors";
import { embed as geminiEmbed, type EmbedTask } from "../llm";
import { resolveSourcePath } from "../storage";
import { embedText, extractPdf, type ExtractPage } from "./pdf";
import type { ChunkDraft, IngestStats } from "./types";
import { extractVideo, videoWindows, type SegmentReport } from "./video";

export * from "./pdf";
export * from "./types";
export * from "./video";

/** Injectable for tests (defaults call Gemini through the limiter + cache). */
export type IngestDeps = {
  extractPage?: ExtractPage;
  embed?: (texts: string[], task: EmbedTask) => Promise<number[][]>;
};

/** A PROCESSING row with no progress for this long is considered interrupted. */
export const STALE_MS = 2 * 60_000;

const SUPPORTED: Source["type"][] = ["PDF", "VIDEO"];
const running = new Set<string>();

/** Turns any failure into a message a student/teacher can act on (stored in Source.error). */
function userMessage(e: unknown): string {
  if (e instanceof AppError) return e.message;
  const raw = e instanceof Error ? e.message : String(e);
  const cause = e instanceof Error ? e.cause : undefined;
  if (cause instanceof LlmError && cause.kind === "rate_limit") return raw; // already explains limits/budget
  return raw.replace(/^\[llm:\w+\] /, "").slice(0, 500);
}

// PDF: one unit per page. Video: upload + one unit per ≤60 s window.
const unitsFor = (s: Source) => (s.type === "PDF" ? (s.pageCount ?? 0) : videoWindows(s.durationSec ?? 0).length + 1);

/**
 * Validates and marks the source PROCESSING, then starts the job. The returned `job` never
 * rejects: failures are recorded as status FAILED with a readable `error`.
 */
export async function requestIngestion(sourceId: string, deps: IngestDeps = {}): Promise<{ response: UploadResponse; job: Promise<IngestResult> }> {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw notFound(`Source "${sourceId}" not found.`);
  if (!SUPPORTED.includes(source.type)) {
    throw notReady(`${source.type} ingestion isn't built yet (PDF and video for now). The file is stored and can be processed once it is.`);
  }
  const stale = Date.now() - source.updatedAt.getTime() > STALE_MS;
  if (running.has(sourceId) || (source.status === "PROCESSING" && !stale)) {
    throw notReady("This source is already being processed.");
  }
  running.add(sourceId);
  try {
    await prisma.source.update({ where: { id: sourceId }, data: { status: "PROCESSING", error: null, progressDone: 0, progressTotal: unitsFor(source) } });
  } catch (e) {
    running.delete(sourceId);
    throw e;
  }
  const job = runIngestion(sourceId, deps).finally(() => running.delete(sourceId));
  return { response: { id: sourceId, status: "PROCESSING" }, job };
}

export type IngestResult = { ok: true; chunks: number; stats: IngestStats; video?: SegmentReport } | { ok: false; error: string };

/** The job: extract (per type) → embed → replace the source's chunks atomically → READY (or FAILED). */
export async function runIngestion(sourceId: string, deps: IngestDeps = {}): Promise<IngestResult> {
  const embed = deps.embed ?? geminiEmbed;
  const step = () => prisma.source.update({ where: { id: sourceId }, data: { progressDone: { increment: 1 } } }).then(() => {});
  try {
    const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
    const absPath = resolveSourcePath(source.path);
    const fileSha = await sha256File(absPath);

    let chunks: ChunkDraft[];
    let stats: IngestStats;
    let video: SegmentReport | undefined;
    if (source.type === "PDF") {
      ({ chunks, stats } = await extractPdf(new Uint8Array(await readFile(absPath)), fileSha, { extractPage: deps.extractPage, onPageDone: step }));
    } else if (source.type === "VIDEO") {
      if (!source.durationSec) throw new AppError("bad_request", "This video has no recorded duration; delete and upload it again.");
      const existingFile = source.geminiFileName && source.geminiFileUri ? { name: source.geminiFileName, uri: source.geminiFileUri, expiresAt: source.geminiFileExpiresAt } : null;
      ({ chunks, stats, report: video } = await extractVideo({
        absPath,
        fileSha,
        durationSec: source.durationSec,
        existingFile,
        onStep: step,
        onUploaded: async (f) => {
          await prisma.source.update({ where: { id: sourceId }, data: { geminiFileName: f?.name ?? null, geminiFileUri: f?.uri ?? null, geminiFileExpiresAt: f?.expiresAt ?? null } });
        },
      }));
    } else {
      throw notReady(`${source.type} ingestion isn't built yet.`);
    }
    if (chunks.length === 0) throw new AppError("bad_request", "No content could be extracted from this file.");

    const vectors = await embed(chunks.map(embedText), "RETRIEVAL_DOCUMENT");
    if (vectors.length !== chunks.length) throw new Error(`Embedding returned ${vectors.length} vectors for ${chunks.length} chunks.`);

    await prisma.$transaction([
      prisma.chunk.deleteMany({ where: { sourceId } }),
      prisma.chunk.createMany({ data: chunks.map((c, seq) => ({ sourceId, seq, ...c, embedding: vectors[seq] })) }),
      prisma.source.update({ where: { id: sourceId }, data: { status: "READY", error: null, progressDone: stats.units, progressTotal: stats.units } }),
    ]);
    console.info(`[ingest] ${sourceId} (${source.type}): READY, ${chunks.length} chunks · ${stats.geminiCalls} Gemini calls, ${stats.cached} cached, ${stats.inputTokens} input tokens`);
    return { ok: true, chunks: chunks.length, stats, ...(video && { video }) };
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
    data: { status: "FAILED", error: "Processing was interrupted (the server stopped). Run ingest again; finished work is cached." },
  });
  return count;
}
