import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type IconTileTone = "accent" | "charcoal" | "success" | "warning" | "danger";

const toneClasses: Record<IconTileTone, string> = {
  accent: "bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--color-surface))] text-accent-text",
  charcoal: "bg-surface-2 text-text-soft",
  success: "bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface))] text-success-text",
  warning: "bg-[color-mix(in_srgb,var(--color-warning)_14%,var(--color-surface))] text-warning-text",
  danger: "bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-surface))] text-danger-text",
};
const sizeClasses = {
  sm: "size-8 rounded-sm [&_svg]:size-4",
  md: "size-10 rounded-tile [&_svg]:size-5",
  lg: "size-12 rounded-tile-lg [&_svg]:size-[22px]",
} as const;

export interface IconTileProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: IconTileTone;
  /** 32 / 40 / 48px. `lg` is the one empty states use. */
  size?: keyof typeof sizeClasses;
}

/** `.ic-tile` — an icon on a soft tinted rounded tile. Pass the icon (an `<svg>`) as children. */
export function IconTile({ tone = "accent", size = "md", className, ...props }: IconTileProps) {
  return <span className={cn("flex flex-none items-center justify-center", toneClasses[tone], sizeClasses[size], className)} {...props} />;
}
