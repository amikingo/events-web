"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { InfoIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError, grantExceedsOwnAccessMessage } from "@/lib/api/errors";
import type { PlatformRoleCreateInput } from "@/lib/api/platform";
import type { GrantAction, GrantableModule, Role, RoleGrantInput, RoleUpdateInput } from "@/lib/api/roles";
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

interface PlatformRoleFormProps {
  role?: Role;
  grantableModules: GrantableModule[];
  onCreate: (input: PlatformRoleCreateInput) => Promise<void>;
  onUpdate: (changes: RoleUpdateInput) => Promise<void>;
  onCancel: () => void;
}

export function PlatformRoleForm({ role, grantableModules, onCreate, onUpdate, onCancel }: PlatformRoleFormProps) {
  const editing = Boolean(role);
  const orderedModules = sortGrantableModules(grantableModules);
  const visibleCodes = orderedModules.map((m) => m.module_code);

  const moduleNames: Record<string, string> = {};
  for (const mod of orderedModules) {
    moduleNames[mod.module_code] = mod.module_name;
  }

  const [start] = useState(() => startValues(role, orderedModules));
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
    if (err.code === "role_locked" || err.code === "permission_denied") {
      toast.error(describeApiError(err, "platform role"));
      return true;
    }
    if (err.code === "conflict") {
      const field = (err.details as { field?: string } | undefined)?.field;
      if (field === "code") {
        setErrors((prev) => ({ ...prev, code: "Another platform role already uses this code." }));
        return true;
      }
      if (field === "name") {
        setErrors((prev) => ({ ...prev, name: "Another platform role already has this name." }));
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
          grants: grantsPayload,
        });
      }
    } catch (err) {
      if (!applyApiErrors(err, grantsPayload)) {
        setFailure(describeApiError(err, "platform role"));
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
            { label: "Platform roles", onClick: cancel },
            ...(editing ? [{ label: role!.name, onClick: cancel }] : []),
            { label: editing ? "Edit role" : "New platform role" },
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${role!.name}` : "New platform role"}</h1>
            <p className="type-body m-0 text-text-soft">
              {editing ? "Change the name, description, or module permissions." : "Choose what platform staff with this role can do."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="platform-role-form" loading={saving} loadingLabel={editing ? "Saving" : "Creating"} disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create role"}
            </Button>
          </div>
        </div>
      </div>

      <Note icon={<InfoIcon />}>A platform role&apos;s access to organization modules applies in every organization.</Note>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {fieldErrorCount > 0 && (
        <ErrorBanner>{fieldErrorCount === 1 ? "Fix 1 field to continue." : `Fix ${fieldErrorCount} fields to continue.`}</ErrorBanner>
      )}

      <form id="platform-role-form" onSubmit={submit} noValidate className="flex flex-col gap-6">
        <Card>
          <CardHeader title="Details" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {editing ? (
              <Field label="Code" htmlFor="pr-code" hint="Can't be changed after the role is created.">
                <Input id="pr-code" value={role!.code} disabled className="font-mono" />
              </Field>
            ) : (
              <Field label="Code" htmlFor="pr-code" required error={errors.code} hint="Upper case letters, digits and _. Can't be changed later.">
                <Input
                  id="pr-code"
                  value={values.code}
                  error={!!errors.code}
                  onChange={(e) => setField("code", e.target.value.toUpperCase())}
                  placeholder="PLATFORM_SUPPORT"
                  maxLength={80}
                  autoComplete="off"
                  className="font-mono uppercase"
                />
              </Field>
            )}
            <Field label="Name" htmlFor="pr-name" required error={errors.name}>
              <Input
                id="pr-name"
                value={values.name}
                error={!!errors.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Platform Support"
                maxLength={250}
                autoComplete="off"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="pr-description" error={errors.description} hint="Optional. Helps admins pick the right role for platform staff.">
                <Textarea
                  id="pr-description"
                  value={values.description}
                  error={!!errors.description}
                  onChange={(e) => setField("description", e.target.value)}
                  maxLength={2000}
                />
              </Field>
            </div>
          </div>
        </Card>

        <GrantGrid visibleModules={orderedModules} grants={values.grants} errors={errors.grants} onToggle={toggleGrant} />
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
