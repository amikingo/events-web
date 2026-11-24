"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Spinner } from "./spinner";

export type LoadingPhase = "done" | "quiet" | "skeleton" | "slow" | "stuck";

export interface LoadingTimings {
  /** Show nothing for this long (default 300ms) so quick loads never flash. */
  skeletonAfter?: number;
  /** After this, add a "Still loading…" message (default 3000ms). */
  slowAfter?: number;
  /** After this, offer Retry or Cancel (default 10000ms). */
  stuckAfter?: number;
  /** Change it to start a fresh load while `loading` stays true (a "Reload" pressed mid-load) — the timeline restarts from zero. */
  restartKey?: unknown;
}

/**
 * The guideline's timeline as a hook: 0–300ms nothing, 300ms–3s skeleton, after 3s a message, after 10s Retry / Cancel.
 * `done` when `loading` is false.
 */
export function useLoadingPhase(loading: boolean, { skeletonAfter = 300, slowAfter = 3000, stuckAfter = 10000, restartKey }: LoadingTimings = {}): LoadingPhase {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!loading) return;
    const started = Date.now();
    const timers = [skeletonAfter, slowAfter, stuckAfter].map((ms) => setTimeout(() => setElapsed(Date.now() - started), ms + 5));
    return () => timers.forEach(clearTimeout);
  }, [loading, skeletonAfter, slowAfter, stuckAfter, restartKey]);
  if (!loading) return "done";
  if (elapsed >= stuckAfter) return "stuck";
  if (elapsed >= slowAfter) return "slow";
  if (elapsed >= skeletonAfter) return "skeleton";
  return "quiet";
}

export interface LoadableProps extends LoadingTimings {
  loading: boolean;
  /** The skeleton to show while loading — same layout as the content, so nothing shifts when it arrives. */
  skeleton: ReactNode;
  children: ReactNode;
  /** After 10s: a Retry button. */
  onRetry?: () => void;
  /** After 10s: a Cancel button. */
  onCancel?: () => void;
  /** After 3s: the centered message (`.ld-center`) — a bold line and a muted one under it. */
  slowMessage?: ReactNode;
  slowHint?: ReactNode;
  /** After 10s. */
  stuckMessage?: ReactNode;
  stuckHint?: ReactNode;
  className?: string;
}

/**
 * Applies the loading timeline to a region: nothing for 300ms, then `skeleton`, then "Still loading…", then Retry /
 * Cancel. When `loading` ends the content fades in over 300ms. Loading never blocks the whole app for one widget.
 */
export function Loadable({ loading, skeleton, children, onRetry, onCancel, slowMessage = "Still loading…", slowHint = "This usually takes a second.", stuckMessage = "This is taking longer than usual", stuckHint = "You can retry or cancel.", className, ...timings }: LoadableProps) {
  const phase = useLoadingPhase(loading, timings);
  if (phase === "done") return <div className={cn("animate-ld-fade", className)}>{children}</div>;
  if (phase === "quiet") return <div className={className} aria-busy="true" />;
  return (
    <div className={className} aria-busy="true">
      {skeleton}
      {(phase === "slow" || phase === "stuck") && (
        <div className="flex w-full flex-col items-center justify-center gap-3 px-4 py-8 text-center text-[12.5px] text-text-faint">
          <Spinner size="lg" />
          <b className="text-[13.5px] font-semibold text-text">{phase === "slow" ? slowMessage : stuckMessage}</b>
          <span>{phase === "slow" ? slowHint : stuckHint}</span>
          {phase === "stuck" && (onRetry || onCancel) && (
            <span className="flex gap-2.5">
              {onRetry && (
                <Button className="h-[30px] px-[11px] py-[5px] text-[13px]" onClick={onRetry}>
                  Retry
                </Button>
              )}
              {onCancel && (
                <Button variant="secondary" className="h-[30px] px-[11px] py-[5px] text-[13px]" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
