import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type PillTone = "accent" | "info" | "success" | "warning" | "danger" | "neutral";
export type PillSize = "sm" | "md" | "lg";
export type PillVariant = "tinted" | "outline" | "solid";

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  /** success (done, valid, paid) · warning (waiting, due soon, low) · danger (failed, expired, cancelled) · neutral (finished, inactive, archived) · info / accent (in progress, new, highlighted). */
  tone?: PillTone;
  size?: PillSize;
  /** `tinted` (default) is a 14% wash; `outline` for dense tables and on tinted surfaces; `solid` once per screen for the single most important state. */
  variant?: PillVariant;
  /** Leading currentColor dot — live status that changes over time. Plain pills are for fixed labels (a role, a category). */
  dot?: boolean;
  /** Shorthand for `variant="solid"`. */
  solid?: boolean;
}

const toneClasses: Record<PillTone, { tinted: string; outline: string; solid: string }> = {
  accent: {
    tinted: "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-accent-text",
    outline: "text-accent-text",
    solid: "bg-accent-fill text-white",
  },
  info: {
    tinted: "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-accent-text",
    outline: "text-accent-text",
    solid: "bg-accent-fill text-white",
  },
  success: {
    tinted: "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-success-text",
    outline: "text-success-text",
    solid: "bg-success-fill text-white",
  },
  warning: {
    tinted: "bg-[color-mix(in_srgb,var(--color-warning)_16%,transparent)] text-warning-text",
    outline: "text-warning-text",
    solid: "bg-warning-fill text-white",
  },
  danger: {
    tinted: "bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-danger-text",
    outline: "text-danger-text",
    solid: "bg-danger-fill text-white",
  },
  neutral: {
    tinted: "bg-surface-2 text-text-soft",
    outline: "border-border-strong text-text-soft",
    solid: "bg-charcoal text-surface",
  },
};

const sizeClasses: Record<PillSize, string> = {
  sm: "text-[11px] px-[7px] py-0.5 gap-[5px] [&_svg]:size-3",
  md: "text-[12px] px-2.5 py-1 gap-[5px] [&_svg]:size-3",
  lg: "text-[12px] px-3 py-1.5 gap-[5px] [&_svg]:size-3.5",
};

const dotSizeClasses: Record<PillSize, string> = {
  sm: "size-[5px]",
  md: "size-1.5",
  lg: "size-[7px]",
};

/** Matches the guideline's `.pill` — see #comp-badges. Two words max; read-only (the interactive pill is `<Chip>`). Icons passed as children are drawn at stroke 2.5 in the pill's colour. */
export function Pill({ className, tone = "accent", size = "md", variant, dot = false, solid = false, children, ...props }: PillProps) {
  const v: PillVariant = variant ?? (solid ? "solid" : "tinted");
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap align-middle rounded-full font-bold [&_svg]:flex-none [&_svg]:stroke-[2.5]",
        sizeClasses[size],
        v === "outline" && "border border-current bg-transparent",
        toneClasses[tone][v],
        // After the size class: tailwind-merge drops an earlier leading-* when a text-size class follows it.
        "leading-[1.4]",
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("mr-px inline-block shrink-0 rounded-full bg-current", dotSizeClasses[size])} aria-hidden="true" />}
      {children}
    </span>
  );
}
