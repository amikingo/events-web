"use client";

import { useState } from "react";
import { AlertCircleIcon } from "@/components/ui/icons";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError, grantExceedsOwnAccessMessage } from "@/lib/api/errors";
import type { Role, RoleCreateInput, RoleGrantInput, RoleUpdateInput } from "@/lib/api/roles";

type GrantAction = "view" | "create" | "update" | "export";
type ModuleRowConfig = {
  code: string;
  defaultName: string;
  actions: readonly GrantAction[];
  hint?: string;
};

const ROLE_MODULES: readonly ModuleRowConfig[] = [
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

type GrantState = Record<string, { view: boolean; create: boolean; update: boolean; export: boolean }>;

interface Values {
  code: string;
  name: string;
  description: string;
  grants: GrantState;
}

type FieldErrors = {
  code?: string;
  name?: string;
  description?: string;
  grants: Record<string, string>;
};

const CODE_PATTERN = /^[A-Za-z0-9_]+$/;

function initialGrants(role?: Role): GrantState {
  const byCode = new Map(role?.grants.map((g) => [g.module_code, g]) ?? []);
  const state: GrantState = {};
  for (const mod of ROLE_MODULES) {
    const existing = byCode.get(mod.code);
    const hasCreate = mod.actions.includes("create") && Boolean(existing?.create);
    const hasUpdate = mod.actions.includes("update") && Boolean(existing?.update);
    const hasExport = mod.actions.includes("export") && Boolean(existing?.export);
    const hasView = Boolean(existing?.view) || hasCreate || hasUpdate || hasExport;
    state[mod.code] = { view: hasView, create: hasCreate, update: hasUpdate, export: hasExport };
  }
  return state;
}

function startValues(role?: Role): Values {
  return {
    code: role?.code ?? "",
    name: role?.name ?? "",
    description: role?.description ?? "",
    grants: initialGrants(role),
  };
}

function grantsEqual(a: GrantState, b: GrantState, visibleCodes: string[]): boolean {
  return visibleCodes.every((code) => {
    const left = a[code];
    const right = b[code];
    return left?.view === right?.view && left?.create === right?.create && left?.update === right?.update && left?.export === right?.export;
  });
}

function validate(v: Values, editing: boolean): FieldErrors {
  const errors: FieldErrors = { grants: {} };
  if (!editing) {
    const code = v.code.trim();
    if (!code) errors.code = "Enter a role code.";
    else if (code.length > 80) errors.code = "Use 80 characters or fewer.";
    else if (!CODE_PATTERN.test(code)) errors.code = "Use letters, digits and underscores only.";
  }
  const name = v.name.trim();
  if (!name) errors.name = "Enter a role name.";
  else if (name.length > 250) errors.name = "Use 250 characters or fewer.";

  if (v.description.trim().length > 2000) errors.description = "Use 2,000 characters or fewer.";
  return errors;
}

/**
 * Every module, hidden rows included: the API replaces the role's whole grant set, so a row hidden here (Branches,
 * when the organization has no branches) must send back what the role already holds, or saving would remove it.
 * Hidden rows can't be changed in the form, so their state is still the role's stored grant (none for a new role).
 */
function toGrantPayload(grants: GrantState): RoleGrantInput[] {
  const result: RoleGrantInput[] = [];
  for (const mod of ROLE_MODULES) {
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

interface RoleFormProps {
  role?: Role;
  ownerRole?: Role;
  hasBranches: boolean;
  onCreate: (input: RoleCreateInput) => Promise<void>;
  onUpdate: (changes: RoleUpdateInput) => Promise<void>;
  onCancel: () => void;
}

export function RoleForm({ role, ownerRole, hasBranches, onCreate, onUpdate, onCancel }: RoleFormProps) {
  const editing = Boolean(role);
  const visibleModules = ROLE_MODULES.filter((m) => hasBranches || m.code !== "BRANCHES");
  const visibleCodes = visibleModules.map((m) => m.code);

  const moduleNames: Record<string, string> = {};
  for (const mod of ROLE_MODULES) {
    const ownerGrant = ownerRole?.grants.find((g) => g.module_code === mod.code);
    moduleNames[mod.code] = ownerGrant?.module_name ?? mod.defaultName;
  }

  const [start] = useState(() => startValues(role));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<FieldErrors>({ grants: {} });
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const textDirty = values.code !== start.code || values.name !== start.name || values.description !== start.description;
  const grantsDirty = !grantsEqual(values.grants, start.grants, visibleCodes);
  const dirty = textDirty || grantsDirty;

  function setField<K extends "code" | "name" | "description">(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleGrant(moduleCode: string, action: GrantAction, checked: boolean) {
    setValues((prev) => {
      const current = prev.grants[moduleCode] ?? { view: false, create: false, update: false, export: false };
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
      return { ...prev, grants: { ...prev.grants, [moduleCode]: next } };
    });
    if (errors.grants[moduleCode]) {
      setErrors((prev) => {
        const nextGrants = { ...prev.grants };
        delete nextGrants[moduleCode];
        return { ...prev, grants: nextGrants };
      });
    }
  }

  function applyApiErrors(err: unknown, sentGrants: RoleGrantInput[]): boolean {
    if (!(err instanceof ApiError)) return false;

    if (err.code === "grant_exceeds_own_access") {
      toast.error(grantExceedsOwnAccessMessage(err.details, moduleNames));
      return true;
    }
    if (err.code === "role_locked") {
      toast.error("The Owner role can't be changed.");
      return true;
    }
    if (err.code === "permission_denied") {
      toast.error("You don't have permission to do this.");
      return true;
    }
    if (err.code === "conflict") {
      const field = (err.details as { field?: string } | undefined)?.field;
      if (field === "code") {
        setErrors((prev) => ({ ...prev, code: "Another role already uses this code." }));
        return true;
      }
      if (field === "name") {
        setErrors((prev) => ({ ...prev, name: "Another role already has this name." }));
        return true;
      }
    }
    if (err.code === "validation_error") {
      const issues = (err.details as { issues?: Array<{ path?: string; message?: string }> } | undefined)?.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        const nextErrors: FieldErrors = { grants: {} };
        const unmatched: string[] = [];
        for (const issue of issues) {
          const path = issue.path ?? "";
          const msg = issue.message ?? "Check this value.";
          if (path === "body.code") nextErrors.code = msg;
          else if (path === "body.name") nextErrors.name = msg;
          else if (path === "body.description") nextErrors.description = msg;
          else if (path.startsWith("body.grants.")) {
            const idx = Number(path.split(".")[2]);
            const modCode = Number.isInteger(idx) ? sentGrants[idx]?.module_code : undefined;
            if (modCode) nextErrors.grants[modCode] = msg;
            else unmatched.push(msg);
          } else {
            unmatched.push(msg);
          }
        }
        setErrors(nextErrors);
        if (unmatched.length > 0) setFailure(unmatched[0]!);
        return true;
      }
    }
    return false;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate(values, editing);
    setErrors(next);
    if (next.code || next.name || next.description || Object.keys(next.grants).length > 0) return;

    setFailure(null);
    setSaving(true);
    const grantsPayload = toGrantPayload(values.grants);

    try {
      if (role) {
        const changes: RoleUpdateInput = {};
        if (values.name.trim() !== role.name) changes.name = values.name.trim();
        const normalizedDesc = values.description.trim() || null;
        if (normalizedDesc !== role.description) changes.description = normalizedDesc;
        if (grantsDirty) changes.grants = grantsPayload;
        await onUpdate(changes);
      } else {
        await onCreate({
          code: values.code.trim(),
          name: values.name.trim(),
          ...(values.description.trim() ? { description: values.description.trim() } : {}),
          grants: grantsPayload,
        });
      }
    } catch (err) {
      if (!applyApiErrors(err, grantsPayload)) {
        setFailure(describeApiError(err, "role"));
      }
      setSaving(false);
    }
  }

  function cancel() {
    if (dirty) setDiscardOpen(true);
    else onCancel();
  }

  const fieldErrorCount = [errors.code, errors.name, errors.description].filter(Boolean).length + Object.keys(errors.grants).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb
          items={[
            { label: "Roles", onClick: cancel },
            ...(editing ? [{ label: role!.name, onClick: cancel }] : []),
            { label: editing ? "Edit role" : "New role" },
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${role!.name}` : "New role"}</h1>
            <p className="type-body m-0 text-text-soft">
              {editing ? "Change the role details and what staff who hold it can do." : "Choose what staff with this role can view, create and update."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="role-form" loading={saving} loadingLabel={editing ? "Saving" : "Creating"} disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create role"}
            </Button>
          </div>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {fieldErrorCount > 0 && (
        <ErrorBanner>{fieldErrorCount === 1 ? "Fix 1 field to continue." : `Fix ${fieldErrorCount} fields to continue.`}</ErrorBanner>
      )}

      <form id="role-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Role details" subtitle="How the role is named and described." />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name" htmlFor="rl-name" required error={errors.name}>
              <Input
                id="rl-name"
                value={values.name}
                error={!!errors.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Event Coordinator"
                maxLength={250}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Code"
              htmlFor="rl-code"
              required={!editing}
              error={errors.code}
              hint={editing ? "Can't be changed after the role is created." : "Letters, digits and underscores. It can't be changed later."}
            >
              <Input
                id="rl-code"
                value={values.code}
                disabled={editing}
                error={!!errors.code}
                onChange={(e) => setField("code", e.target.value)}
                placeholder="EVENT_COORDINATOR"
                maxLength={80}
                autoComplete="off"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description" htmlFor="rl-description" error={errors.description} hint="Optional. Helps admins pick the right role for staff.">
                <Textarea
                  id="rl-description"
                  value={values.description}
                  error={!!errors.description}
                  onChange={(e) => setField("description", e.target.value)}
                  maxLength={2000}
                />
              </Field>
            </div>
          </div>
        </Card>

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
                const row = values.grants[mod.code] ?? { view: false, create: false, update: false, export: false };
                const rowError = errors.grants[mod.code];
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
                            onCheckedChange={(checked) => toggleGrant(mod.code, "view", checked)}
                          />
                        </div>
                        <div className="hidden sm:flex">
                          <Checkbox
                            checked={row.view}
                            aria-label={`${label} View`}
                            onCheckedChange={(checked) => toggleGrant(mod.code, "view", checked)}
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
                                onCheckedChange={(checked) => toggleGrant(mod.code, "create", checked)}
                              />
                            </div>
                            <div className="hidden sm:flex">
                              <Checkbox
                                checked={row.create}
                                aria-label={`${label} Create`}
                                onCheckedChange={(checked) => toggleGrant(mod.code, "create", checked)}
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
                                onCheckedChange={(checked) => toggleGrant(mod.code, "update", checked)}
                              />
                            </div>
                            <div className="hidden sm:flex">
                              <Checkbox
                                checked={row.update}
                                aria-label={`${label} Update`}
                                onCheckedChange={(checked) => toggleGrant(mod.code, "update", checked)}
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
                                onCheckedChange={(checked) => toggleGrant(mod.code, "export", checked)}
                              />
                            </div>
                            <div className="hidden sm:flex">
                              <Checkbox
                                checked={row.export}
                                aria-label={`${label} Export`}
                                onCheckedChange={(checked) => toggleGrant(mod.code, "export", checked)}
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
      </form>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard changes?"
        description="You have changes that are not saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setDiscardOpen(false);
          onCancel();
        }}
      />
    </div>
  );
}
