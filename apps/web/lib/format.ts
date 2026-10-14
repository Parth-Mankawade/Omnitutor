import type { Citation } from "@sc/schemas";

/**
 * Presentation helpers for values that come out of the contract.
 *
 * Everything here is pure and deterministic: no `Date.now()`, no locale from
 * the host, no rounding that depends on the runtime. The landing page renders
 * on the server first, so a value that formats differently on the client would
 * be a hydration mismatch rather than a cosmetic difference.
 */

/** Seconds into a lecture as `mm:ss`. Used for video locators only. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

/**
 * The locator for a citation, in the shape that source type uses.
 *
 * The contract guarantees exactly one locator per citation and that it matches
 * the source type, so the first branch that finds a locator is always the
 * right one. `sourceType` is deliberately not used as the switch: narrowing on
 * the optional fields keeps this total without a non-null assertion, and a
 * citation that somehow carries no locator returns a word rather than printing
 * `undefined` into the page.
 */
export function formatLocator(citation: Citation): string {
  if (citation.page !== undefined) return `p. ${citation.page}`;
  if (citation.slide !== undefined) return `s. ${citation.slide}`;
  if (citation.tStart !== undefined) {
    const start = formatClock(citation.tStart);
    return citation.tEnd === undefined
      ? start
      : `${start}-${formatClock(citation.tEnd)}`;
  }
  return "unlocated";
}

const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB"] as const;

/** A file size in the largest unit that keeps it above one. */
export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < FILE_SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${FILE_SIZE_UNITS[unit]}`;
}

/* Fixed locale and time zone so the server and the client agree on the string. */
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** An ISO timestamp as `11 Oct 2026`. */
export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}
