import type { NavigationNode, PermissionAction, PermissionMatrix, StaffSession } from "@/lib/auth-token";
import { normalizeModuleCode } from "@/lib/constants/modules";

/** What one role may do, per module, as `/me` reports it. The only source of access decisions in the app. */
export interface ModuleAccess {
  code: string;
  actions: PermissionMatrix;
}

export interface EffectiveAccess {
  modules: ModuleAccess[];
  /** The backend's menu for this role: already filtered by `view` and ordered by `sno`. */
  navigation: NavigationNode[];
}

const ACTIONS: PermissionAction[] = ["view", "create", "update", "delete", "import", "export", "notify"];

/** `/me` → `{ modules, navigation }`. A module the backend didn't list has no access; nothing is assumed. */
export function parseEffectiveAccess(session: Pick<StaffSession, "permissions" | "navigation">): EffectiveAccess {
  return {
    modules: Object.entries(session.permissions).map(([code, matrix]) => ({
      code: normalizeModuleCode(code),
      actions: Object.fromEntries(ACTIONS.map((a) => [a, matrix[a] === true])) as PermissionMatrix,
    })),
    navigation: session.navigation,
  };
}
