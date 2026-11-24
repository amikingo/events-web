"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Spinner } from "./spinner";

export interface PullToRefreshProps {
  /** Resolve when the refresh finishes; the strip stays until then. */
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
  /** How far (px) to pull before releasing refreshes. Default 64. */
  threshold?: number;
  className?: string;
}

const STRIP = 39.4;

/**
 * Mobile lists: pulling down at the top of the scroll area shows the small spinner strip above the first row
 * (`.ptr`) and refreshes on release. Touch only — on desktop it renders its children untouched.
 */
export function PullToRefresh({ onRefresh, children, threshold = 64, className }: PullToRefreshProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  async function release() {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= threshold) {
      setRefreshing(true);
      setPull(STRIP);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else setPull(0);
  }

  const height = refreshing ? STRIP : Math.min(pull, STRIP);
  return (
    <div
      ref={ref}
      className={cn("overflow-y-auto overscroll-contain", className)}
      onTouchStart={(e) => {
        if (!refreshing && (ref.current?.scrollTop ?? 1) <= 0) startY.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchMove={(e) => {
        if (startY.current === null || refreshing) return;
        const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
        setPull(dy > 0 ? dy * 0.5 : 0);
      }}
      onTouchEnd={release}
      onTouchCancel={release}
    >
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center gap-2 overflow-hidden border-b border-border bg-surface-2 text-[11.5px] text-text-faint transition-[height] duration-(--motion-fast)"
        style={{ height: pull > 0 || refreshing ? height : 0, borderBottomWidth: pull > 0 || refreshing ? 1 : 0 }}
      >
        {(pull > 0 || refreshing) && (
          <>
            <Spinner className="size-3.5" />
            {refreshing ? "Refreshing…" : pull >= threshold ? "Release to refresh" : "Pull to refresh"}
          </>
        )}
      </div>
      {children}
    </div>
  );
}
