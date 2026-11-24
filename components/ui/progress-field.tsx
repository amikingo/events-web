import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { ProgressBar } from "./progress-bar";
import type { ProgressTone } from "./progress-bar";
import { Spinner } from "./spinner";

export interface ProgressFieldProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  /** 0–100 for a determinate bar. Omit it for the indeterminate sliding bar (total unknown) with a spinner on the right. */
  value?: number;
  /** `success` once done, `danger` when it failed. */
  tone?: Extract<ProgressTone, "accent" | "success" | "danger">;
  /** The muted line under the bar ("794 of 1,240 rows · ~12s left"). */
  hint?: ReactNode;
}

/**
 * `.prog` — label on the left, percent on the right, a 6px accent bar, an optional hint line. Determinate when you know
 * the total (uploads, exports, steps); indeterminate when you don't. Always a label and a percent or count.
 */
export function ProgressField({ label, value, tone = "accent", hint, className, ...props }: ProgressFieldProps) {
  const determinate = value !== undefined;
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)} {...props}>
      <div className="flex items-center justify-between text-[12.5px] text-text-soft">
        <span>{label}</span>
        {determinate ? <b className="font-semibold tabular-nums text-text">{Math.round(value)}%</b> : <Spinner className="size-3.5" />}
      </div>
      <ProgressBar value={determinate ? value : 0} indeterminate={!determinate} tone={tone} height={6} aria-label={typeof label === "string" ? label : undefined} />
      {hint && <div className="text-[11.5px] text-text-faint">{hint}</div>}
    </div>
  );
}

export interface TopProgressProps {
  /** `run` crawls toward 92% while a route loads; `done` snaps to 100% and fades. `idle` renders nothing. */
  state: "idle" | "run" | "done";
  className?: string;
}

/** `.topline` — the 3px accent line along the top edge of the app for route changes in admin apps. Place it in a `relative` shell. */
export function TopProgress({ state, className }: TopProgressProps) {
  if (state === "idle") return null;
  return (
    <div role="progressbar" aria-label="Loading page" className={cn("absolute inset-x-0 top-0 z-[5] h-[3px] overflow-hidden", className)}>
      <i
        className={cn(
          "block h-full bg-accent shadow-topline",
          state === "run" ? "w-0 animate-topline motion-reduce:w-[92%] motion-reduce:animate-none" : "w-full opacity-0 transition-[width,opacity] duration-(--motion-base)",
        )}
      />
    </div>
  );
}
