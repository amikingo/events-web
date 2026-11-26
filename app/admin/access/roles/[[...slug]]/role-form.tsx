"use client";

import { Briefcase, Building, Calendar, GitBranch, ShieldCheck, UserCog, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { iconForModule } from "@/lib/rbac/module-sidebar";
import { describeApiError, grantExceedsOwnAccessMessage } from "@/lib/api/errors";
import type { RoleTemplate } from "@/lib/api/role-templates";
import type { GrantAction, GrantableModule, Role, RoleCreateInput, RoleGrantInput, RoleUpdateInput } from "@/lib/api/roles";
import {
  grantsEqual,
  initialGrantState,
  sortGrantableModules,
  toggleGrantFlag,
  toGrantPayload,
} from "@/app/admin/access/_components/grant-grid";
import type { GrantState } from "@/app/admin/access/_components/grant-grid";

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
  template?: string;
  grants: Record<string, string>;
};

const CODE_PATTERN = /^[A-Za-z0-9_]+$/;

/** "Event Coordinator" → "EVENT_COORDINATOR": the code suggested from the name, until the person types their own. */
const codeFrom = (name: string) =>
  name
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

/** Every right, in the order people read them, with plain labels. */
const RIGHTS: { action: GrantAction; label: string }[] = [
  { action: "view", label: "View" },
  { action: "create", label: "Create" },
  { action: "update", label: "Update" },
  { action: "delete", label: "Delete" },
  { action: "import", label: "Import" },
  { action: "export", label: "Export" },
  { action: "notify", label: "Notify" },
];

/** Areas in groups people recognise. A module not listed here lands in "Other". */
const GROUPS: { title: string; codes: string[] }[] = [
  { title: "Events", codes: ["EVENTS", "REGISTRATIONS", "CUSTOMERS"] },
  { title: "Organization", codes: ["ORGANIZATIONS", "BRANCHES"] },
  { title: "Team and access", codes: ["USER_ROLES", "ROLES"] },
];

/** The same icons as the menu, so an area looks the same here and there. */
const AREA_ICONS: Record<string, LucideIcon> = {
  EVENTS: Calendar,
  REGISTRATIONS: Users,
  CUSTOMERS: Briefcase,
  ORGANIZATIONS: Building,
  BRANCHES: GitBranch,
  USER_ROLES: UserCog,
  ROLES: ShieldCheck,
};

/** What each area covers, so nobody has to guess what "Clients" or "Staff assignments" opens. */
const AREA_ABOUT: Record<string, string> = {
  EVENTS: "Events, venues, ticket types and covers.",
  REGISTRATIONS: "Guest profiles and who is registered for what.",
  CUSTOMERS: "Companies and people who commission events.",
  ORGANIZATIONS: "The organization's name and defaults.",
  BRANCHES: "The offices events run from.",
  USER_ROLES: "Who works here, and with which role.",
  ROLES: "Roles and what each can do.",
};


function startValues(role: Role | undefined, modules: readonly GrantableModule[]): Values {
  return {
    code: role?.code ?? "",
    name: role?.name ?? "",
    description: role?.description ?? "",
    grants: initialGrantState(role?.grants, modules),
  };
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

interface RoleFormProps {
  role?: Role;
  grantableModules: GrantableModule[];
  hasBranches: boolean;
  templates?: RoleTemplate[];
  onCreate: (input: RoleCreateInput) => Promise<void>;
  onUpdate: (changes: RoleUpdateInput) => Promise<void>;
  onCancel: () => void;
}

export function RoleForm({ role, grantableModules, hasBranches, templates, onCreate, onUpdate, onCancel }: RoleFormProps) {
  const editing = Boolean(role);
  const orderedModules = sortGrantableModules(grantableModules);
  const visibleModules = orderedModules.filter((m) => hasBranches || m.module_code !== "BRANCHES");
  const visibleCodes = visibleModules.map((m) => m.module_code);

  const moduleNames: Record<string, string> = {};
  for (const mod of orderedModules) {
    moduleNames[mod.module_code] = mod.module_name;
  }

  const [start] = useState(() => startValues(role, orderedModules));
  const [values, setValues] = useState<Values>(start);
  const [selectedTemplateId, setSelectedTemplateId] = useState("none");
  const [errors, setErrors] = useState<FieldErrors>({ grants: {} });
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  // A new role's code follows its name until the code is typed by hand; an existing role's code never changes.
  const [codeTouched, setCodeTouched] = useState(editing);

  const textDirty = values.code !== start.code || values.name !== start.name || values.description !== start.description;
  const grantsDirty = !grantsEqual(values.grants, start.grants, visibleCodes);
  const dirty = textDirty || grantsDirty;

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setErrors((prev) => ({ ...prev, template: undefined, grants: {} }));
    setFailure(null);
    if (templateId === "none") return;
    const tpl = templates?.find((t) => t.id === templateId);
    if (!tpl) return;
    setValues((prev) => ({
      ...prev,
      name: tpl.name,
      description: tpl.description ?? "",
      code: codeTouched ? prev.code : codeFrom(tpl.name),
      grants: initialGrantState(tpl.grants, orderedModules),
    }));
  }

  function setField<K extends "code" | "name" | "description">(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function setName(name: string) {
    setValues((prev) => ({ ...prev, name, code: codeTouched ? prev.code : codeFrom(name) }));
    if (errors.name || (!codeTouched && errors.code)) setErrors((prev) => ({ ...prev, name: undefined, code: codeTouched ? prev.code : undefined }));
  }

  function setCode(code: string) {
    setCodeTouched(code !== "");
    setField("code", code.toUpperCase());
  }

  /** Quick actions over every area shown: let them see everything, or take everything away. */
  function setAll(view: boolean) {
    setValues((prev) => ({
      ...prev,
      grants: visibleModules.reduce((grants, m) => (view && grants[m.module_code]?.view ? grants : toggleGrantFlag(grants, m.module_code, "view", view)), prev.grants),
    }));
    setErrors((prev) => ({ ...prev, grants: {} }));
  }

  function toggleGrant(moduleCode: string, action: GrantAction, checked: boolean) {
    setValues((prev) => ({
      ...prev,
      grants: toggleGrantFlag(prev.grants, moduleCode, action, checked),
    }));
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
      toast.error(describeApiError(err, "role"));
      return true;
    }
    if (err.code === "role_template_inactive") {
      const msg = describeApiError(err, "role");
      setErrors((prev) => ({ ...prev, template: msg }));
      setFailure(msg);
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
    const grantsPayload = toGrantPayload(values.grants, orderedModules);

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
          ...(selectedTemplateId && selectedTemplateId !== "none" ? { role_template_id: selectedTemplateId } : {}),
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

  const fieldErrorCount = [errors.code, errors.name, errors.description, errors.template].filter(Boolean).length + Object.keys(errors.grants).length;
  // Branches stay out of the list (and the counts) for an organization without branches; the payload still keeps them.
  const orderedModulesShown = visibleModules;
  const opened = orderedModulesShown.filter((m) => values.grants[m.module_code]?.view);
  const grouped = [
    ...GROUPS.map((g) => ({ title: g.title, modules: g.codes.map((code) => orderedModulesShown.find((m) => m.module_code === code)).filter((m): m is GrantableModule => Boolean(m)) })),
    { title: "Other", modules: orderedModulesShown.filter((m) => !GROUPS.some((g) => g.codes.includes(m.module_code))) },
  ].filter((g) => g.modules.length > 0);
  const iconOf = (code: string) => AREA_ICONS[code] ?? iconForModule(code, null);

  return (
    <div className="flex w-full mx-auto max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${role!.name}` : "New role"}</h1>
          <p className="type-body m-0 text-text-soft">{editing ? "Change the role and what staff who hold it can do." : "Name the role, then tick what staff who hold it can do."}</p>
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

      {(failure || fieldErrorCount > 0) && (
        <div className="flex flex-col gap-2">
          {failure && <ErrorBanner>{failure}</ErrorBanner>}
          {fieldErrorCount > 0 && <ErrorBanner>{fieldErrorCount === 1 ? "Fix 1 field to continue." : `Fix ${fieldErrorCount} fields to continue.`}</ErrorBanner>}
        </div>
      )}

      {/* Wide screens: the details on the left (they stay in view), the access table beside them, both on screen at once. */}
      <form id="role-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:gap-6">
        <Card className="xl:sticky xl:top-6">
          <CardHeader title="About the role" subtitle={editing ? "The code can't change." : "Staff see the name. The code is fixed once created."} />
          <div className="flex flex-col gap-5">
            {!editing && templates && templates.length > 0 && (
              <Field label="Start from" htmlFor="rl-template" error={errors.template} hint="Optional. A template fills in the name, description and access.">
                <Select
                  id="rl-template"
                  options={[{ value: "none", label: "Build from scratch" }, ...templates.map((t) => ({ value: t.id, label: t.name }))]}
                  value={selectedTemplateId}
                  onValueChange={applyTemplate}
                />
              </Field>
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,260px)] xl:grid-cols-1">
              <Field label="Name" htmlFor="rl-name" required error={errors.name}>
                <Input id="rl-name" value={values.name} error={!!errors.name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Event Coordinator" maxLength={250} autoComplete="off" autoFocus={!editing} />
              </Field>
              <Field label="Code" htmlFor="rl-code" required={!editing} error={errors.code} hint={editing ? undefined : codeTouched ? "Letters, digits and underscores." : "Made from the name."}>
                <Input id="rl-code" value={values.code} disabled={editing} error={!!errors.code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. EVENT_COORDINATOR" maxLength={80} autoComplete="off" spellCheck={false} />
              </Field>
            </div>
            <Field label="Description" htmlFor="rl-description" error={errors.description} hint="Optional. Helps admins pick the right role for staff.">
              <Textarea id="rl-description" rows={3} value={values.description} error={!!errors.description} onChange={(e) => setField("description", e.target.value)} maxLength={2000} placeholder="e.g. Runs events day to day. Can't change roles or staff." />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="What they can do" subtitle="Tick what staff with this role can do in each area." />
          <div className="flex flex-col gap-5">
            {/* What the role opens, at a glance, with the two quick actions. */}
            <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="type-body-sm mr-1 font-semibold text-text">Opens</span>
                {opened.length > 0 ? (
                  opened.map((m) => (
                    <Pill key={m.module_code} tone="neutral" size="sm">
                      {createElement(iconOf(m.module_code))}
                      {m.module_name}
                    </Pill>
                  ))
                ) : (
                  <span className="type-body-sm text-text-faint">nothing yet. Tick View on at least one area.</span>
                )}
              </div>
              <div className="flex flex-none items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => setAll(true)} disabled={opened.length === orderedModulesShown.length}>
                  See all areas
                </Button>
                <Button type="button" variant="secondary" onClick={() => setAll(false)} disabled={opened.length === 0}>
                  Clear all
                </Button>
              </div>
            </div>

            {/* One table: the rights as columns, labelled once at the top; areas grouped inside it. */}
            <div className="overflow-hidden rounded-md border border-border">
              <div className="hidden grid-cols-[minmax(0,1fr)_repeat(7,56px)] items-center border-b border-border bg-surface-2 px-4 py-2.5 md:grid">
                <span className="type-label text-text-soft">Area</span>
                {RIGHTS.map((r) => (
                  <span key={r.action} className="type-label text-center text-text-soft">
                    {r.label}
                  </span>
                ))}
              </div>
              {grouped.map((group) => (
                <div key={group.title}>
                  <div className="border-b border-border px-4 pb-1.5 pt-3">
                    <span className="type-label text-text-faint">{group.title}</span>
                  </div>
                  {group.modules.map((m) => {
                    const flags = values.grants[m.module_code];
                    const on = Boolean(flags?.view);
                    const error = errors.grants[m.module_code];
                    return (
                      <div key={m.module_code} className="flex flex-col gap-3 border-b border-border px-4 py-3 md:grid md:grid-cols-[minmax(0,1fr)_repeat(7,56px)] md:items-center md:gap-0">
                        <div className="flex min-w-0 items-start gap-3 md:pr-3">
                          <IconTile tone={on ? "accent" : "charcoal"} size="sm">
                            {createElement(iconOf(m.module_code))}
                          </IconTile>
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className={on ? "type-body font-semibold text-text" : "type-body font-semibold text-text-soft"}>{m.module_name}</span>
                            <span role={error ? "alert" : undefined} className={error ? "type-body-sm text-danger" : "type-body-sm text-text-faint"}>
                              {error ?? AREA_ABOUT[m.module_code] ?? ""}
                            </span>
                          </div>
                        </div>

                        {/* Wide screens: a bare box under each column label; a dash where the area has no such right. */}
                        {RIGHTS.map((r) => (
                          <div key={r.action} className="hidden justify-center md:flex">
                            {m.actions.includes(r.action) ? (
                              <Checkbox checked={Boolean(flags?.[r.action])} onCheckedChange={(checked) => toggleGrant(m.module_code, r.action, checked)} aria-label={`${r.label} ${m.module_name}`} />
                            ) : (
                              <span className="type-body-sm text-text-faint" aria-hidden="true">
                                –
                              </span>
                            )}
                          </div>
                        ))}

                        {/* Phones: the same boxes with their labels, under the area. */}
                        <div className="flex flex-wrap gap-x-5 gap-y-2 pl-11 md:hidden" role="group" aria-label={`${m.module_name} rights`}>
                          {RIGHTS.filter((r) => m.actions.includes(r.action)).map((r) => (
                            <Checkbox key={r.action} checked={Boolean(flags?.[r.action])} onCheckedChange={(checked) => toggleGrant(m.module_code, r.action, checked)} label={r.label} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="type-body-sm m-0 text-text-faint">Ticking any other box also ticks View; unticking View clears the area. Delete, import and notify take effect where a screen offers them.</p>
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
