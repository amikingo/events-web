"use client";

import { cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type TooltipSide = "top" | "right" | "bottom" | "left";

const sideClass: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  right: "left-full top-1/2 ml-3 -translate-y-1/2",
  left: "right-full top-1/2 mr-3 -translate-y-1/2",
};

export interface TooltipBubbleProps extends HTMLAttributes<HTMLSpanElement> {
  side?: TooltipSide;
  /** Shown or hidden. Leave out when CSS decides (`group-hover/tip:opacity-100` from the trigger). */
  open?: boolean;
}

/**
 * `.tooltip` — the bubble itself: a charcoal chip (11–12px, one line) that sits beside its trigger and never takes
 * clicks. Use it directly when the trigger can't be wrapped (a sidebar item): give the trigger `relative group/tip` and
 * this `className="opacity-0 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100"`. Otherwise use `Tooltip`.
 */
export function TooltipBubble({ side = "top", open, className, children, ...props }: TooltipBubbleProps) {
  return (
    <span
      role="tooltip"
      {...props}
      className={cn(
        "pointer-events-none absolute z-[70] whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-charcoal)] px-2.5 py-1.5 text-[12px] font-medium leading-none text-[var(--color-surface)] shadow-[var(--shadow)]",
        "transition-opacity duration-150 motion-reduce:transition-none",
        sideClass[side],
        open === undefined ? "" : open ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface TooltipProps {
  /** The text. One short line: a name or a hint, never a sentence. */
  content: ReactNode;
  /** Which side of the trigger it opens on. Default `top`. */
  side?: TooltipSide;
  /** Wait before it appears on hover (ms) — keeps it from flickering as the pointer passes. Default 150. Focus shows it at once. */
  delay?: number;
  /** The trigger: an icon button, a truncated label… It gets `aria-describedby` pointing at the tooltip. */
  children: ReactNode;
  className?: string;
}

/**
 * `.tooltip` — a short label for something that has no room for one (an icon-only button, a cut-off name). Appears on
 * hover after a beat and at once on keyboard focus, and Esc dismisses it. It never holds anything you need to click
 * or read twice; longer help belongs in a `Note` or a field hint.
 */
export function Tooltip({ content, side = "top", delay = 150, children, className }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setOpen(false);
  }, []);
  const show = (immediate = false) => {
    window.clearTimeout(timer.current);
    if (immediate) setOpen(true);
    else timer.current = window.setTimeout(() => setOpen(true), delay);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hide]);

  const trigger = isValidElement(children) ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, { "aria-describedby": id }) : children;

  return (
    <span className={cn("relative inline-flex", className)} onMouseEnter={() => show()} onMouseLeave={hide} onFocus={() => show(true)} onBlur={hide}>
      {trigger}
      <TooltipBubble id={id} side={side} open={open}>
        {content}
      </TooltipBubble>
    </span>
  );
}
