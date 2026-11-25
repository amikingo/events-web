import { useSyncExternalStore } from "react";
import type { ApiAssignment } from "@/lib/api/auth";

/**
 * The roles ("assignments") the signed-in person holds and the one they are using now. Filled from every login,
 * refresh and switch response, so it is empty only until the first of those answers (right after a page reload).
 * In memory only: the assignment list is re-sent by the API on every refresh.
 */
export interface SessionRoles {
  assignments: ApiAssignment[];
  currentId: string | null;
}

const EMPTY: SessionRoles = { assignments: [], currentId: null };

let state: SessionRoles = EMPTY;
const listeners = new Set<() => void>();

export function setSessionRoles(assignments: ApiAssignment[], currentId: string): void {
  state = { assignments, currentId };
  listeners.forEach((l) => l());
}

export function clearSessionRoles(): void {
  if (state === EMPTY) return;
  state = EMPTY;
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => state;

export function useSessionRoles(): SessionRoles {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** "Selam Events · Owner", or "Platform · Super admin" for a role that belongs to no organization. */
export function describeAssignment(a: ApiAssignment): string {
  const where = a.organization?.name ?? "Platform";
  return a.branch ? `${where} · ${a.role.name} · ${a.branch.name}` : `${where} · ${a.role.name}`;
}
