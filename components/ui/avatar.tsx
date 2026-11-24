import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type AvatarSize = 18 | 24 | 32 | 36 | 48;

const sizeClasses: Record<AvatarSize, string> = {
  18: "size-[18px] rounded-check text-[8px]",
  24: "size-6 rounded-btn text-[9px]",
  32: "size-8 rounded-sm text-[11px]",
  36: "size-9 rounded-sm text-[12.5px]",
  48: "size-12 rounded-md text-[15px]",
};

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Initials shown on the tile. */
  initials: string;
  /** px — the guideline's contexts: 18 chip, 24 option row, 32 toast, 36 default, 48 detail header. */
  size?: AvatarSize;
}

/** `.avatar` — initials on an accent-tinted rounded tile (not a circle). */
export function Avatar({ initials, size = 36, className, ...props }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center justify-center border border-border bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--color-surface))] font-bold text-accent-text",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {initials}
    </span>
  );
}
