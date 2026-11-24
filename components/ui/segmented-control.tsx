"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CountBadge } from "./count-badge";

export interface SegmentedOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  /** `.count.inline.soft` after the label. */
  count?: number;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** `accent` fills the active item pink instead of lifting it onto a white pill. */
  tone?: "neutral" | "accent";
  size?: "md" | "sm";
  /** Stretch to the container; items share the width equally. */
  block?: boolean;
  "aria-label"?: string;
  className?: string;
}

/** `.seg` — a 36px track on `surface-2` with one lifted active item. Arrow keys move the selection. */
export function SegmentedControl({ options, value, onValueChange, tone = "neutral", size = "md", block = false, className, ...props }: SegmentedControlProps) {
  const ref = useRef<HTMLDivElement>(null);
  const sm = size === "sm";

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const next = items[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
    next?.focus();
    next?.click();
  }

  return (
    <div
      ref={ref}
      role="radiogroup"
      onKeyDown={onKeyDown}
      className={cn(
        "items-center gap-0.5 rounded-btn border border-border bg-surface-2",
        block ? "flex w-full" : "inline-flex",
        sm ? "h-[30px] p-0.5" : "h-9 p-[3px]",
        className,
      )}
      {...props}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(o.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-item transition-[background-color,color,box-shadow] disabled:cursor-not-allowed disabled:opacity-40",
              sm ? "h-6 px-2.5 text-[12px]" : "h-7 px-3 text-[13px]",
              block && "flex-1",
              active
                ? tone === "accent"
                  ? "bg-accent-fill font-semibold text-white shadow-seg-accent"
                  : "bg-surface font-semibold text-text shadow-seg"
                : "font-medium text-text-soft hover:text-text disabled:hover:text-text-soft",
              "[&_svg]:size-3.5 [&_svg]:flex-none",
            )}
          >
            {o.icon}
            {o.label}
            {o.count !== undefined && (
              <CountBadge inline soft className="ml-0.5 h-4 min-w-4 text-[9.5px]">
                {o.count}
              </CountBadge>
            )}
          </button>
        );
      })}
    </div>
  );
}
