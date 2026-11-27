"use client";

import { useEffect, useRef } from "react";

/** setTimeout can't wait longer than this (about 24 days). */
const MAX_DELAY = 2_147_483_647;

/**
 * Calls `onPass` once the earliest of the given instants that is still ahead has passed (a second after, so the server
 * agrees). Used for scheduled prices (Phase 11): fetch again when a price changes. Instants already past on load are
 * ignored, so a browser clock that runs ahead can't make it call over and over.
 */
export function useAtTime(times: (string | null | undefined)[], onPass: () => void): void {
  const callback = useRef(onPass);
  useEffect(() => {
    callback.current = onPass;
  });
  const key = times.filter(Boolean).join("|");
  useEffect(() => {
    const now = Date.now();
    const ahead = key
      .split("|")
      .map((t) => Date.parse(t))
      .filter((t) => t > now);
    if (ahead.length === 0) return;
    const timer = window.setTimeout(() => callback.current(), Math.min(MAX_DELAY, Math.min(...ahead) - now + 1000));
    return () => window.clearTimeout(timer);
  }, [key]);
}
