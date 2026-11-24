"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export const SIDEBAR_MIN = 180;
export const SIDEBAR_MAX = 320;
export const SIDEBAR_DEFAULT = 200;
export const SIDEBAR_COLLAPSED = 68;
/** Dragging the resizer narrower than this collapses the sidebar. */
export const SIDEBAR_SNAP = 120;

interface ShellContextValue {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  width: number;
  setWidth: (width: number, persist?: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  shellEl: HTMLDivElement | null;
}

const ShellContext = createContext<ShellContextValue | null>(null);

/** The shell's sidebar state: collapsed, width, and the mobile drawer. Use inside `<AppShell>`. */
export function useAppShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useAppShell() must be used inside <AppShell>");
  return ctx;
}

/** Like `useAppShell`, but `null` outside an `<AppShell>` — for parts that may also sit in a layout without a sidebar. */
export function useOptionalAppShell(): ShellContextValue | null {
  return useContext(ShellContext);
}

export interface AppShellProps {
  /** A `<Sidebar>`. */
  sidebar: ReactNode;
  /** A `<Topbar>`. */
  topbar: ReactNode;
  /** The page. Goes in `.app-main` (18px / 20px padding, scrolls). */
  children: ReactNode;
  defaultCollapsed?: boolean;
  /** localStorage key that remembers the dragged sidebar width. Default `cheche-sb-w`. */
  storageKey?: string;
  /** On the shell's outer box. Give it a height (`h-dvh`) and the sidebar and the page scroll inside it instead of the window. */
  className?: string;
  /** Classes for the scrolling page area, e.g. `!p-0` when the pages pad themselves. */
  mainClassName?: string;
}

/**
 * The admin layout (Navigation > app shell): a sidebar card and a main card side by side with a 4px gap, a top bar
 * above the page. Below 760px the sidebar becomes a slide-over drawer with a backdrop; the top bar shows the menu toggle.
 */
export function AppShell({ sidebar, topbar, children, defaultCollapsed = false, storageKey = "cheche-sb-w", className, mainClassName }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [width, setWidthState] = useState(SIDEBAR_DEFAULT);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shellEl, setShellEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem(storageKey) ?? "", 10);
      if (saved) setWidthState(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, saved)));
    } catch {
      /* storage unavailable — keep the default */
    }
  }, [storageKey]);

  function setWidth(next: number, persist = false) {
    const max = shellEl ? Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, shellEl.clientWidth * 0.4)) : SIDEBAR_MAX;
    const w = Math.max(SIDEBAR_MIN, Math.min(max, Math.round(next)));
    setWidthState(w);
    if (persist) {
      try {
        localStorage.setItem(storageKey, String(w));
      } catch {
        /* ignore */
      }
    }
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <ShellContext.Provider value={{ collapsed, setCollapsed, width, setWidth, mobileOpen, setMobileOpen, shellEl }}>
      {/* A flex column, so a height on the outer box (`h-dvh`) reaches the row below and the sidebar and page scroll inside it. */}
      <div ref={setShellEl} className={cn("relative flex w-full flex-col", className)}>
        <div className="relative flex min-h-[360px] flex-1 items-stretch max-[760px]:overflow-hidden max-[760px]:rounded-md">
          {mobileOpen && <div className="absolute inset-0 z-20 bg-overlay-nav" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
          {sidebar}
          <div className="m-3 ml-0.5 flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-surface shadow max-[760px]:m-0 max-[760px]:w-full max-[760px]:rounded-none max-[760px]:border-0">
            {topbar}
            <div className={cn("min-w-0 flex-1 overflow-auto px-5 py-[18px]", mainClassName)}>{children}</div>
          </div>
        </div>
      </div>
    </ShellContext.Provider>
  );
}
