"use client";

import { useState } from "react";
import { InfoIcon } from "@/components/ui/icons";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import type { GrantAction, GrantableModule, RoleGrantInput } from "@/lib/api/roles";
import type { RoleTemplate, RoleTemplateCreateInput, RoleTemplateUpdateInput } from "@/lib/api/role-templates";
import {
  GrantGrid,
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
  forNewOrganizations: boolean;
  grants: GrantState;
}

type FieldErrors = {
  code?: string;
  name?: string;
  description?: string;
  grants: Record<string, string>;
};

const CODE_PATTERN = /^[A-Za-z0-9_]+$/;

function startValues(template: RoleTemplate | undefined, modules: readonly GrantableModule[]): Values {
  return {
    code: template?.code ?? "",
    name: template?.name ?? "",
    description: template?.description ?? "",
    forNewOrganizations: template?.for_new_organizations ?? false,
    grants: initialGrantState(template?.grants, modules),
  };
}

function validate(v: Values, editing: boolean): FieldErrors {
  const errors: FieldErrors = { grants: {} };
  if (!editing) {
    const code = v.code.trim();
    if (!code) errors.code = "Enter a template code.";
    else if (code.length > 80) errors.code = "Use 80 characters or fewer.";
    else if (!CODE_PATTERN.test(code)) errors.code = "Use letters, digits and underscores only.";
  }
  const name = v.name.trim();
  if (!name) errors.name = "Enter a template name.";
  else if (name.length > 250) errors.name = "Use 250 characters or fewer.";

  if (v.description.trim().length > 2000) errors.description = "Use 2,000 characters or fewer.";
  return errors;
}

interface RoleTemplateFormProps {
  template?: RoleTemplate;
  grantableModules: GrantableModule[];
  onCreate: (input: RoleTemplateCreateInput) => Promise<void>;
  onUpdate: (changes: RoleTemplateUpdateInput) => Promise<void>;
  onCancel: () => void;
}

export function RoleTemplateForm({ template, grantableModules, onCreate, onUpdate, onCancel }: RoleTemplateFormProps) {
  const editing = Boolean(template);
  const orderedModules = sortGrantableModules(grantableModules);
  const allCodes = orderedModules.map((m) => m.module_code);
  const [start] = useState(() => startValues(template, orderedModules));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<FieldErrors>({ grants: {} });
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const textDirty =
    values.code !== start.code ||
    values.name !== start.name ||
    values.description !== start.description ||
    values.forNewOrganizations !== start.forNewOrganizations;
  const grantsDirty = !grantsEqual(values.grants, start.grants, allCodes);
  const dirty = textDirty || grantsDirty;

  function setField<K extends "code" | "name" | "description">(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
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

    if (err.code === "role_locked" || err.code === "permission_denied") {
      toast.error(describeApiError(err, "template"));
      return true;
    }
    if (err.code === "conflict") {
      const field = (err.details as { field?: string } | undefined)?.field;
      if (field === "code") {
        setErrors((prev) => ({ ...prev, code: "Another template already uses this code." }));
        return true;
      }
      if (field === "name") {
        setErrors((prev) => ({ ...prev, name: "Another template already has this name." }));
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
      if (template) {
        const changes: RoleTemplateUpdateInput = {};
        if (values.name.trim() !== template.name) changes.name = values.name.trim();
        const normalizedDesc = values.description.trim() || null;
        if (normalizedDesc !== template.description) changes.description = normalizedDesc;
        if (values.forNewOrganizations !== template.for_new_organizations) {
          changes.for_new_organizations = values.forNewOrganizations;
        }
        if (grantsDirty) changes.grants = grantsPayload;
        await onUpdate(changes);
      } else {
        await onCreate({
          code: values.code.trim(),
          name: values.name.trim(),
          ...(values.description.trim() ? { description: values.description.trim() } : {}),
          for_new_organizations: values.forNewOrganizations,
          grants: grantsPayload,
        });
      }
    } catch (err) {
      if (!applyApiErrors(err, grantsPayload)) {
        setFailure(describeApiError(err, "template"));
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
            { label: "Role templates", onClick: cancel },
            ...(editing ? [{ label: template!.name, onClick: cancel }] : []),
            { label: editing ? "Edit template" : "New template" },
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${template!.name}` : "New template"}</h1>
            <p className="type-body m-0 text-text-soft">
              {editing ? "Change the template details and default access." : "Define a ready-made role organizations can start from."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="template-form" loading={saving} loadingLabel={editing ? "Saving" : "Creating"} disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create template"}
            </Button>
          </div>
        </div>
      </div>

      <Note icon={<InfoIcon />}>Roles made from a template are copies. Editing a template never changes them.</Note>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {fieldErrorCount > 0 && (
        <ErrorBanner>{fieldErrorCount === 1 ? "Fix 1 field to continue." : `Fix ${fieldErrorCount} fields to continue.`}</ErrorBanner>
      )}

      <form id="template-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Template details" subtitle="How the template is named, identified and used." />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name" htmlFor="tpl-name" required error={errors.name}>
              <Input
                id="tpl-name"
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
              htmlFor="tpl-code"
              required={!editing}
              error={errors.code}
              hint={editing ? "Can't be changed after the template is created." : "Letters, digits and underscores. It can't be changed later."}
            >
              <Input
                id="tpl-code"
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
              <Field label="Description" htmlFor="tpl-description" error={errors.description} hint="Optional. Helps admins pick the right template.">
                <Textarea
                  id="tpl-description"
                  value={values.description}
                  error={!!errors.description}
                  onChange={(e) => setField("description", e.target.value)}
                  maxLength={2000}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field hint="New organizations get a role made from this template. Existing organizations don't change.">
                <Switch
                  checked={values.forNewOrganizations}
                  onCheckedChange={(checked) => setValues((prev) => ({ ...prev, forNewOrganizations: checked }))}
                  label="For new organizations"
                />
              </Field>
            </div>
          </div>
        </Card>

        <GrantGrid
          visibleModules={orderedModules}
          grants={values.grants}
          errors={errors.grants}
          onToggle={toggleGrant}
        />
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
