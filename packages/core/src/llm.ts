// The ONLY module that calls Gemini. Everything else goes through these helpers.
import { ApiError, FileState, GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";

export type ModelRole = "fast" | "strong";
export type LlmErrorKind = "config" | "rate_limit" | "api" | "parse" | "validation" | "file";

export class LlmError extends Error {
  constructor(
    public kind: LlmErrorKind,
    message: string,
    public cause?: unknown,
  ) {
    super(`[llm:${kind}] ${message}`);
    this.name = "LlmError";
  }
}

export type Usage = { inputTokens: number; outputTokens: number };

export const EMBED_DIM = 768;

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  // Explicit key: never let the SDK fall back to a machine-wide GEMINI_API_KEY.
  const apiKey = process.env.APP_GEMINI_API_KEY;
  if (!apiKey) throw new LlmError("config", "APP_GEMINI_API_KEY is not set in .env");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

function envModel(name: "LLM_MODEL_FAST" | "LLM_MODEL_STRONG" | "EMBED_MODEL"): string {
  const id = process.env[name];
  if (!id) throw new LlmError("config", `${name} is not set in .env`);
  return id;
}

export function modelFor(role: ModelRole): string {
  return envModel(role === "fast" ? "LLM_MODEL_FAST" : "LLM_MODEL_STRONG");
}

function toLlmError(e: unknown): LlmError {
  if (e instanceof LlmError) return e;
  if (e instanceof ApiError) {
    return new LlmError(e.status === 429 ? "rate_limit" : "api", `HTTP ${e.status}: ${e.message}`, e);
  }
  return new LlmError("api", e instanceof Error ? e.message : String(e), e);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Gemini's responseJsonSchema doesn't need the $schema marker Zod adds. */
function geminiJsonSchema(schema: z.ZodType): unknown {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest;
}

/**
 * Structured call: response is constrained to `schema` and validated with Zod.
 * One retry on any failure except missing config.
 */
export async function generateJson<S extends z.ZodType>(opts: {
  role: ModelRole;
  schema: S;
  parts: Part[];
  system?: string;
  temperature?: number;
}): Promise<{ data: z.infer<S>; usage: Usage }> {
  const model = modelFor(opts.role);
  const responseJsonSchema = geminiJsonSchema(opts.schema);
  let lastErr: LlmError | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(lastErr?.kind === "rate_limit" ? 5000 : 1000);
    let text: string | undefined;
    let usage: Usage = { inputTokens: 0, outputTokens: 0 };
    try {
      const res = await getClient().models.generateContent({
        model,
        contents: [{ role: "user", parts: opts.parts }],
        config: {
          systemInstruction: opts.system,
          temperature: opts.temperature,
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      });
      text = res.text;
      usage = {
        inputTokens: res.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
      };
    } catch (e) {
      lastErr = toLlmError(e);
      if (lastErr.kind === "config") throw lastErr;
      continue;
    }

    if (!text) {
      lastErr = new LlmError("parse", "empty response");
      continue;
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (e) {
      lastErr = new LlmError("parse", `invalid JSON: ${text.slice(0, 200)}`, e);
      continue;
    }
    const parsed = opts.schema.safeParse(json);
    if (!parsed.success) {
      lastErr = new LlmError("validation", z.prettifyError(parsed.error), parsed.error);
      continue;
    }
    return { data: parsed.data, usage };
  }
  throw lastErr ?? new LlmError("api", "unknown failure");
}

export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/** Embeds texts (batched by 100) into EMBED_DIM-length vectors. */
export async function embed(texts: string[], taskType: EmbedTask): Promise<number[][]> {
  const model = envModel("EMBED_MODEL");
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    try {
      const res = await getClient().models.embedContent({
        model,
        contents: batch,
        config: { taskType, outputDimensionality: EMBED_DIM },
      });
      const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
      if (vectors.length !== batch.length || vectors.some((v) => v.length !== EMBED_DIM)) {
        throw new LlmError("validation", `expected ${batch.length}×${EMBED_DIM} embeddings`);
      }
      out.push(...vectors);
    } catch (e) {
      throw toLlmError(e);
    }
  }
  return out;
}

export type UploadedFile = { name: string; uri: string; mimeType: string };

/** Uploads a local file to the Gemini Files API and waits until it is ACTIVE. */
export async function uploadFile(
  path: string,
  mimeType: string,
  { timeoutMs = 5 * 60_000 } = {},
): Promise<UploadedFile> {
  const ai = getClient();
  try {
    let file = await ai.files.upload({ file: path, config: { mimeType } });
    const deadline = Date.now() + timeoutMs;
    while (file.state === FileState.PROCESSING) {
      if (Date.now() > deadline) throw new LlmError("file", `timed out waiting for ${file.name}`);
      await sleep(2000);
      file = await ai.files.get({ name: file.name! });
    }
    if (file.state !== FileState.ACTIVE || !file.uri || !file.name) {
      throw new LlmError("file", `file ${file.name} ended in state ${file.state}`);
    }
    return { name: file.name, uri: file.uri, mimeType: file.mimeType ?? mimeType };
  } catch (e) {
    throw toLlmError(e);
  }
}

export async function deleteFile(name: string): Promise<void> {
  try {
    await getClient().files.delete({ name });
  } catch (e) {
    throw toLlmError(e);
  }
}

/** Cheap reachability check: fetches model metadata (no generation, no tokens). */
export async function checkModels(): Promise<Record<string, { ok: boolean; error?: string }>> {
  const ids = {
    LLM_MODEL_FAST: process.env.LLM_MODEL_FAST,
    LLM_MODEL_STRONG: process.env.LLM_MODEL_STRONG,
    EMBED_MODEL: process.env.EMBED_MODEL,
  };
  const result: Record<string, { ok: boolean; error?: string }> = {};
  for (const [key, id] of Object.entries(ids)) {
    if (!id) {
      result[key] = { ok: false, error: "not set" };
      continue;
    }
    try {
      await getClient().models.get({ model: id });
      result[key] = { ok: true };
    } catch (e) {
      result[key] = { ok: false, error: toLlmError(e).message };
    }
  }
  return result;
}
