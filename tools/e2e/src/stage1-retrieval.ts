// Stage-1 REAL-DATA check for Module 8 (retrieval). Runs every test-set question through the live
// POST /api/search (1 embedding request per new question; repeats are cached) and checks whether
// the cited locations contain the expected page / video time. Usage: npm run stage1:retrieval
import { REPO_ROOT, api, requireServer } from "./setup";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { TestSet, type Citation, type ExpectedLocation } from "@sc/schemas";

const K = 6;
const VIDEO_TOL = 2; // seconds

await requireServer();
const items = TestSet.parse(JSON.parse(await readFile(path.join(REPO_ROOT, "data", "demo", "testset.stage1.json"), "utf8")));
const before = (await api.health()).usage!;

const matches = (c: Citation, e: ExpectedLocation) => {
  if (c.filename !== e.filename || c.sourceType !== e.sourceType) return false;
  if (c.sourceType === "PDF" && e.sourceType === "PDF") return c.page === e.page;
  if (c.sourceType === "PPTX" && e.sourceType === "PPTX") return c.slide === e.slide;
  if (c.sourceType === "VIDEO" && e.sourceType === "VIDEO") return c.tStart < e.tEnd + VIDEO_TOL && c.tEnd > e.tStart - VIDEO_TOL;
  return false;
};
const loc = (c: Citation) => (c.sourceType === "PDF" ? `p.${c.page}` : c.sourceType === "PPTX" ? `slide ${c.slide}` : `${c.tStart}–${c.tEnd}s`);

const rows = [];
for (const item of items) {
  const res = await api.search({ query: item.question, k: K });
  const rank = item.expected.length ? res.results.findIndex((r) => item.expected.some((e) => matches(r.citation, e))) + 1 : null;
  rows.push({
    id: item.id,
    modality: item.modality,
    rank: rank === null ? "n/a" : rank || `miss`,
    topScore: +res.topScore.toFixed(3),
    top1: `${res.results[0].citation.sourceType} ${loc(res.results[0].citation)}`,
    top3: res.results.slice(0, 3).map((r) => `${loc(r.citation)}(${r.score.toFixed(2)})`).join(" "),
  });
}
const after = (await api.health()).usage!;

const answerable = rows.filter((r) => r.modality !== "off_material");
const ranks = answerable.map((r) => (typeof r.rank === "number" ? r.rank : 0));
const hitAt = (k: number) => ranks.filter((r) => r > 0 && r <= k).length / ranks.length;
const mrr = ranks.reduce((s, r) => s + (r ? 1 / r : 0), 0) / ranks.length;
const ansScores = answerable.map((r) => r.topScore).sort((a, b) => a - b);
const offScores = rows.filter((r) => r.modality === "off_material").map((r) => r.topScore).sort((a, b) => a - b);

// Threshold preview: best balanced accuracy for "answer if topScore ≥ τ" (NOT the final calibration).
let best = { tau: 0, acc: 0 };
for (const tau of [...ansScores, ...offScores]) {
  const tp = ansScores.filter((s) => s >= tau).length / ansScores.length;
  const tn = offScores.filter((s) => s < tau).length / offScores.length;
  if ((tp + tn) / 2 > best.acc) best = { tau, acc: (tp + tn) / 2 };
}

console.table(rows);
console.log(`\nanswerable: ${answerable.length} · hit@1 ${(hitAt(1) * 100).toFixed(0)}% · hit@3 ${(hitAt(3) * 100).toFixed(0)}% · hit@6 ${(hitAt(6) * 100).toFixed(0)}% · MRR ${mrr.toFixed(2)}`);
console.log(`topScore answerable: min ${ansScores[0]} · median ${ansScores[Math.floor(ansScores.length / 2)]} · max ${ansScores.at(-1)}`);
console.log(`topScore off-material: min ${offScores[0]} · median ${offScores[Math.floor(offScores.length / 2)]} · max ${offScores.at(-1)}`);
console.log(`threshold preview: τ=${best.tau} separates them with balanced accuracy ${(best.acc * 100).toFixed(0)}% (current REFUSAL_TAU placeholder 0.55)`);
console.log(`Gemini usage for this run: embed ${after.embed.requests - before.embed.requests} requests, generate ${after.generate.requests - before.generate.requests}`);

const checks = {
  [`hit@6 ≥ 80% (${(hitAt(6) * 100).toFixed(0)}%)`]: hitAt(6) >= 0.8,
  "no Gemini generate calls (retrieval only embeds)": after.generate.requests === before.generate.requests,
};
console.log("");
for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
