"use client";

import type { ButtonHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { XIcon } from "./icons";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  /** `.chip-x` — renders the small remove "×" inside the chip (applied-filter chips, multi-select values). */
  onRemove?: () => void;
  removeLabel?: string;
  /** An `<Avatar size={18}>` or `<PayLogo size={18}>` before the label (pulled 5px into the padding). */
  leading?: ReactNode;
}

/** `.pill.chip` — the filter-chip / tab-like toggle used in `.chip-row`, `.tbl-toolbar-sub`, etc. */
export function Chip({ className, selected = false, onRemove, removeLabel = "Remove", leading, children, ...props }: ChipProps) {
  function remove(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
    onRemove?.();
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-[11px] py-[5px] text-[12px] font-medium leading-[1.4] transition-colors",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] border border-accent text-accent-text font-semibold"
          : "bg-surface border border-border-strong text-text-soft hover:bg-surface-2 hover:text-text",
        className,
      )}
      {...props}
    >
      {leading && <span className="-ml-[5px] inline-flex">{leading}</span>}
      {children}
      {onRemove && (
        <span
          role="button"
          tabIndex={-1}
          aria-label={removeLabel}
          onClick={remove}
          className="-mr-1 ml-0.5 inline-flex size-4 items-center justify-center rounded-full opacity-60 hover:bg-[color-mix(in_srgb,currentColor_14%,transparent)] hover:opacity-100"
        >
          <XIcon className="size-2.5" />
        </span>
      )}
    </button>
  );
}
