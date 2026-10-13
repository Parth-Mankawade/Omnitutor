// Test fixtures shared by core tests and tools/e2e (import from "@sc/core/testing"). Not used by the app.
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";

/** A real PDF with `pages` pages ("Page N" on each). */
export async function makePdf(pages = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) doc.addPage([595, 842]).drawText(`Page ${i}`, { x: 50, y: 780, size: 14, font });
  return doc.save();
}

/** A minimal .pptx package with `slides` slides. `omitPresentation`: a ZIP that is not a deck. */
export async function makePptx(slides: number, opts: { omitPresentation?: boolean } = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
  if (!opts.omitPresentation) {
    const ids = Array.from({ length: slides }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join("");
    zip.file(
      "ppt/presentation.xml",
      '<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ' +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>${ids}</p:sldIdLst></p:presentation>`,
    );
    for (let i = 1; i <= slides; i++) zip.file(`ppt/slides/slide${i}.xml`, `<p:sld><a:t>Slide ${i}</a:t></p:sld>`);
  }
  return zip.generateAsync({ type: "uint8array" });
}

const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const u64 = (n: number) => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; };
const box = (type: string, ...payload: Buffer[]) => {
  const body = Buffer.concat(payload);
  return Buffer.concat([u32(8 + body.length), Buffer.from(type, "latin1"), body]);
};

/**
 * A synthetic MP4 (ISO BMFF) with a real box structure: ftyp, moov/mvhd, mdat. Not playable,
 * but exercises the same parsing paths as real files (moov before/after mdat, mvhd v0/v1, 64-bit box size).
 */
export function makeMp4(opts: {
  durationSec: number;
  timescale?: number;
  version?: 0 | 1;
  moovAtEnd?: boolean;
  largeMdat?: boolean;
  /** Write the raw "unknown duration" marker (v0: 0xFFFFFFFF). */
  unknownDuration?: boolean;
  omitMoov?: boolean;
}): Uint8Array {
  const timescale = opts.timescale ?? 1000;
  const duration = Math.round(opts.durationSec * timescale);
  const rest = Buffer.alloc(80); // rate, volume, matrix, next_track_ID…
  const mvhd =
    opts.version === 1
      ? box("mvhd", Buffer.from([1, 0, 0, 0]), u64(0), u64(0), u32(timescale), u64(duration), rest)
      : box("mvhd", Buffer.from([0, 0, 0, 0]), u32(0), u32(0), u32(timescale), u32(opts.unknownDuration ? 0xffffffff : duration), rest);
  const moov = box("moov", box("free", Buffer.alloc(16)), mvhd); // a box before mvhd exercises iteration
  const ftyp = box("ftyp", Buffer.from("isom"), u32(512), Buffer.from("isomiso2avc1mp41"));
  const media = Buffer.alloc(2048, 7);
  const mdat = opts.largeMdat
    ? Buffer.concat([u32(1), Buffer.from("mdat"), u64(16 + media.length), media])
    : box("mdat", media);
  const parts = opts.omitMoov ? [ftyp, mdat] : opts.moovAtEnd ? [ftyp, mdat, moov] : [ftyp, moov, mdat];
  return new Uint8Array(Buffer.concat(parts));
}

/** Yields `bytes` in chunks, like a network body. */
export async function* chunked(bytes: Uint8Array, chunkSize = 64 * 1024): AsyncGenerator<Uint8Array> {
  for (let i = 0; i < bytes.length; i += chunkSize) yield bytes.subarray(i, i + chunkSize);
}

/** Yields `total` zero bytes without allocating them all at once (oversize-upload tests). */
export async function* zeros(total: number, chunkSize = 1024 * 1024): AsyncGenerator<Uint8Array> {
  const chunk = new Uint8Array(chunkSize);
  for (let sent = 0; sent < total; sent += chunkSize) yield chunk.subarray(0, Math.min(chunkSize, total - sent));
}
