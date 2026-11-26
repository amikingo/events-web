"use client";

import { Eye, Folder, KeyRound, Link2 } from "lucide-react";
import { createElement, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { InfoIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/icon-tile";
import { Input, InputAddon, InputGroup } from "@/components/ui/input";
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
import { iconForModule, normalizeLucideIconName } from "@/lib/rbac/module-sidebar";

const TOP_LEVEL = "__top__";
const CODE_PATTERN = /^[A-Z0-9_]+$/;
const ICON_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,59}$/;
const ROUTE_PATTERN = /^\/[A-Za-z0-9\-_/]{0,249}$/;
const CORE_TOOLTIP = "The app depends on this module. Its route and permission setting can't change.";

/** "Sales reports" → "SALES_REPORTS": the code suggested from the name, until the person types their own. */
const codeFrom = (name: string) =>
  name
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

/** One line of a settings list: an icon, what it is, and its control on the right. Stacks on a phone. */
function OptionRow({ icon, title, hint, error, children, below }: { icon: ReactNode; title: ReactNode; hint: string; error?: string; children?: ReactNode; below?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <IconTile tone="charcoal" size="sm">
            {icon}
          </IconTile>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="type-body flex flex-wrap items-center gap-2 font-semibold text-text">{title}</span>
            <span role={error ? "alert" : undefined} className={error ? "type-body-sm text-danger" : "type-body-sm text-text-soft"}>
              {error ?? hint}
            </span>
          </div>
        </div>
        {children && <div className="flex flex-none sm:justify-end">{children}</div>}
      </div>
      {below}
    </div>
  );
}

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

  // Any Lucide icon, written as on lucide.dev ("calendar-days") or as its code name ("CalendarDays"). It's saved as the code name.
  const icon = v.icon.trim();
  if (icon) {
    const lucideName = normalizeLucideIconName(icon);
    if (!lucideName) errors.icon = "Lucide has no icon by this name. Check the name on lucide.dev/icons.";
    else if (!ICON_NAME_PATTERN.test(lucideName)) errors.icon = "Use letters and digits starting with a letter, up to 60 characters.";
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
  // A new module's code follows its name until the code is typed by hand; an existing module's code never changes.
  const [codeTouched, setCodeTouched] = useState(editing);

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

  function setName(name: string) {
    setValues((prev) => ({ ...prev, moduleName: name, code: codeTouched ? prev.code : codeFrom(name) }));
    if (errors.moduleName || (!codeTouched && errors.code)) setErrors((prev) => ({ ...prev, moduleName: undefined, code: codeTouched ? prev.code : undefined }));
  }

  function setCode(code: string) {
    setCodeTouched(code !== "");
    setString("code", code.toUpperCase());
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
      const icon = normalizeLucideIconName(values.icon);
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
  const iconName = values.icon.trim();
  const parentTrail = parentOptions.find((o) => o.value === values.parentId)?.label;
  const route = isCore ? mod!.route_name : values.routeName.trim();
  const kind = values.isPermission ? "Permission module" : route ? "Link" : "Menu group";
  const lucideName = normalizeLucideIconName(iconName);

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${mod!.module_name}` : "New module"}</h1>
          <p className="type-body m-0 text-text-soft">{editing ? "Change how this module looks, where it sits and whether it grants access." : "Add a menu group, a link, or a module roles can be given."}</p>
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

      {(failure || fieldErrorCount > 0) && (
        <div className="flex flex-col gap-2">
          {failure && <ErrorBanner>{failure}</ErrorBanner>}
          {fieldErrorCount > 0 && <ErrorBanner>{fieldErrorCount === 1 ? "Fix 1 field to continue." : `Fix ${fieldErrorCount} fields to continue.`}</ErrorBanner>}
        </div>
      )}

      <form id="module-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-8">
        {/* Left: how the module will show in the menu, updated as you type. Stays in view while the form scrolls. */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <IconTile tone="accent" size="lg">
                  {createElement(iconForModule(previewCode, iconName || null))}
                </IconTile>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className={values.moduleName.trim() ? "type-h3 m-0 break-words text-text" : "type-h3 m-0 text-text-faint"}>{values.moduleName.trim() || "Module name"}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone="neutral" size="sm">
                      {kind}
                    </Pill>
                    {!values.isMenu && (
                      <Pill tone="neutral" size="sm">
                        Not in menu
                      </Pill>
                    )}
                    {isCore && (
                      <Tooltip content={CORE_TOOLTIP}>
                        <span tabIndex={0} className="inline-flex">
                          <Pill size="sm">Core</Pill>
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="type-body-sm m-0 flex min-w-0 items-center gap-2 text-text-soft">
                  <Folder className="size-4 flex-none" />
                  <span className="truncate">{values.parentId === TOP_LEVEL ? "Top of the menu" : `Under ${parentTrail}`}</span>
                </p>
                <p className={route ? "type-body-sm m-0 flex min-w-0 items-center gap-2 text-text-soft" : "type-body-sm m-0 flex items-center gap-2 text-text-faint"}>
                  <Link2 className="size-4 flex-none" />
                  <span className="truncate font-mono">{route || "No page: groups other items"}</span>
                </p>
                <p className={previewCode ? "type-body-sm m-0 flex min-w-0 items-center gap-2 text-text-soft" : "type-body-sm m-0 flex items-center gap-2 text-text-faint"}>
                  <KeyRound className="size-4 flex-none" />
                  <span className="truncate font-mono">{previewCode || "CODE"}</span>
                </p>
              </div>
              {editing && (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <RecordKv single items={[{ label: "Status", value: <StatusPill kind="account" status={mod!.is_active ? "active" : "inactive"} /> }]} />
                  {mod!.always_on && (
                    <Note icon={<InfoIcon />} className="mt-0">
                      The admin screens need this module, so it stays on.
                    </Note>
                  )}
                </div>
              )}
            </div>
          </Card>
          <p className="type-body-sm m-0 px-1 text-text-faint">{editing ? "The code can't change, so nothing that uses it breaks." : "New modules start switched on. The code is fixed once created."}</p>
        </aside>

        {/* Right: what it is, where it sits, how it behaves. */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="type-h3 m-0 px-1 text-text">About the module</h2>
            <Card>
              <div className="flex flex-col gap-5">
                <div className={editing ? "flex flex-col gap-5" : "grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,260px)]"}>
                  <Field label="Name" htmlFor="mod-name" required error={errors.moduleName} hint="Shown in the menu and the role editor.">
                    <Input id="mod-name" value={values.moduleName} error={!!errors.moduleName} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales reports" maxLength={250} autoComplete="off" autoFocus={!editing} />
                  </Field>
                  {!editing && (
                    <Field label="Code" htmlFor="mod-code" required error={errors.code} hint={codeTouched ? "Capitals, digits and underscores." : "Made from the name."}>
                      <Input id="mod-code" value={values.code} error={!!errors.code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SALES_REPORTS" maxLength={80} autoComplete="off" spellCheck={false} className="font-mono" />
                    </Field>
                  )}
                </div>
                <Field label="Description" htmlFor="mod-description" error={errors.description} hint="Optional. What the module is for.">
                  <Textarea id="mod-description" rows={3} value={values.description} error={!!errors.description} onChange={(e) => setString("description", e.target.value)} maxLength={2000} placeholder="e.g. Sales figures by event and month." />
                </Field>
              </div>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="type-h3 m-0 px-1 text-text">Place in the menu</h2>
            <Card>
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)]">
                  <Field label="Sits under" htmlFor="mod-parent" error={errors.parentId} hint="Top level puts it straight in the menu.">
                    <Select id="mod-parent" value={values.parentId} onValueChange={(v) => setString("parentId", v)} options={parentOptions} />
                  </Field>
                  <Field label="Order" htmlFor="mod-sno" required error={errors.sno} hint="Lower comes first.">
                    <Input id="mod-sno" type="number" inputMode="numeric" min={0} max={10000} step={1} value={values.sno} error={!!errors.sno} onChange={(e) => setString("sno", e.target.value)} />
                  </Field>
                </div>
                <Field
                  label="Icon"
                  htmlFor="mod-icon"
                  error={errors.icon}
                  hint={
                    !iconName
                      ? "Optional. Any icon from lucide.dev/icons, like calendar-days or CalendarDays."
                      : lucideName
                        ? `Lucide icon ${lucideName}.`
                        : "Lucide has no icon by this name yet. Check the name on lucide.dev/icons."
                  }
                >
                  <InputGroup
                    id="mod-icon"
                    leading={<InputAddon>{createElement(iconForModule(previewCode, iconName || null), { className: "size-4" })}</InputAddon>}
                    value={values.icon}
                    error={!!errors.icon}
                    onChange={(e) => setString("icon", e.target.value)}
                    placeholder="e.g. CalendarDays"
                    maxLength={60}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>
              </div>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="type-h3 m-0 px-1 text-text">Behaviour</h2>
            <Card>
              <div className="flex flex-col">
                <OptionRow
                  icon={<Link2 />}
                  title={
                    <>
                      Page address
                      {isCore && (
                        <Tooltip content={CORE_TOOLTIP}>
                          <span tabIndex={0} className="inline-flex">
                            <Pill size="sm">Core</Pill>
                          </span>
                        </Tooltip>
                      )}
                    </>
                  }
                  hint={isCore ? "The app depends on this address, so it can't change." : "Optional. Leave it empty for a group that only holds other items."}
                  error={errors.routeName}
                  below={
                    <div className="sm:pl-11">
                      {isCore ? (
                        <p className="m-0 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[13px] text-text">{mod!.route_name ?? "Group container"}</p>
                      ) : (
                        <Input id="mod-route" aria-label="Page address" value={values.routeName} error={!!errors.routeName} onChange={(e) => setString("routeName", e.target.value)} placeholder="/reports/sales" maxLength={250} autoComplete="off" spellCheck={false} className="font-mono" />
                      )}
                    </div>
                  }
                />
                <OptionRow icon={<Eye />} title="Show in menu" hint={values.isMenu ? "People who can open it see it in the menu." : "Hidden from the menu. The page still opens by its address."}>
                  <Switch checked={values.isMenu} onCheckedChange={(checked) => setValues((prev) => ({ ...prev, isMenu: checked }))} aria-label="Show in menu" />
                </OptionRow>
                <OptionRow
                  icon={<KeyRound />}
                  title={
                    <>
                      Roles can be given it
                      {isCore && (
                        <Tooltip content={CORE_TOOLTIP}>
                          <span tabIndex={0} className="inline-flex">
                            <Pill size="sm">Core</Pill>
                          </span>
                        </Tooltip>
                      )}
                    </>
                  }
                  hint="Platform roles can be given access to it. Organization roles only get the modules the app is built for."
                  error={errors.isPermission}
                >
                  <Switch
                    checked={values.isPermission}
                    disabled={isCore}
                    aria-label="Roles can be given it"
                    onCheckedChange={(checked) => {
                      setValues((prev) => ({ ...prev, isPermission: checked }));
                      if (errors.isPermission) setErrors((prev) => ({ ...prev, isPermission: undefined }));
                    }}
                  />
                </OptionRow>
              </div>
            </Card>
          </section>
        </div>
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
