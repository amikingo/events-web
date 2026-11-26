"use client";

import { createElement, useMemo, useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { InfoIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { Pill } from "@/components/ui/pill";
import { RecordKv } from "@/components/ui/record-view";
import { Select } from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import type { ModuleCreateInput, ModuleNode, ModuleUpdateInput } from "@/lib/api/modules";
import { iconForModule } from "@/lib/rbac/module-sidebar";

const TOP_LEVEL = "__top__";
const CODE_PATTERN = /^[A-Z0-9_]+$/;
const ICON_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,59}$/;
const ROUTE_PATTERN = /^\/[A-Za-z0-9\-_/]{0,249}$/;
const CORE_TOOLTIP = "The app depends on this module. Its route and permission setting can't change.";

interface Values {
  code: string;
  moduleName: string;
  description: string;
  parentId: string;
  sno: string;
  icon: string;
  routeName: string;
  isMenu: boolean;
  isPermission: boolean;
}

type FieldErrors = Partial<
  Record<"code" | "moduleName" | "description" | "parentId" | "sno" | "icon" | "routeName" | "isPermission", string>
>;

function startValues(mod?: ModuleNode): Values {
  return {
    code: mod?.code ?? "",
    moduleName: mod?.module_name ?? "",
    description: mod?.description ?? "",
    parentId: mod?.parent_id ?? TOP_LEVEL,
    sno: mod ? String(mod.sno) : "0",
    icon: mod?.icon ?? "",
    routeName: mod?.route_name ?? "",
    isMenu: mod ? mod.is_menu : true,
    isPermission: mod ? mod.is_permission : false,
  };
}

function subtreeIds(root: ModuleNode): Set<string> {
  const ids = new Set<string>([root.id]);
  for (const child of root.children) {
    for (const id of subtreeIds(child)) ids.add(id);
  }
  return ids;
}

function buildParentOptions(tree: ModuleNode[], excluded: Set<string>, trail: string[] = []): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (const node of tree) {
    if (!node.is_active || excluded.has(node.id)) continue;
    const nextTrail = [...trail, node.module_name];
    out.push({ value: node.id, label: nextTrail.join(" › ") });
    if (node.children.length > 0) {
      out.push(...buildParentOptions(node.children, excluded, nextTrail));
    }
  }
  return out;
}

function validate(v: Values, editing: boolean, isCore: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!editing) {
    const code = v.code.trim().toUpperCase();
    if (!code) errors.code = "Enter a module code.";
    else if (code.length > 80) errors.code = "Use 80 characters or fewer.";
    else if (!CODE_PATTERN.test(code)) errors.code = "Use upper case letters, digits and underscores only.";
  }

  const name = v.moduleName.trim();
  if (!name) errors.moduleName = "Enter a module name.";
  else if (name.length > 250) errors.moduleName = "Use 250 characters or fewer.";

  if (v.description.trim().length > 2000) errors.description = "Use 2,000 characters or fewer.";

  const snoTrimmed = v.sno.trim();
  const parsed = Number(snoTrimmed);
  if (!snoTrimmed || !Number.isInteger(parsed) || parsed < 0 || parsed > 10_000) {
    errors.sno = "Enter a whole number from 0 to 10,000.";
  }

  const icon = v.icon.trim();
  if (icon && !ICON_NAME_PATTERN.test(icon)) {
    errors.icon = "Use letters and digits starting with a letter, up to 60 characters.";
  }

  if (!isCore) {
    const route = v.routeName.trim();
    if (route && !ROUTE_PATTERN.test(route)) {
      errors.routeName = 'Start with "/", then use letters, digits, "-", "_" or "/".';
    }
  }

  return errors;
}

interface ModuleFormProps {
  mod?: ModuleNode;
  tree: ModuleNode[];
  onCreate: (input: ModuleCreateInput) => Promise<void>;
  onUpdate: (changes: ModuleUpdateInput) => Promise<void>;
  onCancel: () => void;
}

export function ModuleForm({ mod, tree, onCreate, onUpdate, onCancel }: ModuleFormProps) {
  const editing = Boolean(mod);
  const isCore = Boolean(mod?.is_core);
  const [start] = useState(() => startValues(mod));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const parentOptions = useMemo(() => {
    const excluded = mod ? subtreeIds(mod) : new Set<string>();
    return [{ value: TOP_LEVEL, label: "Top level (no parent)" }, ...buildParentOptions(tree, excluded)];
  }, [mod, tree]);

  const dirty =
    values.code !== start.code ||
    values.moduleName !== start.moduleName ||
    values.description !== start.description ||
    values.parentId !== start.parentId ||
    values.sno !== start.sno ||
    values.icon !== start.icon ||
    values.routeName !== start.routeName ||
    values.isMenu !== start.isMenu ||
    values.isPermission !== start.isPermission;

  function setString<K extends "code" | "moduleName" | "description" | "parentId" | "sno" | "icon" | "routeName">(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function applyApiErrors(err: unknown): boolean {
    if (!(err instanceof ApiError)) return false;

    if (err.code === "permission_denied") {
      toast.error(describeApiError(err, "module"));
      return true;
    }
    if (err.code === "conflict" && (err.details as { field?: string } | undefined)?.field === "code") {
      setErrors((prev) => ({ ...prev, code: "Another module already uses this code." }));
      return true;
    }
    if (err.code === "module_in_use") {
      const msg = describeApiError(err, "module");
      setErrors((prev) => ({ ...prev, isPermission: msg }));
      setFailure(msg);
      return true;
    }
    if (err.code === "validation_error") {
      const issues = (err.details as { issues?: Array<{ path?: string; message?: string; code?: string }> } | undefined)?.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        const next: FieldErrors = {};
        const unmatched: string[] = [];
        for (const issue of issues) {
          const path = issue.path ?? "";
          const msg = issue.message ?? "Check this value.";
          if (path === "body.code") next.code = msg;
          else if (path === "body.module_name") next.moduleName = msg;
          else if (path === "body.description") next.description = msg;
          else if (path === "body.sno") next.sno = msg;
          else if (path === "body.icon") next.icon = msg;
          else if (path === "body.route_name") next.routeName = msg;
          else if (path === "body.is_permission") next.isPermission = msg;
          else if (path === "body.parent_id") {
            if (issue.code === "parent_cycle") {
              next.parentId = "A module can't sit under itself or one of its own submodules.";
            } else if (issue.code === "parent_inactive" || issue.code === "parent_not_found") {
              next.parentId = "Choose a switched-on parent.";
            } else {
              next.parentId = msg;
            }
          } else {
            unmatched.push(msg);
          }
        }
        setErrors(next);
        if (unmatched.length > 0) setFailure(unmatched[0]!);
        return true;
      }
    }
    return false;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate(values, editing, isCore);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setFailure(null);
    setSaving(true);
    try {
      const parentId = values.parentId === TOP_LEVEL ? null : values.parentId;
      const sno = Number(values.sno.trim());
      const desc = values.description.trim() || null;
      const icon = values.icon.trim() || null;
      const route = values.routeName.trim() || null;

      if (mod) {
        const changes: ModuleUpdateInput = {};
        if (values.moduleName.trim() !== mod.module_name) changes.module_name = values.moduleName.trim();
        if (desc !== mod.description) changes.description = desc;
        if (parentId !== mod.parent_id) changes.parent_id = parentId;
        if (sno !== mod.sno) changes.sno = sno;
        if (icon !== mod.icon) changes.icon = icon;
        if (!isCore && route !== mod.route_name) changes.route_name = route;
        if (values.isMenu !== mod.is_menu) changes.is_menu = values.isMenu;
        if (!isCore && values.isPermission !== mod.is_permission) changes.is_permission = values.isPermission;
        await onUpdate(changes);
      } else {
        await onCreate({
          code: values.code.trim().toUpperCase(),
          module_name: values.moduleName.trim(),
          ...(desc ? { description: desc } : {}),
          ...(parentId ? { parent_id: parentId } : {}),
          sno,
          ...(icon ? { icon } : {}),
          ...(route ? { route_name: route } : {}),
          is_menu: values.isMenu,
          is_permission: values.isPermission,
        });
      }
    } catch (err) {
      if (!applyApiErrors(err)) {
        setFailure(describeApiError(err, "module"));
      }
      setSaving(false);
    }
  }

  function cancel() {
    if (dirty) setDiscardOpen(true);
    else onCancel();
  }

  const fieldErrorCount = Object.values(errors).filter(Boolean).length;
  const previewCode = editing ? mod!.code : values.code.trim().toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb
          items={[
            { label: "Modules", onClick: cancel },
            ...(editing ? [{ label: mod!.module_name, onClick: cancel }] : []),
            { label: editing ? "Edit" : "New module" },
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${mod!.module_name}` : "New module"}</h1>
            <p className="type-body m-0 text-text-soft">
              {editing ? "Update how this module looks, where it sits, and whether it grants access." : "Add a menu group, link, or permission module."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="module-form" loading={saving} loadingLabel={editing ? "Saving" : "Creating"} disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create module"}
            </Button>
          </div>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {fieldErrorCount > 0 && (
        <ErrorBanner>{fieldErrorCount === 1 ? "Fix 1 field to continue." : `Fix ${fieldErrorCount} fields to continue.`}</ErrorBanner>
      )}

      <form id="module-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader title="Details" subtitle="Shown in the sidebar and role editor." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!editing && (
                <Field label="Code" htmlFor="mod-code" required error={errors.code} hint="Can't be changed later.">
                  <Input
                    id="mod-code"
                    value={values.code}
                    error={!!errors.code}
                    onChange={(e) => setString("code", e.target.value.toUpperCase())}
                    placeholder="REPORTS_SALES"
                    maxLength={80}
                    autoComplete="off"
                    className="font-mono uppercase"
                  />
                </Field>
              )}
              <Field label="Name" htmlFor="mod-name" required error={errors.moduleName} className={editing ? undefined : undefined}>
                <Input
                  id="mod-name"
                  value={values.moduleName}
                  error={!!errors.moduleName}
                  onChange={(e) => setString("moduleName", e.target.value)}
                  maxLength={250}
                  autoComplete="off"
                />
              </Field>
              <Field label="Order" htmlFor="mod-sno" required error={errors.sno} hint="Lower numbers appear first in the menu.">
                <Input
                  id="mod-sno"
                  type="number"
                  min={0}
                  max={10000}
                  step={1}
                  value={values.sno}
                  error={!!errors.sno}
                  onChange={(e) => setString("sno", e.target.value)}
                />
              </Field>
              <Field label="Parent" htmlFor="mod-parent" error={errors.parentId} hint="Leave empty for top level." className={editing ? "sm:col-span-2" : undefined}>
                <Select
                  id="mod-parent"
                  value={values.parentId}
                  onValueChange={(v) => setString("parentId", v)}
                  options={parentOptions}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Icon" htmlFor="mod-icon" error={errors.icon} hint="A Lucide icon name, such as CalendarDays">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex size-9 flex-none items-center justify-center rounded-sm border border-border bg-surface-2 text-text-soft"
                      aria-hidden="true"
                    >
                      {createElement(iconForModule(previewCode, values.icon.trim() || null), { className: "size-4" })}
                    </span>
                    <Input
                      id="mod-icon"
                      value={values.icon}
                      error={!!errors.icon}
                      onChange={(e) => setString("icon", e.target.value)}
                      placeholder="CalendarDays"
                      maxLength={60}
                      autoComplete="off"
                    />
                  </div>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Description" htmlFor="mod-description" error={errors.description} hint="Optional.">
                  <Textarea
                    id="mod-description"
                    value={values.description}
                    error={!!errors.description}
                    onChange={(e) => setString("description", e.target.value)}
                    maxLength={2000}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Behavior" subtitle="Route, menu visibility, and platform role permissions." />
            <div className="flex flex-col gap-5">
              {isCore ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="type-label text-text">Route</span>
                    <Tooltip content={CORE_TOOLTIP}>
                      <span tabIndex={0} className="inline-flex">
                        <Pill size="sm">Core</Pill>
                      </span>
                    </Tooltip>
                  </div>
                  <p className="m-0 font-mono text-[13px] text-text">{mod!.route_name ?? "Group container"}</p>
                </div>
              ) : (
                <Field label="Route" htmlFor="mod-route" error={errors.routeName} hint="Optional, starting with /, e.g. /reports/sales">
                  <Input
                    id="mod-route"
                    value={values.routeName}
                    error={!!errors.routeName}
                    onChange={(e) => setString("routeName", e.target.value)}
                    placeholder="/reports/sales"
                    maxLength={250}
                    autoComplete="off"
                    className="font-mono"
                  />
                </Field>
              )}

              <div className="flex flex-col gap-1.5">
                <Switch
                  checked={values.isMenu}
                  onCheckedChange={(checked) => setValues((prev) => ({ ...prev, isMenu: checked }))}
                  label="Show in menu"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Switch
                    checked={values.isPermission}
                    disabled={isCore}
                    onCheckedChange={(checked) => {
                      setValues((prev) => ({ ...prev, isPermission: checked }));
                      if (errors.isPermission) setErrors((prev) => ({ ...prev, isPermission: undefined }));
                    }}
                    label="Permission module"
                  />
                  {isCore && (
                    <Tooltip content={CORE_TOOLTIP}>
                      <span tabIndex={0} className="inline-flex">
                        <Pill size="sm">Core</Pill>
                      </span>
                    </Tooltip>
                  )}
                </div>
                {errors.isPermission && (
                  <p role="alert" className="m-0 text-[12px] text-danger-text">
                    {errors.isPermission}
                  </p>
                )}
                <p className="m-0 text-[12px] text-text-faint">
                  Platform roles can be given access to it. Organizations can&apos;t: only modules the app is built for can be given to an organization&apos;s roles.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="System identity" subtitle={editing ? "Module status and constraints." : "Fixed after creation."} />
          <div className="flex flex-col gap-4">
            {editing ? (
              <>
                <RecordKv
                  single
                  items={[
                    { label: "Code", value: <span className="font-mono">{mod!.code}</span> },
                    {
                      label: "Kind",
                      value: mod!.is_permission ? "Permission module" : mod!.route_name ? "Link" : "Menu group",
                    },
                    { label: "Status", value: <StatusPill kind="account" status={mod!.is_active ? "active" : "inactive"} /> },
                  ]}
                />
                <p className="m-0 text-[12px] text-text-faint">Code can&apos;t be changed later.</p>
                {mod!.always_on && <Note icon={<InfoIcon />}>The admin screens need this module, so it stays on.</Note>}
              </>
            ) : (
              <Note icon={<InfoIcon />}>Code is fixed after creation. New modules start switched on and can be granted to platform roles.</Note>
            )}
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
