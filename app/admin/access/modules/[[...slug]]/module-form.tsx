"use client";

import { createElement, useState } from "react";
import { InfoIcon } from "@/components/ui/icons";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { RecordKv } from "@/components/ui/record-view";
import { StatusPill } from "@/components/ui/status-pill";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import type { ModuleNode, ModuleUpdateInput } from "@/lib/api/modules";
import { iconForModule } from "@/lib/rbac/module-sidebar";

const ICON_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,59}$/;

interface Values {
  moduleName: string;
  description: string;
  sno: string;
  icon: string;
}

type FieldErrors = Partial<Record<"moduleName" | "description" | "sno" | "icon", string>>;

function startValues(mod: ModuleNode): Values {
  return {
    moduleName: mod.module_name,
    description: mod.description ?? "",
    sno: String(mod.sno),
    icon: mod.icon ?? "",
  };
}

function validate(v: Values): FieldErrors {
  const errors: FieldErrors = {};
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

  return errors;
}

interface ModuleFormProps {
  mod: ModuleNode;
  onSave: (changes: ModuleUpdateInput) => Promise<void>;
  onCancel: () => void;
}

export function ModuleForm({ mod, onSave, onCancel }: ModuleFormProps) {
  const [start] = useState(() => startValues(mod));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const dirty =
    values.moduleName !== start.moduleName ||
    values.description !== start.description ||
    values.sno !== start.sno ||
    values.icon !== start.icon;

  function setField<K extends keyof Values>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function applyApiErrors(err: unknown): boolean {
    if (!(err instanceof ApiError)) return false;

    if (err.code === "permission_denied") {
      toast.error("You don't have permission to do this.");
      return true;
    }
    if (err.code === "validation_error") {
      const issues = (err.details as { issues?: Array<{ path?: string; message?: string }> } | undefined)?.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        const next: FieldErrors = {};
        const unmatched: string[] = [];
        for (const issue of issues) {
          const path = issue.path ?? "";
          const msg = issue.message ?? "Check this value.";
          if (path === "body.module_name") next.moduleName = msg;
          else if (path === "body.description") next.description = msg;
          else if (path === "body.sno") next.sno = msg;
          else if (path === "body.icon") next.icon = msg;
          else unmatched.push(msg);
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
    const next = validate(values);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setFailure(null);
    setSaving(true);
    try {
      const changes: ModuleUpdateInput = {};
      if (values.moduleName.trim() !== mod.module_name) changes.module_name = values.moduleName.trim();
      const desc = values.description.trim() || null;
      if (desc !== mod.description) changes.description = desc;
      const sno = Number(values.sno.trim());
      if (sno !== mod.sno) changes.sno = sno;
      const icon = values.icon.trim() || null;
      if (icon !== mod.icon) changes.icon = icon;

      await onSave(changes);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb
          items={[
            { label: "Modules", onClick: cancel },
            { label: mod.module_name, onClick: cancel },
            { label: "Edit" },
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">Edit {mod.module_name}</h1>
            <p className="type-body m-0 text-text-soft">Update how this entry looks and where it sits in the navigation menu.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="module-form" loading={saving} loadingLabel="Saving" disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {fieldErrorCount > 0 && (
        <ErrorBanner>{fieldErrorCount === 1 ? "Fix 1 field to continue." : `Fix ${fieldErrorCount} fields to continue.`}</ErrorBanner>
      )}

      <form id="module-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Display details" subtitle="Shown in the sidebar and role editor." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="mod-name" required error={errors.moduleName}>
              <Input
                id="mod-name"
                value={values.moduleName}
                error={!!errors.moduleName}
                onChange={(e) => setField("moduleName", e.target.value)}
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
                onChange={(e) => setField("sno", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Icon name" htmlFor="mod-icon" error={errors.icon} hint="A Lucide icon name, such as CalendarDays">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex size-9 flex-none items-center justify-center rounded-sm border border-border bg-surface-2 text-text-soft"
                    aria-hidden="true"
                  >
                    {createElement(iconForModule(mod.code, values.icon.trim() || null), { className: "size-4" })}
                  </span>
                  <Input
                    id="mod-icon"
                    value={values.icon}
                    error={!!errors.icon}
                    onChange={(e) => setField("icon", e.target.value)}
                    placeholder="CalendarDays"
                    maxLength={60}
                    autoComplete="off"
                  />
                </div>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="mod-description" error={errors.description} hint="Optional. Internal note for admins.">
                <Textarea
                  id="mod-description"
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
          <CardHeader title="System identity" subtitle="Managed in code." />
          <div className="flex flex-col gap-4">
            <RecordKv
              single
              items={[
                { label: "Code", value: <span className="font-mono">{mod.code}</span> },
                { label: "Route", value: <span className="font-mono">{mod.route_name ?? "Group container"}</span> },
                { label: "Status", value: <StatusPill kind="account" status={mod.is_active ? "active" : "inactive"} /> },
              ]}
            />
            <Note icon={<InfoIcon />}>Codes, routes and status are fixed: the app depends on them.</Note>
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
