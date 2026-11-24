import type { SVGProps } from "react";

/**
 * Icons copied verbatim from the guideline's own inline SVG markup
 * (Cheche-Brand-Guideline-export.html), not from an icon library — so the
 * table renders the exact same glyphs the guideline documents, not a
 * similar-looking substitute.
 */

function base(props: SVGProps<SVGSVGElement>, strokeWidth: number) {
  return {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

/** `.tbl-actions` "View details" button — line ~4483. */
export function ViewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    </svg>
  );
}

/** `.tbl-actions` "Edit" button — line ~6822. */
export function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

/** The "more" button's three solid dots — note `fill`, not `stroke`, per the guideline's literal markup. */
export function MoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

/** `th.sortable .sort-ic` — line ~4341. */
export function SortIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2.5)}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

/** `.select-trigger .chev` — line ~4354. */
export function ChevIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Pager "Previous" arrow — line ~6828. */
export function PagerPrevIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2.5)}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/** Pager "First page" — the guideline has no double arrow; this is its Prev arrow (line ~6828) drawn twice, same stroke. */
export function PagerFirstIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2.5)}>
      <path d="M11 18l-6-6 6-6" />
      <path d="M18 18l-6-6 6-6" />
    </svg>
  );
}

/** Pager "Last page" — the Next arrow (line ~6831) drawn twice, same stroke. */
export function PagerLastIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2.5)}>
      <path d="M13 18l6-6-6-6" />
      <path d="M6 18l6-6-6-6" />
    </svg>
  );
}

/** Pager "Next" arrow — line ~6831. */
export function PagerNextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2.5)}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/** `checkSvg()` — the checkmark drawn inside a checked `.checkbox-box` / `.select-option.active` — line ~6509. */
export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 3)}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

/** `.input-icon-wrap .input-leading-icon` — the search box's leading icon, line ~6088. */
export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

/** `.tbl-toolbar` "Filters" button's icon — line ~6092. */
export function FilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

/**
 * `.btn-spinner` is a plain bordered div in the guideline, not an SVG — see
 * `components/ui/spinner.tsx` for that one.
 */

/** `.date-trigger` leading calendar — line ~6127. */
export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}

/** `X3` — the close glyph inside `.chip-x` — line ~7336. */
export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 3)} strokeLinejoin={undefined}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/** `.field-error` / `.field-hint` alert circle — line ~3330. Stroke-only, no round caps, exactly as drawn. */
export function AlertCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/** `.input-trail-btn` "show password" — line ~3300. */
export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** `.eye-off` — "hide password". */
export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M17.9 17.9A10 10 0 0 1 2 12s1.5-3 4.6-5.2M9.9 4.2A10 10 0 0 1 22 12s-1 2-2.6 3.6M1 1l22 22" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

/** `.qty-step` decrease — stroke 2.5. */
export function MinusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2.5)}>
      <path d="M5 12h14" />
    </svg>
  );
}

/** `.qty-step` increase — stroke 2.5. */
export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2.5)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** `.field-ok` / `.input-trail-ic.ok` check — stroke 2.5 (the thicker 3 is for under-14px marks). */
export function CheckThinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2.5)}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

/** `.flag-et` — the Ethiopian flag the phone input shows next to +251 (the guideline's own SVG). */
export function FlagEthiopia(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 14" aria-hidden="true" {...props}>
      <rect width="24" height="4.67" fill="#078930" />
      <rect y="4.67" width="24" height="4.66" fill="#FCDD09" />
      <rect y="9.33" width="24" height="4.67" fill="#DA121A" />
      <circle cx="12" cy="7" r="3.4" fill="#0F47AF" />
      <polygon points="12,4.6 12.5,5.9 13.9,5.9 12.8,6.7 13.2,8.0 12,7.2 10.8,8.0 11.2,6.7 10.1,5.9 11.5,5.9" fill="#FCDD09" />
      <circle cx="12" cy="7" r="0.6" fill="#0F47AF" />
    </svg>
  );
}

/** `.empty` drop-zone upload arrow. */
export function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

/** `.upl-thumb.doc` file glyph. */
export function DocIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

/** `.avatar-upl .cam` camera. */
export function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

/** `.loc-map .pin` — the solid map pin (fill, not stroke). */
export function PinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 22s-7-7.6-7-12.5a7 7 0 0 1 14 0C19 14.4 12 22 12 22z" />
      <circle cx="12" cy="9.5" r="2.6" fill="var(--color-white)" />
    </svg>
  );
}

/** `.loc-btn` "Use my location" crosshair. */
export function LocateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

/** `.input-leading-icon` map-pin outline (street / landmark field). */
export function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.3" />
    </svg>
  );
}

/** `.opt-ic` clock — "Recent" rows in the search panel. */
export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="12" x2="12" y2="7" />
      <line x1="12" y1="12" x2="16" y2="14" />
    </svg>
  );
}

/** `.opt-ic` building — branch rows in the combobox. */
export function BuildingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1" />
    </svg>
  );
}

/** Toast "error" tile — circle with a cross (`tIcons.x`). */
export function XCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

/** Toast "warning" tile — triangle with an exclamation (`tIcons.warn`). */
export function WarnIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}

/** Toast "info" tile — circle with an "i" (`tIcons.info`). */
export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4m0-4h.01" />
    </svg>
  );
}

/** Toast "undo" tile — counter-clockwise arrow (`tIcons.undo`). */
export function UndoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

/** Toast "export ready" tile — arrow into a tray (`tIcons.dl`). */
export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

/** Empty state "offline" — wifi with a strike (`empIc.wifioff`). */
export function WifiOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M2 2l20 20M8.5 16a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 5.2-2.7M16.5 10.3a10 10 0 0 1 2.5 2.2M12 19.5h.01" />
    </svg>
  );
}

/** Empty state "locked / no access" (`empIc.lock`). */
export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/** Empty state "couldn't load" — circle with an exclamation (`empIc.alert`; the round-cap variant, unlike `AlertCircleIcon`). */
export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4m0 4h.01" />
    </svg>
  );
}

/** Lazy-image placeholder glyph. */
export function ImageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

/** Plus glyph for primary actions ("New booking"); stroke 2. */
export function PlusThinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Upload row "pause" — two bars, drawn to the guideline's icon rules (stroke 2.5 under 18px). */
export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2.5)}>
      <path d="M8 5v14M16 5v14" />
    </svg>
  );
}

/** Upload row "resume" — a play triangle, same rules as `PauseIcon`. */
export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2.5)}>
      <path d="M7 4.5v15l12-7.5z" />
    </svg>
  );
}

/** Notification bell for icon buttons with a count — `.badge-host` example. */
export function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/** Cart for icon buttons with a count. */
export function CartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}

/** Icon-badge glyph — "Top rated". */
export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />
    </svg>
  );
}

/** Icon-badge glyph — "Instant". */
export function BoltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

/** Icon-badge glyph — "Scheduled" (a clock face; not the same as the search panel's `ClockIcon`). */
export function ScheduleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/** Sidebar "Dashboard" — four tiles. */
export function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

/** Sidebar "Payments" — a card. */
export function CardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

/**
 * Sidebar "Settings" — a gear. The guideline's own gear path is clipped (it stops mid-outline), so this is the
 * complete outline it was drawn from; same stroke and size rules.
 */
export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/** Top-bar menu toggle (mobile) — three bars. */
export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

/** Sidebar group "has a flyout" arrow (`sb-item-chev`), stroke 2. */
export function ChevRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/** Organization switcher's up-down chevron (`org-chev`). */
export function ChevUpDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
    </svg>
  );
}

/** User menu "Profile". */
export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}

/** User menu "Log out". */
export function LogoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

/** `.note` in the payment-processing modal ("Don't close this screen"). */
export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
    </svg>
  );
}

/** Detail view bar: back arrow, step up / step down, expand to full page, collapse (`.dv-bar`). */
export function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}
export function ChevUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}
export function MaximizeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}
export function MinimizeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="M14 10l7-7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

/** Theme switch: sun and moon are the guideline's own (`.theme-toggle`); the "system" monitor is not in the guideline — a plain line icon in the same style. */
export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2.5)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)} fill="currentColor" stroke="none">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
export function MonitorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props, 2)}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
