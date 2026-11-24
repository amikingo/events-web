"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny external store over localStorage / sessionStorage for the frontend-only mocks (session, orders, checkout
 * draft). Snapshots are cached by raw string so `useSyncExternalStore` gets a stable reference, other tabs are picked
 * up through the `storage` event, and every access is wrapped because storage can be unavailable (private mode).
 */
export interface StorageStore<T> {
  get: () => T;
  set: (next: T) => void;
  update: (fn: (prev: T) => T) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStorageStore<T>(key: string, fallback: T, area: "local" | "session" = "local"): StorageStore<T> {
  let cache: { raw: string | null; value: T } | null = null;
  const listeners = new Set<() => void>();

  const storage = (): Storage | null => {
    if (typeof window === "undefined") return null;
    try {
      return area === "local" ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  };

  const get = (): T => {
    const s = storage();
    if (!s) return cache?.value ?? fallback;
    let raw: string | null = null;
    try {
      raw = s.getItem(key);
    } catch {
      return cache?.value ?? fallback;
    }
    if (cache && cache.raw === raw) return cache.value;
    let value = fallback;
    if (raw) {
      try {
        value = JSON.parse(raw) as T;
      } catch {
        value = fallback;
      }
    }
    cache = { raw, value };
    return value;
  };

  const set = (next: T) => {
    const raw = JSON.stringify(next);
    try {
      storage()?.setItem(key, raw);
    } catch {
      /* storage full or blocked: keep the value in memory for this tab */
    }
    cache = { raw, value: next };
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  return { get, set, update: (fn) => set(fn(get())), subscribe };
}

const serverSnapshot = () => undefined;

/** The store's value, or `undefined` during server render and hydration (render a skeleton then). */
export function useStorageStore<T>(store: StorageStore<T>): T | undefined {
  return useSyncExternalStore<T | undefined>(store.subscribe, store.get, serverSnapshot);
}

/* ───────── A one-second clock for countdowns and "now"-dependent UI ───────── */

const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (!clockTimer) clockTimer = setInterval(() => clockListeners.forEach((l) => l()), 1000);
  return () => {
    clockListeners.delete(listener);
    if (!clockListeners.size && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

const nowSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
const noClock = () => 0;

/** Current time to the second, re-rendering every second; `0` on the server (treat as "not known yet"). */
export function useNow(): number {
  return useSyncExternalStore(subscribeClock, nowSnapshot, noClock);
}

/** Current time without ticking — read once after hydration; `0` on the server. */
const noop = () => () => {};
export function useMountedNow(): number {
  return useSyncExternalStore(noop, nowSnapshot, noClock);
}
