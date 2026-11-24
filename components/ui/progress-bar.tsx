import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type ProgressTone = "success" | "warning" | "danger" | "accent" | "neutral";

const toneClasses: Record<ProgressTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  accent: "bg-accent",
  neutral: "bg-border-strong",
};

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  /** 0–100. */
  value: number;
  tone?: ProgressTone;
  /** Track height in px — 5 by default (`.stock-bar`), 4 for the password meter. */
  height?: 4 | 5 | 6;
  /** Total unknown: a bar slides back and forth instead of filling. Under reduced motion it becomes a faint full bar. */
  indeterminate?: boolean;
}

/** `.stock-bar` — a thin full-radius track on `border` with a filled bar; width and color animate. */
export function ProgressBar({ value, tone = "success", height = 5, indeterminate = false, className, ...props }: ProgressBarProps) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(v)}
      className={cn("overflow-hidden rounded-full bg-border", indeterminate && "relative", height === 4 ? "h-1" : height === 6 ? "h-1.5" : "h-[5px]", className)}
      {...props}
    >
      <i
        className={cn(
          "block h-full rounded-full transition-[width,background-color] duration-(--motion-base)",
          indeterminate && "absolute left-0 top-0 w-[40%] animate-indet motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40",
          toneClasses[indeterminate ? "accent" : tone],
        )}
        style={indeterminate ? undefined : { width: `${v}%` }}
      />
    </div>
  );
}
