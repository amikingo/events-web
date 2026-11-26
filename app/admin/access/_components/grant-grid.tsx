"use client";

import type { GrantAction, GrantableModule, RoleGrantInput } from "@/lib/api/roles";

export const ALL_GRANT_ACTIONS: readonly GrantAction[] = [
  "view",
  "create",
  "update",
  "delete",
  "import",
  "export",
  "notify",
];

/**
 * Fallback used only when the Super Admin opens Role Templates on a brand-new platform before any organization exists
 * to query `/organizations/:id/grantable-modules`. As soon as any organization exists, the API list replaces this.
 */
export const DEFAULT_GRANTABLE_FALLBACK: readonly GrantableModule[] = [
  { module_code: "ORGANIZATIONS", module_name: "Organizations", sno: 1, actions: ["view", "update", "import", "export", "notify"] },
  { module_code: "BRANCHES", module_name: "Branches", sno: 2, actions: ALL_GRANT_ACTIONS.slice() },
  { module_code: "ROLES", module_name: "Roles", sno: 3, actions: ALL_GRANT_ACTIONS.slice() },
  { module_code: "USER_ROLES", module_name: "Staff Assignments", sno: 4, actions: ALL_GRANT_ACTIONS.slice() },
  { module_code: "EVENTS", module_name: "Events", sno: 5, actions: ALL_GRANT_ACTIONS.slice() },
  { module_code: "CUSTOMERS", module_name: "Clients", sno: 6, actions: ALL_GRANT_ACTIONS.slice() },
  { module_code: "REGISTRATIONS", module_name: "Guests", sno: 7, actions: ALL_GRANT_ACTIONS.slice() },
];

export type GrantFlags = Record<GrantAction, boolean>;
export type GrantState = Record<string, GrantFlags>;

export interface GrantSourceItem {
  module_code: string;
  view: boolean;
  create: boolean;
  update: boolean;
  delete?: boolean;
  import?: boolean;
  export?: boolean;
  notify?: boolean;
}

const emptyFlags = (): GrantFlags => ({
  view: false,
  create: false,
  update: false,
  delete: false,
  import: false,
  export: false,
  notify: false,
});

export function sortGrantableModules(modules: readonly GrantableModule[]): GrantableModule[] {
  return [...modules].sort((a, b) => a.sno - b.sno || a.module_name.localeCompare(b.module_name));
}

export function initialGrantState(
  grants: readonly GrantSourceItem[] | undefined,
  modules: readonly GrantableModule[],
): GrantState {
  const byCode = new Map(grants?.map((g) => [g.module_code, g]) ?? []);
  const state: GrantState = {};
  for (const mod of modules) {
    const existing = byCode.get(mod.module_code);
    const hasCreate = mod.actions.includes("create") && Boolean(existing?.create);
    const hasUpdate = mod.actions.includes("update") && Boolean(existing?.update);
    const hasDelete = mod.actions.includes("delete") && Boolean(existing?.delete);
    const hasImport = mod.actions.includes("import") && Boolean(existing?.import);
    const hasExport = mod.actions.includes("export") && Boolean(existing?.export);
    const hasNotify = mod.actions.includes("notify") && Boolean(existing?.notify);
    const hasView = Boolean(existing?.view) || hasCreate || hasUpdate || hasDelete || hasImport || hasExport || hasNotify;
    state[mod.module_code] = {
      view: hasView,
      create: hasCreate,
      update: hasUpdate,
      delete: hasDelete,
      import: hasImport,
      export: hasExport,
      notify: hasNotify,
    };
  }
  return state;
}

export function grantsEqual(a: GrantState, b: GrantState, visibleCodes: string[]): boolean {
  return visibleCodes.every((code) => {
    const left = a[code] ?? emptyFlags();
    const right = b[code] ?? emptyFlags();
    return ALL_GRANT_ACTIONS.every((action) => Boolean(left[action]) === Boolean(right[action]));
  });
}

/**
 * Every module, hidden rows included: the API replaces the role's whole grant set, so a hidden Branches row must
 * still send what the role holds, or saving would remove it. Sends all seven actions for every granted module so
 * unchecked optional actions are cleared on update rather than retained.
 */
export function toGrantPayload(grants: GrantState, modules: readonly GrantableModule[]): RoleGrantInput[] {
  const result: RoleGrantInput[] = [];
  for (const mod of modules) {
    const g = grants[mod.module_code] ?? emptyFlags();
    const view = Boolean(g.view);
    const create = mod.actions.includes("create") && Boolean(g.create);
    const update = mod.actions.includes("update") && Boolean(g.update);
    const del = mod.actions.includes("delete") && Boolean(g.delete);
    const imp = mod.actions.includes("import") && Boolean(g.import);
    const exp = mod.actions.includes("export") && Boolean(g.export);
    const notify = mod.actions.includes("notify") && Boolean(g.notify);
    if (view || create || update || del || imp || exp || notify) {
      result.push({
        module_code: mod.module_code,
        view,
        create,
        update,
        delete: del,
        import: imp,
        export: exp,
        notify,
      });
    }
  }
  return result;
}

export function toggleGrantFlag(grants: GrantState, moduleCode: string, action: GrantAction, checked: boolean): GrantState {
  const current = grants[moduleCode] ?? emptyFlags();
  const next: GrantFlags =
    action === "view"
      ? checked
        ? { ...current, view: true }
        : emptyFlags()
      : checked
        ? { ...current, view: true, [action]: true }
        : { ...current, [action]: false };
  return { ...grants, [moduleCode]: next };
}
