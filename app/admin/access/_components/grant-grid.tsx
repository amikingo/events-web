"use client";

import { AlertCircleIcon } from "@/components/ui/icons";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { RoleGrantInput } from "@/lib/api/roles";

export type GrantAction = "view" | "create" | "update" | "export";

export interface ModuleRowConfig {
  code: string;
  defaultName: string;
  actions: readonly GrantAction[];
  hint?: string;
}

export const GRANT_MODULES: readonly ModuleRowConfig[] = [
  { code: "ORGANIZATIONS", defaultName: "Organizations", actions: ["view", "update"] },
  { code: "BRANCHES", defaultName: "Branches", actions: ["view", "create", "update"] },
  { code: "ROLES", defaultName: "Roles", actions: ["view", "create", "update"] },
  { code: "USER_ROLES", defaultName: "Staff assignments", actions: ["view", "create", "update"] },
  { code: "EVENTS", defaultName: "Events", actions: ["view", "create", "update"] },
  { code: "CUSTOMERS", defaultName: "Clients", actions: ["view", "create", "update"] },
  {
    code: "REGISTRATIONS",
    defaultName: "Guests",
    actions: ["view", "create", "update", "export"],
    hint: "Export lets them download the guest list with every guest's mobile.",
  },
];

export type GrantFlags = { view: boolean; create: boolean; update: boolean; export: boolean };
export type GrantState = Record<string, GrantFlags>;

export interface GrantSourceItem {
  module_code: string;
  view: boolean;
  create: boolean;
  update: boolean;
  export: boolean;
}

export function initialGrantState(grants?: readonly GrantSourceItem[]): GrantState {
  const byCode = new Map(grants?.map((g) => [g.module_code, g]) ?? []);
  const state: GrantState = {};
  for (const mod of GRANT_MODULES) {
    const existing = byCode.get(mod.code);
    const hasCreate = mod.actions.includes("create") && Boolean(existing?.create);
    const hasUpdate = mod.actions.includes("update") && Boolean(existing?.update);
    const hasExport = mod.actions.includes("export") && Boolean(existing?.export);
    const hasView = Boolean(existing?.view) || hasCreate || hasUpdate || hasExport;
    state[mod.code] = { view: hasView, create: hasCreate, update: hasUpdate, export: hasExport };
  }
  return state;
}

export function grantsEqual(a: GrantState, b: GrantState, visibleCodes: string[]): boolean {
  return visibleCodes.every((code) => {
    const left = a[code];
    const right = b[code];
    return left?.view === right?.view && left?.create === right?.create && left?.update === right?.update && left?.export === right?.export;
  });
}

/**
 * Every module, hidden rows included: the API replaces the whole grant set, so a row hidden here (Branches, when the
 * organization has no branches) must send back what the role or template already holds, or saving would remove it.
 * Hidden rows can't be changed in the form, so their state is still the stored grant (none for a new one). Never loop
 * over only the visible modules here.
 */
export function toGrantPayload(grants: GrantState): RoleGrantInput[] {
  const result: RoleGrantInput[] = [];
  for (const mod of GRANT_MODULES) {
    const g = grants[mod.code] ?? { view: false, create: false, update: false, export: false };
    const view = Boolean(g.view);
    const create = mod.actions.includes("create") ? Boolean(g.create) : false;
    const update = mod.actions.includes("update") ? Boolean(g.update) : false;
    const supportsExport = mod.actions.includes("export");
    const canExport = supportsExport ? Boolean(g.export) : false;
    if (view || create || update || canExport) {
      result.push({
        module_code: mod.code,
        view,
        create,
        update,
        ...(supportsExport ? { export: canExport } : {}),
      });
    }
  }
  return result;
}

export function toggleGrantFlag(grants: GrantState, moduleCode: string, action: GrantAction, checked: boolean): GrantState {
  const current = grants[moduleCode] ?? { view: false, create: false, update: false, export: false };
  let next = { ...current };
  if (action === "view") {
    next = checked ? { ...current, view: true } : { view: false, create: false, update: false, export: false };
  } else if (action === "create") {
    next = checked ? { ...current, view: true, create: true } : { ...current, create: false };
  } else if (action === "update") {
    next = checked ? { ...current, view: true, update: true } : { ...current, update: false };
  } else if (action === "export") {
    next = checked ? { ...current, view: true, export: true } : { ...current, export: false };
  }
  return { ...grants, [moduleCode]: next };
}

interface GrantGridProps {
  visibleModules: readonly ModuleRowConfig[];
  moduleNames: Record<string, string>;
  grants: GrantState;
  errors: Record<string, string>;
  onToggle: (moduleCode: string, action: GrantAction, checked: boolean) => void;
}

/** Shared module × action checkbox matrix used by both custom roles and role templates. */
export function GrantGrid({ visibleModules, moduleNames, grants, errors, onToggle }: GrantGridProps) {
  return (
    <Card>
      <CardHeader
        title="Access"
        subtitle="Ticking Create, Update or Export also ticks View. Unticking View clears the row."
      />
      <div className="overflow-hidden rounded-sm border border-border">
        <div className="hidden grid-cols-[1fr_76px_76px_76px_76px] items-center border-b border-border bg-surface-2 px-4 py-2.5 sm:grid">
          <span className="type-label text-text-soft">Module</span>
          <span className="type-label text-center text-text-soft">View</span>
          <span className="type-label text-center text-text-soft">Create</span>
          <span className="type-label text-center text-text-soft">Update</span>
          <span className="type-label text-center text-text-soft">Export</span>
        </div>
        <div className="divide-y divide-border">
          {visibleModules.map((mod) => {
            const label = moduleNames[mod.code] ?? mod.defaultName;
            const row = grants[mod.code] ?? { view: false, create: false, update: false, export: false };
            const rowError = errors[mod.code];
            const canCreate = mod.actions.includes("create");
            const canUpdate = mod.actions.includes("update");
            const canExport = mod.actions.includes("export");

            return (
              <div
                key={mod.code}
                className="flex flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[1fr_76px_76px_76px_76px] sm:items-center sm:gap-0"
              >
                <div className="flex flex-col gap-1 pr-2">
                  <span className="type-body font-medium text-text">{label}</span>
                  {mod.hint && <span className="text-[11.5px] text-text-faint">{mod.hint}</span>}
                  {rowError && (
                    <p role="alert" className="m-0 flex items-center gap-1.5 text-[11.5px] text-danger-text">
                      <AlertCircleIcon className="size-3 flex-none" />
                      {rowError}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-5 sm:contents">
                  <div className="flex items-center sm:justify-center">
                    <div className="sm:hidden">
                      <Checkbox
                        checked={row.view}
                        label="View"
                        onCheckedChange={(checked) => onToggle(mod.code, "view", checked)}
                      />
                    </div>
                    <div className="hidden sm:flex">
                      <Checkbox
                        checked={row.view}
                        aria-label={`${label} View`}
                        onCheckedChange={(checked) => onToggle(mod.code, "view", checked)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center sm:justify-center">
                    {canCreate ? (
                      <>
                        <div className="sm:hidden">
                          <Checkbox
                            checked={row.create}
                            label="Create"
                            onCheckedChange={(checked) => onToggle(mod.code, "create", checked)}
                          />
                        </div>
                        <div className="hidden sm:flex">
                          <Checkbox
                            checked={row.create}
                            aria-label={`${label} Create`}
                            onCheckedChange={(checked) => onToggle(mod.code, "create", checked)}
                          />
                        </div>
                      </>
                    ) : (
                      <span className="hidden type-body-sm text-text-faint sm:inline">—</span>
                    )}
                  </div>

                  <div className="flex items-center sm:justify-center">
                    {canUpdate ? (
                      <>
                        <div className="sm:hidden">
                          <Checkbox
                            checked={row.update}
                            label="Update"
                            onCheckedChange={(checked) => onToggle(mod.code, "update", checked)}
                          />
                        </div>
                        <div className="hidden sm:flex">
                          <Checkbox
                            checked={row.update}
                            aria-label={`${label} Update`}
                            onCheckedChange={(checked) => onToggle(mod.code, "update", checked)}
                          />
                        </div>
                      </>
                    ) : (
                      <span className="hidden type-body-sm text-text-faint sm:inline">—</span>
                    )}
                  </div>

                  <div className="flex items-center sm:justify-center">
                    {canExport ? (
                      <>
                        <div className="sm:hidden">
                          <Checkbox
                            checked={row.export}
                            label="Export"
                            onCheckedChange={(checked) => onToggle(mod.code, "export", checked)}
                          />
                        </div>
                        <div className="hidden sm:flex">
                          <Checkbox
                            checked={row.export}
                            aria-label={`${label} Export`}
                            onCheckedChange={(checked) => onToggle(mod.code, "export", checked)}
                          />
                        </div>
                      </>
                    ) : (
                      <span className="hidden type-body-sm text-text-faint sm:inline">—</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
