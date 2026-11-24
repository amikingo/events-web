import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { IconTile } from "./icon-tile";
import type { IconTileTone } from "./icon-tile";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** `sm` for panels and drop zones, default for cards, `lg` for whole pages, `inline` for a one-line row. */
  size?: "sm" | "md" | "lg" | "inline";
  icon?: ReactNode;
  /** The tile colour carries the meaning: accent "nothing yet", charcoal "nothing found / locked", danger "could not load", warning offline, success "all done". */
  tone?: IconTileTone;
  /** Wrap the tile in the soft orbit ring. For full-page moments (`lg`) and the first-run onboarding state only. */
  ring?: boolean;
  /** Three small accent dots around the ring — first-run only. */
  sparks?: boolean;
  /** What is missing, in the user's words: "No bookings yet", never "Empty" or "No data". */
  title: ReactNode;
  /** One sentence: why, or what happens next (34 characters per line max). Put the query in `<code>`. */
  description?: ReactNode;
  /** Active-filter chips shown under the description (a "No filter matches" state). */
  chips?: ReactNode;
  /** `.empty-meta` — a muted line above the actions ("Last synced 10 min ago"). */
  meta?: ReactNode;
  /** At most one primary and one secondary action, or a text link. The primary is the thing that fills the space. */
  actions?: ReactNode;
  /** Fade the state in when it replaces another (search → no results). */
  animate?: boolean;
}

const ringTone: Record<IconTileTone, { disc: string; orbit: string }> = {
  accent: { disc: "bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]", orbit: "border-[color-mix(in_srgb,var(--color-accent)_35%,transparent)]" },
  charcoal: { disc: "bg-surface-2", orbit: "border-border-strong" },
  success: { disc: "bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)]", orbit: "border-[color-mix(in_srgb,var(--color-success)_35%,transparent)]" },
  danger: { disc: "bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)]", orbit: "border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)]" },
  warning: { disc: "bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)]", orbit: "border-[color-mix(in_srgb,var(--color-warning)_35%,transparent)]" },
};

/** `.empty` — icon tile (or ring), bold title, one muted line, optional chips, meta and actions. */
export function EmptyState({ size = "md", icon, tone = "accent", ring = false, sparks = false, title, description, chips, meta, actions, animate = false, className, ...props }: EmptyStateProps) {
  const inline = size === "inline";
  const tile = icon ? (
    <IconTile
      tone={tone}
      size={size === "sm" || inline ? (inline ? "md" : "sm") : "lg"}
      className={cn(ring ? "relative z-[1] shadow" : !inline && (size === "sm" ? "mb-0.5" : "mb-1.5"))}
    >
      {icon}
    </IconTile>
  ) : null;
  const body = (
    <>
      <b className={cn("block font-semibold text-text", size === "lg" ? "text-[18px]" : size === "sm" ? "text-[13px]" : "text-[15px]", "leading-[1.3]")}>{title}</b>
      {description && (
        <p
          className={cn(
            "m-0 text-text-faint",
            size === "lg" ? "max-w-[40ch] text-[13.5px]" : size === "sm" ? "max-w-[34ch] text-[12px]" : "max-w-[34ch] text-[12.5px]",
            inline && "max-w-none",
            "leading-normal [&_code]:rounded-item [&_code]:bg-surface-2 [&_code]:px-[5px] [&_code]:py-px [&_code]:font-mono [&_code]:text-[11.5px] [&_code]:text-text",
          )}
        >
          {description}
        </p>
      )}
    </>
  );
  return (
    <div
      className={cn(
        "flex w-full",
        inline ? "flex-row items-center gap-3 px-4 py-3.5 text-left" : "flex-col items-center text-center",
        size === "lg" && "gap-2.5 px-6 py-16",
        size === "md" && "gap-2 px-6 py-10",
        size === "sm" && "gap-1 px-4 py-[18px]",
        animate && "animate-emp-in",
        className,
      )}
      {...props}
    >
      {ring ? (
        <span className="relative mb-2.5 flex size-[88px] items-center justify-center" aria-hidden="true">
          <span className={cn("absolute inset-0 rounded-full", ringTone[tone].disc)} />
          <span className={cn("absolute inset-3 rounded-full border-[1.5px] border-dashed", ringTone[tone].orbit)} />
          {sparks && (
            <>
              <i className="absolute right-3.5 top-1.5 size-1.5 rounded-full bg-accent opacity-50" />
              <i className="absolute bottom-2.5 left-2 size-1 rounded-full bg-accent opacity-50" />
              <i className="absolute -right-0.5 top-[38px] size-[5px] rounded-full bg-accent opacity-30" />
            </>
          )}
          {tile}
        </span>
      ) : (
        tile
      )}
      {inline ? <div className="min-w-0 flex-1">{body}</div> : body}
      {chips && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{chips}</div>}
      {meta && <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-text-faint">{meta}</div>}
      {actions && <div className={cn("flex flex-wrap justify-center gap-2.5", inline ? "" : size === "sm" ? "mt-1.5" : "mt-2.5")}>{actions}</div>}
    </div>
  );
}

export interface DashedZoneProps extends HTMLAttributes<HTMLDivElement> {
  /** Hover / drag state: accent border and a faint accent wash. `dragging` also turns the dashes solid. */
  state?: "idle" | "dragging" | "error";
  hoverable?: boolean;
}

/** `.empty-dashed` — the dashed container for drop zones and "nothing here yet" areas. */
export function DashedZone({ state = "idle", hoverable = false, className, ...props }: DashedZoneProps) {
  return (
    <div
      className={cn(
        "rounded-md border-[1.5px] transition-[border-color,background-color]",
        state === "idle" && "border-dashed border-border-strong bg-surface-2",
        hoverable && state === "idle" && "cursor-pointer hover:border-accent hover:bg-[color-mix(in_srgb,var(--color-accent)_5%,var(--color-surface))]",
        state === "dragging" && "border-solid border-accent bg-[color-mix(in_srgb,var(--color-accent)_5%,var(--color-surface))]",
        state === "error" && "border-dashed border-danger bg-[color-mix(in_srgb,var(--color-danger)_5%,var(--color-surface))]",
        className,
      )}
      {...props}
    />
  );
}
