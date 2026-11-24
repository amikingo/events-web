"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CheckIcon } from "./icons";

/** Wraps the matched part of `text` in the guideline's accent `<mark>`. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-accent">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** `.select-group` — the small uppercase label above a group of options. */
export function OptionGroupLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 pb-[3px] pt-[9px] text-[11px] font-bold uppercase tracking-[0.6px] text-text-faint">{children}</div>;
}

export interface OptionRowProps {
  /** Leading visual: an avatar, pay logo or a 14px `.opt-ic` icon. */
  leading?: ReactNode;
  label: ReactNode;
  /** `.opt-sub` — the muted 11.5px sub-line text beside the label. */
  sub?: ReactNode;
  /** `.opt-right` — a pill or status at the far right. */
  right?: ReactNode;
  active?: boolean;
  /** Show the accent check when `active` (single-select combobox). Search rows don't. */
  check?: boolean;
  onSelect: () => void;
}

/** `.select-option` with `.opt-wrap` — one row of a combobox / search panel. */
export function OptionRow({ leading, label, sub, right, active = false, check = false, onSelect }: OptionRowProps) {
  return (
    <div
      role="option"
      tabIndex={0}
      aria-selected={active}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 px-3 py-[9px] text-[13.5px] text-text hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none",
        active && "bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))] font-semibold text-accent-text",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 [&_svg]:size-3.5 [&_svg]:flex-none [&_svg]:text-text-faint">
        {leading}
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
        {sub && <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] font-normal text-text-faint">{sub}</span>}
      </span>
      {right && <span className="ml-auto flex flex-none items-center gap-2">{right}</span>}
      {check && active && <CheckIcon className="size-3.5 flex-none text-accent" />}
    </div>
  );
}

/** `.cmdk-empty` — "No branches match". */
export function OptionEmpty({ children }: { children: ReactNode }) {
  return <div className="px-3 py-[18px] text-center text-[12.5px] text-text-faint">{children}</div>;
}
