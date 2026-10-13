import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

/* Three voices, one job each:
   - Fraunces carries the display voice (folio headlines, section rules, the
     large numerals on the report). `opsz` lets it hold up at display sizes.
   - Instrument Sans is the interface and body face.
   - JetBrains Mono is the locator voice: pages, slides and timestamps only. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Omnitutor — tutoring grounded in your own course material",
  description:
    "Upload a lecture video, a textbook chapter and a slide deck. Ask questions and get answers that cite the exact page, slide or timestamp, with verified adaptive quizzes and a per-topic mastery model.",
};

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tutor", label: "Tutor" },
  { href: "/quiz", label: "Quiz" },
  { href: "/sources", label: "Sources" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        {/* Keyboard users reach the content without tabbing the whole header
            (WCAG 2.4.1). Hidden until focused. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-card focus:border focus:border-rule-strong focus:bg-surface focus:px-3 focus:py-2 focus:text-meta focus:text-ink"
        >
          Skip to content
        </a>

        {/* Fixed, pointer-events-none: the substrate never repaints with scroll
            content, so it costs no compositing work while scrolling. */}
        <div className="substrate" aria-hidden="true" />

        <header className="sticky top-0 z-30 border-b border-rule bg-paper">
          <div className="mx-auto flex h-14 w-full max-w-[68rem] items-center justify-between px-4 sm:px-6">
            <Link href="/" className="group flex items-center gap-2.5">
              {/* The pilcrow: the typographic mark for an annotated passage. */}
              <span
                aria-hidden="true"
                className="locator flex h-6 w-6 items-center justify-center rounded-card bg-ink text-paper"
              >
                ¶
              </span>
              <span className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
                Omnitutor
              </span>
            </Link>

            <nav aria-label="Main">
              <ul className="flex items-center gap-1 sm:gap-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-6 items-center rounded-card px-2.5 py-1.5 text-meta text-graphite transition-colors duration-200 ease-ledger hover:bg-surface hover:text-ink sm:px-3"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <div id="content" className="relative z-10 flex flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
