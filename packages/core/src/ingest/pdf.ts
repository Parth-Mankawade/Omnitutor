// PDF ingestion: split into single pages → one Gemini call per page (cached by file hash + page
// + prompt version) → text / figure / table blocks → chunks that each cite exactly one page.
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { generateJson, type Usage } from "../llm";
import type { ChunkDraft, IngestStats } from "./types";

/** Bump when the prompt or schema changes: old cache entries then miss. */
export const PDF_PROMPT_VERSION = "pdf-page-v1";

export const PdfPageExtraction = z.object({
  blocks: z.array(
    z.object({
      kind: z.enum(["text", "figure", "table"]),
      title: z.string(), // heading / caption; "" if none
      content: z.string(),
    }),
  ),
  conceptLabels: z.array(z.string()),
});
export type PdfPageExtraction = z.infer<typeof PdfPageExtraction>;

export const PDF_PAGE_PROMPT = `You extract ONE page of Operating Systems course material for a study assistant's knowledge base. Students will ask questions and every answer must cite this page, so be complete and faithful.

Return JSON:
- blocks: the page content in reading order.
  - kind "text": a heading, paragraph or bullet group. title = its heading if it has one, else "". content = the text copied faithfully (only rejoin words split across lines; keep formulas, symbols and numbers exactly). Write bullets on separate lines starting with "- ".
  - kind "figure": EVERY diagram, chart, graph, timeline, Gantt chart, screenshot or picture that carries information. title = its caption or a short name (e.g. "Process state diagram"). content = a precise description that lets a student answer questions without seeing it: every label and value, every arrow or transition with its label (e.g. "running -> waiting: I/O or event wait"), axes with units, the order of blocks in a timeline, and what the figure illustrates.
  - kind "table": a table as Markdown rows, keeping every cell value.
- conceptLabels: 2 to 6 short noun phrases naming the key Operating Systems concepts on this page.

Rules:
- If the page is a picture of a slide, transcribe its text as text blocks and describe its diagrams as figure blocks.
- Skip decoration and boilerplate: logos, page numbers, repeated course headers or footers (such as "CS C372 OPERATING SYSTEMS").
- Use only what is on the page. Do not add outside knowledge, explanations or corrections.
- A page that only has a title yields one text block containing the title.`;

const at = (page: number) => ({ page, slide: null, tStart: null, tEnd: null });

/** Text groups longer than this start a new chunk (slides are short; textbook pages split by section). */
export const MAX_TEXT_CHARS = 1_200;

/** Pure: one page's extraction → chunk drafts (text grouped, each figure on its own, empty dropped). */
export function pageChunks(page: number, ex: PdfPageExtraction): ChunkDraft[] {
  const labels = [...new Set(ex.conceptLabels.map((l) => l.trim()).filter(Boolean))].slice(0, 6);
  const out: ChunkDraft[] = [];
  let groupTitle: string | null = null;
  let groupParts: string[] = [];
  let groupChars = 0;
  const flush = () => {
    if (groupParts.length) out.push({ kind: "TEXT", title: groupTitle, content: groupParts.join("\n\n"), ...at(page), conceptLabels: labels });
    groupTitle = null;
    groupParts = [];
    groupChars = 0;
  };
  for (const b of ex.blocks) {
    const content = b.content.trim();
    const title = b.title.trim() || null;
    if (!content) continue;
    if (b.kind === "figure") {
      flush(); // keep reading order: text before the figure stays before it
      out.push({ kind: "FIGURE", title: title ?? "Figure", content, ...at(page), conceptLabels: labels });
      continue;
    }
    const text = b.kind === "table" && title ? `${title}\n${content}` : content;
    if (groupParts.length && groupChars + text.length > MAX_TEXT_CHARS) flush();
    if (b.kind === "text" && groupTitle === null) groupTitle = title;
    groupParts.push(text);
    groupChars += text.length;
  }
  flush();
  return out;
}

/** What gets embedded for a chunk (decision Q16: title + content). */
export const embedText = (c: { title: string | null; content: string }) => (c.title ? `${c.title}\n${c.content}` : c.content);

/** Splits a PDF into single-page PDFs (page order preserved). */
export async function splitPdf(bytes: Uint8Array): Promise<Uint8Array[]> {
  const src = await PDFDocument.load(bytes, { updateMetadata: false });
  const pages: Uint8Array[] = [];
  for (const i of src.getPageIndices()) {
    const one = await PDFDocument.create({ updateMetadata: false });
    const [p] = await one.copyPages(src, [i]);
    one.addPage(p);
    pages.push(await one.save());
  }
  return pages;
}

export type PageResult = { extraction: PdfPageExtraction; cached: boolean; usage: Usage };
export type ExtractPage = (pageBytes: Uint8Array, ctx: { fileSha: string; pageIndex: number }) => Promise<PageResult>;

/** Default page extractor: one structured Gemini call, cached per (file hash, page, prompt version). */
export const extractPdfPage: ExtractPage = async (pageBytes, { fileSha, pageIndex }) => {
  const r = await generateJson({
    role: "fast",
    schema: PdfPageExtraction,
    system: PDF_PAGE_PROMPT,
    parts: [{ inlineData: { mimeType: "application/pdf", data: Buffer.from(pageBytes).toString("base64") } }, { text: "Extract this page." }],
    cacheKey: `pdf-page|${PDF_PROMPT_VERSION}|${fileSha}|${pageIndex}`,
  });
  return { extraction: r.data, cached: r.cached, usage: r.usage };
};

/**
 * Extracts every page (up to `concurrency` at once; the rate limiter paces the calls).
 * Stops taking new pages after the first failure; the error says which page failed.
 */
export async function extractPdf(
  bytes: Uint8Array,
  fileSha: string,
  opts: { extractPage?: ExtractPage; onPageDone?: () => Promise<void> | void; concurrency?: number } = {},
): Promise<{ chunks: ChunkDraft[]; stats: IngestStats }> {
  const extract = opts.extractPage ?? extractPdfPage;
  const pages = await splitPdf(bytes);
  const results: PageResult[] = new Array(pages.length);
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < pages.length) {
      const i = next++;
      try {
        results[i] = await extract(pages[i], { fileSha, pageIndex: i });
      } catch (e) {
        failed = true;
        const msg = e instanceof Error ? e.message.replace(/^\[llm:\w+\] /, "") : String(e);
        throw new Error(`Page ${i + 1}: ${msg}`, { cause: e });
      }
      await opts.onPageDone?.();
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 4, pages.length) }, worker));

  const stats: IngestStats = { units: pages.length, geminiCalls: 0, cached: 0, inputTokens: 0, outputTokens: 0 };
  for (const r of results) {
    if (r.cached) stats.cached++;
    else stats.geminiCalls++;
    stats.inputTokens += r.usage.inputTokens;
    stats.outputTokens += r.usage.outputTokens;
  }
  return { chunks: results.flatMap((r, i) => pageChunks(i + 1, r.extraction)), stats };
}
