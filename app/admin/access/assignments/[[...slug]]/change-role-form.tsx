"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { Role } from "@/lib/api/roles";
import type { StaffAssignment } from "@/lib/api/staff";

const ORGANIZATION_WIDE = "all";

interface ChangeRoleFormProps {
  assignment: StaffAssignment;
  personName: string;
  roles: Role[];
  /** Only when the organization has branches. */
  branches?: { id: string; name: string; is_active: boolean }[];
  /** Persist. Throw an Error with a message to keep the form open and show it. */
  onSubmit: (changes: { role_id?: string; branch_id?: string | null }) => Promise<void>;
  onCancel: () => void;
}

/** Edit page for a staff assignment: the role, and the branch it applies to. The person and their account never change here. */
export function ChangeRoleForm({ assignment, personName, roles, branches, onSubmit, onCancel }: ChangeRoleFormProps) {
  const [roleId, setRoleId] = useState(assignment.role.id);
  const [where, setWhere] = useState(assignment.branch?.id ?? ORGANIZATION_WIDE);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const dirty = roleId !== assignment.role.id || where !== (assignment.branch?.id ?? ORGANIZATION_WIDE);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const changes: { role_id?: string; branch_id?: string | null } = {};
    if (roleId !== assignment.role.id) changes.role_id = roleId;
    if (branches && where !== (assignment.branch?.id ?? ORGANIZATION_WIDE)) changes.branch_id = where === ORGANIZATION_WIDE ? null : where;
    setFailure(null);
    setSaving(true);
    try {
      await onSubmit(changes);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "We couldn't change the role. Try again.");
      setSaving(false);
    }
  }

  function cancel() {
    if (dirty) setDiscardOpen(true);
    else onCancel();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb items={[{ label: "Staff assignments", onClick: cancel }, { label: personName, onClick: cancel }, { label: "Change role" }]} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">Change role for {personName}</h1>
            <p className="type-body m-0 text-text-soft">A changed role applies on their next request. They don&apos;t need to sign out.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="role-form" loading={saving} loadingLabel="Saving" disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}

      <form id="role-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Role" subtitle="What they can see and do here." />
          <div className="flex flex-col gap-4">
            <Field label="Role" htmlFor="cr-role" required>
              <Select id="cr-role" placeholder="Choose an active role" options={roles.filter((r) => r.is_active).map((r) => ({ value: r.id, label: r.name }))} value={roleId} onValueChange={setRoleId} />
            </Field>
            {branches && (
              <Field label="Where" htmlFor="cr-where" hint="One branch only, or the whole organization.">
                <Select
                  id="cr-where"
                  options={[{ value: ORGANIZATION_WIDE, label: "Whole organization" }, ...branches.filter((b) => b.is_active || b.id === assignment.branch?.id).map((b) => ({ value: b.id, label: b.name }))]}
                  value={where}
                  onValueChange={setWhere}
                />
              </Field>
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
