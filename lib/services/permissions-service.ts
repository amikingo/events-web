import { useEffect, useSyncExternalStore } from "react";
import { getStaffMe } from "@/lib/api/auth";
import type { NavigationNode } from "@/lib/api/auth";

/**
 * What the signed-in role may do, from `GET /v1/auth/staff/me`. This only decides which buttons to show. The server
 * checks permissions on every request anyway, so a missing button is a convenience, never the protection.
 */
export type PermissionAction = "view" | "create" | "update" | "delete" | "import" | "export" | "notify";
type Matrix = Partial<Record<PermissionAction, boolean>>;

export interface PermissionsState {
  status: "idle" | "loading" | "ready" | "error";
  permissions: Record<string, Matrix>;
  /** The menu the API builds for this role. Empty until `/me` answers. */
  navigation: NavigationNode[];
}

const INITIAL: PermissionsState = { status: "idle", permissions: {}, navigation: [] };

let state: PermissionsState = INITIAL;
const listeners = new Set<() => void>();

function set(next: PermissionsState): void {
  state = next;
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => state;

/** Loads `/me` once. After the role changes, call `resetPermissions()` and then `loadPermissions({ force: true })`. */
export async function loadPermissions({ force = false } = {}): Promise<void> {
  if (!force && (state.status === "loading" || state.status === "ready")) return;
  set({ ...state, status: "loading" });
  try {
    const me = await getStaffMe();
    set({ status: "ready", permissions: me.permissions as Record<string, Matrix>, navigation: me.navigation });
  } catch {
    set({ status: "error", permissions: {}, navigation: [] });
  }
}

export function resetPermissions(): void {
  set(INITIAL);
}

/** `can("BRANCHES", "create")`. False until `/me` has answered, so actions never flash and vanish. */
export function usePermissions(): { ready: boolean; can: (module: string, action: PermissionAction) => boolean } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void loadPermissions();
  }, []);
  return { ready: snapshot.status === "ready", can: (module, action) => snapshot.permissions[module]?.[action] === true };
}

/** The menu the API builds for the role in use (`/me` → `navigation`). Loads `/me` once, like `usePermissions`. */
export function useNavigation(): NavigationNode[] {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void loadPermissions();
  }, []);
  return snapshot.navigation;
}
