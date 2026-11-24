"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Pill } from "./pill";
import { Toast } from "./toast";
import type { ToastAction, ToastIcon, ToastKind, ToastViewProps } from "./toast";

/* ───────────────────────────── store ───────────────────────────── */

export interface ToastActionContext {
  id: string;
  /** Replace this toast in place — "Undo" turns into "Booking restored". */
  update: (opts: Partial<ToastOptions>) => void;
  dismiss: () => void;
}

export interface ToastActionOption extends Omit<ToastAction, "onClick"> {
  /** Runs when clicked. If it doesn't update the toast, the toast dismisses itself. */
  onClick?: (ctx: ToastActionContext) => void;
}

export interface ToastOptions extends Omit<ToastViewProps, "title" | "actions" | "timerMs" | "timerPaused" | "onDismiss"> {
  title: ReactNode;
  actions?: ToastActionOption[];
  /** Milliseconds before it dismisses itself. Omit for a toast that stays until dismissed or acted on (errors, loading, progress, rich). */
  ms?: number;
  /** Use an id to update or replace an existing toast. */
  id?: string;
}

interface ToastItem extends ToastOptions {
  id: string;
  /** Bumped by every update — restarts the timer and tells an action whether the toast changed. */
  version: number;
  leaving?: boolean;
}

let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => items;
// useSyncExternalStore needs the same array every call; a fresh `[]` made React warn about an infinite loop in dev.
const serverSnapshot: ToastItem[] = [];
const getServerSnapshot = () => serverSnapshot;

function show(opts: ToastOptions): string {
  const id = opts.id ?? `toast-${++counter}`;
  const existing = items.find((t) => t.id === id);
  if (existing) {
    items = items.map((t) => (t.id === id ? { ...t, ...opts, id, version: t.version + 1, leaving: false } : t));
  } else {
    items = [{ ...opts, id, version: 0 }, ...items];
  }
  emit();
  return id;
}

function update(id: string, opts: Partial<ToastOptions>) {
  items = items.map((t) => (t.id === id ? { ...t, ...opts, version: t.version + 1 } : t));
  emit();
}

function dismiss(id?: string) {
  const target = id ? [id] : items.map((t) => t.id);
  items = items.map((t) => (target.includes(t.id) ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    items = items.filter((t) => !target.includes(t.id) || !t.leaving);
    emit();
  }, 200);
}

type Preset = Omit<ToastOptions, "title" | "kind" | "icon"> & { icon?: ToastIcon };
const withKind = (kind: ToastKind, icon: ToastIcon, ms?: number) => (title: ReactNode, opts: Preset = {}) => show({ kind, icon, ms, ...opts, title });

/**
 * The imperative API. Call it from anywhere in client code once a `<Toaster />` is mounted.
 *
 * | call | pattern | stays |
 * |---|---|---|
 * | `toast.success` | green, confirmation | 4s |
 * | `toast.error` | red, plain-language cause + a way forward | until dismissed |
 * | `toast.warning` | amber, needs attention soon | 6s |
 * | `toast.info` | accent, announcements | 4s |
 * | `toast.undo` | compact, "Undo" action | 5s |
 * | `toast.loading` / `toast.promise` | spinner → success or error in place | until settled |
 * | `toast()` | anything else: transactions, progress, rich, snackbar | as given |
 */
export const toast = Object.assign((opts: ToastOptions) => show(opts), {
  success: withKind("success", "check", 4000),
  error: withKind("danger", "x"),
  warning: withKind("warning", "warn", 6000),
  info: withKind("info", "info", 4000),
  /** A neutral compact toast with an Undo window the timer line makes visible. */
  undo: (title: ReactNode, opts: Preset & { onUndo?: ToastActionOption["onClick"] } = {}) => {
    const { onUndo, ...rest } = opts;
    return show({ kind: "neutral", icon: "undo", compact: true, ms: 5000, ...rest, title, actions: [{ label: "Undo", onClick: onUndo }] });
  },
  /** Spinner toast with no timer; finish it with `toast.update(id, …)` or use `toast.promise`. */
  loading: (title: ReactNode, opts: Preset = {}) => show({ kind: "neutral", icon: "loading", ...opts, title }),
  /** One toast for the whole async step: loading → success or error, in place. */
  promise: async <T,>(promise: Promise<T>, msgs: { loading: ReactNode; loadingBody?: ReactNode; success: ReactNode | ((v: T) => ReactNode); successBody?: ReactNode; error: ReactNode | ((e: unknown) => ReactNode); errorBody?: ReactNode }): Promise<T> => {
    const id = show({ kind: "neutral", icon: "loading", title: msgs.loading, body: msgs.loadingBody });
    try {
      const v = await promise;
      update(id, { kind: "success", icon: "check", title: typeof msgs.success === "function" ? msgs.success(v) : msgs.success, body: msgs.successBody, ms: 4000 });
      return v;
    } catch (e) {
      update(id, { kind: "danger", icon: "x", title: typeof msgs.error === "function" ? msgs.error(e) : msgs.error, body: msgs.errorBody, ms: undefined });
      throw e;
    }
  },
  /** The mobile snackbar: charcoal, one line, an accent action, 4s. */
  snackbar: (title: ReactNode, opts: Preset = {}) => show({ snackbar: true, kind: "neutral", ms: 4000, ...opts, title }),
  update,
  dismiss,
  clear: () => dismiss(),
});

/* ───────────────────────────── region ───────────────────────────── */

export interface ToasterProps {
  /** `viewport` (default) fixes the region to the screen; `parent` places it inside the nearest positioned ancestor (a demo stage). */
  container?: "viewport" | "parent";
  /** Distance in px from the top edge — set it to your header's height. Default 64. */
  offset?: number;
  /** The narrower 320px column 12px from the edge, for a toaster drawn inside a panel or stage (the detail view). */
  compact?: boolean;
  /** Visible toasts before the rest collapse into a "+N more" pill. Default 3. */
  max?: number;
  className?: string;
}

/**
 * `.toast-region` — mount once. One placement only: top-right on desktop, top-center below 640px. Newest toast on
 * top; from the `max + 1`th they collapse into a "+N more" pill. Hovering pauses every timer, and Escape dismisses
 * the newest toast.
 */
export function Toaster({ container = "viewport", offset = 64, max = 3, compact = false, className }: ToasterProps) {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [paused, setPaused] = useState(false);
  // Every toast stays mounted so its timer keeps running; the ones past `max` are only hidden (`display: none`).
  const active = list.filter((t) => !t.leaving);
  const shownIds = new Set(active.slice(0, max).map((t) => t.id));
  const hidden = active.length - shownIds.size;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const newest = items.find((t) => !t.leaving);
      if (newest) dismiss(newest.id);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ top: offset }}
      className={cn(
        "pointer-events-none z-[100] flex flex-col gap-2.5",
        container === "viewport" ? "fixed" : "absolute",
        // Phones: centered with a 16px gutter. Desktop: a 360px column at the right edge.
        "inset-x-4 items-center sm:inset-x-auto sm:items-stretch",
        compact ? "sm:right-3 sm:w-[320px] sm:max-w-[calc(100%-24px)]" : "sm:right-4 sm:w-[360px] sm:max-w-[calc(100%-32px)]",
        className,
      )}
    >
      {list.map((t) => (
        <ToastItemView key={t.id} item={t} paused={paused} hidden={!t.leaving && !shownIds.has(t.id)} />
      ))}
      {hidden > 0 && (
        <Pill tone="neutral" className="pointer-events-auto cursor-pointer self-center sm:self-end" onClick={() => active.filter((t) => shownIds.has(t.id)).forEach((t) => dismiss(t.id))}>
          +{hidden} more
        </Pill>
      )}
    </div>
  );
}

function ToastItemView({ item, paused, hidden }: { item: ToastItem; paused: boolean; hidden: boolean }) {
  const { id, version, leaving, ms, actions, ...view } = item;

  // Timer with pause / resume: tracks how much time is left across hovers and restarts when the toast is updated.
  const remaining = useRef(ms ?? 0);
  const startedAt = useRef(0);
  useEffect(() => {
    remaining.current = ms ?? 0;
  }, [version, ms]);
  useEffect(() => {
    if (!ms || leaving || paused) return;
    startedAt.current = Date.now();
    const t = setTimeout(() => dismiss(id), remaining.current);
    return () => {
      clearTimeout(t);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [id, ms, version, paused, leaving]);

  const wrapped: ToastAction[] | undefined = actions?.map((a) => ({
    label: a.label,
    soft: a.soft,
    onClick: () => {
      const before = version;
      a.onClick?.({ id, update: (o) => update(id, o), dismiss: () => dismiss(id) });
      // An action that leaves the toast untouched closes it.
      if (items.find((t) => t.id === id)?.version === before) dismiss(id);
    },
  }));

  return (
    <div className={cn(hidden ? "hidden" : "flex w-full justify-center sm:block", leaving ? "animate-toast-out" : "max-sm:animate-toast-down sm:animate-toast-in")}>
      <Toast {...view} actions={wrapped} timerMs={ms} timerKey={version} timerPaused={paused} onDismiss={() => dismiss(id)} />
    </div>
  );
}
