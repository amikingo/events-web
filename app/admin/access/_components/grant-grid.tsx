"use client";

import { AlertCircleIcon } from "@/components/ui/icons";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

const ACTION_HEADERS: Record<GrantAction, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  import: "Import",
  export: "Export",
  notify: "Notify",
};

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

interface GrantGridProps {
  visibleModules: readonly GrantableModule[];
  grants: GrantState;
  errors: Record<string, string>;
  onToggle: (moduleCode: string, action: GrantAction, checked: boolean) => void;
}

/** Shared dynamic 7-column module × action matrix built from `GET /grantable-modules`. */
export function GrantGrid({ visibleModules, grants, errors, onToggle }: GrantGridProps) {
  return (
    <Card>
      <CardHeader
        title="Access"
        subtitle="Ticking any other box also ticks View. Unticking View clears the row."
      />
      <div className="overflow-x-auto rounded-sm border border-border">
        <div className="hidden min-w-[640px] grid-cols-[minmax(160px,1fr)_repeat(7,64px)] items-center border-b border-border bg-surface-2 px-4 py-2.5 sm:grid">
          <span className="type-label text-text-soft">Module</span>
          {ALL_GRANT_ACTIONS.map((action) => (
            <span key={action} className="type-label text-center text-text-soft">
              {ACTION_HEADERS[action]}
            </span>
          ))}
        </div>
        <div className="divide-y divide-border sm:min-w-[640px]">
          {visibleModules.map((mod) => {
            const row = grants[mod.module_code] ?? emptyFlags();
            const rowError = errors[mod.module_code];

            return (
              <div
                key={mod.module_code}
                className="flex flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[minmax(160px,1fr)_repeat(7,64px)] sm:items-center sm:gap-0"
              >
                <div className="flex flex-col gap-1 pr-2">
                  <span className="type-body font-medium text-text">{mod.module_name}</span>
                  {rowError && (
                    <p role="alert" className="m-0 flex items-center gap-1.5 text-[11.5px] text-danger-text">
                      <AlertCircleIcon className="size-3 flex-none" />
                      {rowError}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:contents">
                  {ALL_GRANT_ACTIONS.map((action) => {
                    const supported = mod.actions.includes(action);
                    const label = ACTION_HEADERS[action];
                    return (
                      <div key={action} className="flex items-center sm:justify-center">
                        {supported ? (
                          <>
                            <div className="sm:hidden">
                              <Checkbox
                                checked={row[action]}
                                label={label}
                                onCheckedChange={(checked) => onToggle(mod.module_code, action, checked)}
                              />
                            </div>
                            <div className="hidden sm:flex">
                              <Checkbox
                                checked={row[action]}
                                aria-label={`${mod.module_name} ${label}`}
                                onCheckedChange={(checked) => onToggle(mod.module_code, action, checked)}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="hidden type-body-sm text-text-faint sm:inline">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="m-0 mt-3 type-body-sm text-text-faint">Delete, import and notify take effect where a screen offers them.</p>
    </Card>
  );
}
