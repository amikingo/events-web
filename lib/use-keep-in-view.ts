"use client";

import { useLayoutEffect } from "react";
import type { RefObject } from "react";

/**
 * Keeps a popover that hangs from its trigger fully inside the viewport: after it opens, if it sticks out past the left or right
 * edge (a right-aligned panel whose trigger wrapped to the left on a phone, a wide picker near the right edge) it is nudged
 * sideways by exactly that overflow. Runs once per open; the trigger's own alignment stays the default.
 */
export function useKeepInView(ref: RefObject<HTMLElement | null>, open: boolean, margin = 8) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    el.style.transform = "";
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    let dx = 0;
    if (r.left < margin) dx = margin - r.left;
    else if (r.right > vw - margin) dx = vw - margin - r.right;
    // A panel wider than the screen can't fit; pin its left edge in view rather than push it further.
    if (r.width > vw - margin * 2) dx = margin - r.left;
    if (dx) el.style.transform = `translateX(${Math.round(dx)}px)`;
  }, [ref, open, margin]);
}
