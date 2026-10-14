import type { ReactNode, SVGProps } from "react";

/**
 * The icon set, vendored locally.
 *
 * Glyphs are taken from Lucide (v1.56.0, ISC licensed; the licence text ships
 * in `public/licenses/LUCIDE-ISC.txt`) rather than drawn by hand, and they are
 * compiled into the bundle, so nothing here is fetched from an icon CDN at
 * runtime.
 *
 * One geometry across the set: a 24x24 viewBox, a `currentColor` stroke, round
 * caps and joins, and `aria-hidden`, because every current use sits beside a
 * real text label. `strokeWidth` defaults to 1.5 so an icon lands on the same
 * hairline weight as the rules instead of reading as a bolder layer.
 */
export type IconProps = SVGProps<SVGSVGElement> & {
  /** Edge length in CSS pixels. */
  size?: number;
  /** Stroke weight in viewBox units; 1.5 matches the hairlines. */
  strokeWidth?: number;
};

function Icon({
  size = 20,
  strokeWidth = 1.5,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Marks a finished session or assessment. Source: Lucide `graduation-cap` (ISC). */
export function GraduationCapIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </Icon>
  );
}

/** Marks an upload or outbound action. Source: Lucide `send` (ISC). */
export function SendIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </Icon>
  );
}

/** Marks a destructive delete action. Source: Lucide `trash-2` (ISC). */
export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Icon>
  );
}

/** Marks an open source or citation. Source: Lucide `book-open` (ISC). */
export function BookOpenIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v16" />
      <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />
    </Icon>
  );
}

/** Source: Lucide `upload` (ISC). */
export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </Icon>
  );
}

/** Source: Lucide `message-square` (ISC). */
export function MessageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  );
}

/** Source: Lucide `target` (ISC). */
export function TargetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </Icon>
  );
}

/** Flashcards. Source: Lucide `layers` (ISC). */
export function LayersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </Icon>
  );
}

/** Course map. Source: Lucide `network` (ISC). */
export function NetworkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <path d="M12 12V8" />
    </Icon>
  );
}

/** Source: Lucide `trending-up` (ISC). */
export function TrendingUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </Icon>
  );
}

/** Source: Lucide `notebook` (ISC). */
export function NotebookIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 6h4" />
      <path d="M2 10h4" />
      <path d="M2 14h4" />
      <path d="M2 18h4" />
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <path d="M16 2v20" />
    </Icon>
  );
}

/** Source: Lucide `chevron-down` (ISC). */
export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

/** Source: Lucide `check` (ISC). */
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  );
}

/** Source: Lucide `plus` (ISC). */
export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Icon>
  );
}

/** Source: Lucide `x` (ISC). */
export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icon>
  );
}

/** Source: Lucide `arrow-right` (ISC). */
export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Icon>
  );
}
