"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError, grantExceedsOwnAccessMessage } from "@/lib/api/errors";
import type { RoleTemplate } from "@/lib/api/role-templates";
import type { GrantAction, GrantableModule, Role, RoleCreateInput, RoleGrantInput, RoleUpdateInput } from "@/lib/api/roles";
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
      grants: initialGrantState(tpl.grants, orderedModules),
    }));
  }

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

        {!editing && templates && templates.length > 0 && (
          <Card>
            <CardHeader
              title="Start from a template"
              subtitle="Optional. Fills the name, description and access below. You can still change anything."
            />
            <div className="max-w-md">
              <Field label="Template" htmlFor="rl-template" error={errors.template}>
                <Select
                  id="rl-template"
                  placeholder="Choose a template"
                  options={[{ value: "none", label: "Build from scratch" }, ...templates.map((t) => ({ value: t.id, label: t.name }))]}
                  value={selectedTemplateId}
                  onValueChange={applyTemplate}
                />
              </Field>
            </div>
          </Card>
        )}

        <GrantGrid
          visibleModules={visibleModules}
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
