import Link from "next/link";
import type { SourceStatus, TutorBlock } from "@sc/schemas";
import { LedgerReveal } from "@/components/ledger-reveal";
import { Locator } from "@/components/locator";
import { citations, mastery, sources, tutorThread } from "@/lib/fixtures";
import { formatDate } from "@/lib/format";

/**
 * The landing surface.
 *
 * Everything on this page is derived from `lib/fixtures`, which is parsed
 * through `@sc/schemas` at import. There is no local mock data and no shape
 * declared here: the specimen, the ledger rows and the grounding comparison
 * are all projections of the contract, so a change to the contract shows up on
 * the first screen rather than in a stale copy of it.
 *
 * A server component. The single client leaf is `LedgerReveal`, which owns the
 * page's one timeline and wraps only the sections that need it.
 */

/* The route is the seed for the whole page, so the lookups live here rather
   than inside the components below. */

const heroCitation = citations.find((entry) => entry.sourceType === "VIDEO");

const evidenceBlocks: TutorBlock[] = tutorThread.flatMap((message) =>
  message.role === "ASSISTANT" ? (message.blocks ?? []) : [],
);

const materialBlock = evidenceBlocks.find((block) => block.origin === "material");
const outsideBlock = evidenceBlocks.find((block) => block.origin === "outside");

/** Sources paired with a citation, so each row can show what it can prove. */
const ledgerRows = sources.flatMap((source) => {
  const citation = citations.find((entry) => entry.sourceId === source.id);
  return citation === undefined ? [] : [{ source, citation }];
});

const STATUS_LABEL: Record<SourceStatus, string> = {
  PENDING: "Waiting",
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed",
};

const STATUS_COLOR: Record<SourceStatus, string> = {
  PENDING: "text-pending",
  PROCESSING: "text-pending",
  READY: "text-verified",
  FAILED: "text-proof",
};

function sourceName(sourceId: string): string {
  return sources.find((source) => source.id === sourceId)?.filename ?? sourceId;
}

const NEXT_STEPS = [
  {
    href: "/tutor",
    title: "Tutor",
    body: "Ask a question and read the answer beside the page, slide or timestamp it came from.",
  },
  {
    href: "/quiz",
    title: "Quiz",
    body: "Sit the diagnostic, then a quiz scoped to the topics you choose.",
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    body: "Follow mastery per topic, the prerequisite chain, and what moved since last time.",
  },
] as const;

export default function LandingPage() {
  return (
    <main className="flex-1">
      {/* ------------------------------------------------------------------ */}
      {/* Opening spread: type against one piece of evidence, with a bare      */}
      {/* column between them. The empty gutter is the asymmetry.             */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-labelledby="landing-hero"
        className="flex items-center px-4 py-14 sm:px-6 lg:min-h-[calc(100dvh-3.5rem)] lg:py-20"
      >
        <div className="mx-auto grid w-full max-w-[68rem] grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h1
              id="landing-hero"
              className="font-display text-4xl leading-[1.04] tracking-[-0.03em] text-ink sm:text-5xl lg:text-6xl"
            >
              Every answer shows its source.
            </h1>
            <p className="measure mt-6 text-body text-graphite">
              Upload a lecture, a textbook and a deck. Ask anything and get
              answers citing the exact page, slide or timestamp.
            </p>
            <Link
              href="/sources"
              className="mt-9 inline-flex min-h-11 items-center rounded-card bg-ink px-5 text-body font-medium text-paper transition-colors duration-200 ease-ledger hover:bg-ink/85"
            >
              Add course material
            </Link>
          </div>

          {heroCitation !== undefined && (
            <figure className="lg:col-span-4 lg:col-start-9">
              <div className="h-px w-full bg-rule-strong" />
              <figcaption className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Locator citation={heroCitation} />
                <span className="text-meta text-graphite">
                  {sourceName(heroCitation.sourceId)}
                </span>
              </figcaption>
              <blockquote className="mt-4 text-body text-ink">
                {heroCitation.excerpt}
              </blockquote>
            </figure>
          )}
        </div>
      </section>

      <LedgerReveal>
        {/* ---------------------------------------------------------------- */}
        {/* The rule the tutor answers by: a claim either cites the material  */}
        {/* or it is labelled as coming from somewhere else.                  */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-labelledby="landing-grounding"
          className="px-4 py-20 sm:px-6 lg:py-28"
        >
          <div
            data-reveal="rule"
            className="mx-auto h-px w-full max-w-[68rem] bg-rule"
          />
          <div className="mx-auto mt-12 w-full max-w-[68rem]">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-9 lg:col-start-3">
                <h2
                  id="landing-grounding"
                  data-reveal="item"
                  className="font-display text-display tracking-[-0.02em] text-ink"
                >
                  Where each answer comes from.
                </h2>
                <p
                  data-reveal="item"
                  className="measure mt-5 text-body text-graphite"
                >
                  Every block the tutor returns is labelled before it reaches
                  you. Material that cites your sources, or outside knowledge
                  with no citation at all. When nothing in the material covers
                  the question, the tutor declines instead of guessing.
                </p>
              </div>
            </div>

            {materialBlock !== undefined && outsideBlock !== undefined && (
              <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div
                  data-reveal="item"
                  className="rounded-panel border border-rule bg-surface p-6 sm:p-8 lg:col-span-6"
                >
                  <p className="text-meta font-medium text-verified">
                    From your material
                  </p>
                  <p className="measure mt-4 text-body text-ink">
                    {materialBlock.text}
                  </p>
                  <ul className="mt-6 space-y-2">
                    {materialBlock.citations.map((citation) => (
                      <li
                        key={citation.chunkId}
                        data-reveal="locator"
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                      >
                        <Locator citation={citation} />
                        <span className="text-meta text-graphite">
                          {sourceName(citation.sourceId)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  data-reveal="item"
                  className="rounded-panel border border-dashed border-rule-strong p-6 sm:p-8 lg:col-span-5 lg:col-start-8"
                >
                  <p className="text-meta font-medium text-graphite">
                    Outside the material
                  </p>
                  <p className="measure mt-4 text-body text-graphite">
                    {outsideBlock.text}
                  </p>
                  <p className="mt-6 text-meta text-graphite">
                    No citation, because none of your sources support it.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* The ledger: one ruled row per source, locator held in its own      */}
        {/* mono gutter so the eye can run down the evidence.                  */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-labelledby="landing-ledger"
          className="px-4 py-20 sm:px-6 lg:py-28"
        >
          <div
            data-reveal="rule"
            className="mx-auto h-px w-full max-w-[68rem] bg-rule"
          />
          <div className="mx-auto mt-12 w-full max-w-[68rem]">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-9 lg:col-start-3">
                <h2
                  id="landing-ledger"
                  data-reveal="item"
                  className="font-display text-display tracking-[-0.02em] text-ink"
                >
                  What each source can prove.
                </h2>
                <p
                  data-reveal="item"
                  className="measure mt-5 text-body text-graphite"
                >
                  Three sources, one question: why a short burst returns the CPU
                  before the time quantum runs out. The locator is the part you
                  can open.
                </p>
              </div>
            </div>

            <ul className="mt-14">
              {ledgerRows.map(({ source, citation }) => (
                <li key={source.id} className="py-6">
                  <div data-reveal="rule" className="h-px w-full bg-rule" />
                  <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 lg:grid-cols-12">
                    <div data-reveal="locator" className="lg:col-span-3">
                      <Locator citation={citation} />
                    </div>
                    <div
                      data-reveal="item"
                      className="lg:col-span-8 lg:col-start-4"
                    >
                      <h3 className="font-display text-title text-ink">
                        {source.filename}
                      </h3>
                      <p className="measure mt-3 text-body text-graphite">
                        {citation.excerpt}
                      </p>
                      <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta tabular-nums text-graphite">
                        <span>{source.type}</span>
                        <span className={STATUS_COLOR[source.status]}>
                          {STATUS_LABEL[source.status]}
                        </span>
                        <span>{source.chunkCount} chunks</span>
                        <span>{formatDate(source.createdAt)}</span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </LedgerReveal>

      {/* ------------------------------------------------------------------ */}
      {/* The three surfaces the loop continues into. Unequal columns rather   */}
      {/* than three cards of the same size.                                   */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-labelledby="landing-next"
        className="px-4 py-20 sm:px-6 lg:py-24"
      >
        <div className="mx-auto h-px w-full max-w-[68rem] bg-rule" />
        <div className="mx-auto mt-12 w-full max-w-[68rem]">
          <h2
            id="landing-next"
            className="font-display text-display tracking-[-0.02em] text-ink"
          >
            Tutor, quiz, dashboard.
          </h2>
          <ul className="mt-10 grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-8">
            {NEXT_STEPS.map((step, index) => (
              <li
                key={step.href}
                className={[
                  "border-t border-rule pt-6",
                  index === 0 ? "lg:col-span-5" : "",
                  index === 1 ? "lg:col-span-4" : "",
                  index === 2 ? "lg:col-span-3" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Link
                  href={step.href}
                  className="group inline-flex items-baseline gap-2"
                >
                  <span className="font-display text-title text-ink transition-colors duration-200 ease-ledger group-hover:text-proof">
                    {step.title}
                  </span>
                </Link>
                <p className="measure mt-3 text-body text-graphite">{step.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* A colophon, not a footer bar: what the page is set in and what it is
          currently holding. The counts are read from the fixtures above. */}
      <footer className="border-t border-rule px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-[68rem] flex-wrap items-baseline gap-x-6 gap-y-2 text-meta text-graphite">
          <p>Set in Fraunces, Instrument Sans and JetBrains Mono.</p>
          <p className="tabular-nums">
            {sources.length} sources, {citations.length} indexed citations,{" "}
            {mastery.topics.length} topics.
          </p>
        </div>
      </footer>
    </main>
  );
}
