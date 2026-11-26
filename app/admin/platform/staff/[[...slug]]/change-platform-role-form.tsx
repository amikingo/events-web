"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { RecordKv } from "@/components/ui/record-view";
import { Select } from "@/components/ui/select";
import { describeApiError } from "@/lib/api/errors";
import type { Role } from "@/lib/api/roles";
import type { StaffAssignment } from "@/lib/api/staff";

interface ChangePlatformRoleFormProps {
  assignment: StaffAssignment;
  personName: string;
  roles: Role[];
  onSubmit: (roleId: string) => Promise<void>;
  onCancel: () => void;
}

/** Edit page for changing a platform staff member's platform role. */
export function ChangePlatformRoleForm({ assignment, personName, roles, onSubmit, onCancel }: ChangePlatformRoleFormProps) {
  const [roleId, setRoleId] = useState(assignment.role.id);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const dirty = roleId !== assignment.role.id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) {
      onCancel();
      return;
    }
    setFailure(null);
    setSaving(true);
    try {
      await onSubmit(roleId);
    } catch (err) {
      setFailure(describeApiError(err, "platform person"));
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
        <Breadcrumb items={[{ label: "Platform staff", onClick: cancel }, { label: personName, onClick: cancel }, { label: "Change role" }]} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">Change role for {personName}</h1>
            <p className="type-body m-0 text-text-soft">A changed platform role applies on their next request.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="platform-role-edit-form" loading={saving} loadingLabel="Saving" disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}

      <form id="platform-role-edit-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Platform role" subtitle="What they can see and do at platform scope." />
          <Field label="Role" htmlFor="pr-edit-role" required>
            <Select
              id="pr-edit-role"
              placeholder="Choose an active role"
              options={roles.filter((r) => r.is_active).map((r) => ({ value: r.id, label: r.name }))}
              value={roleId}
              onValueChange={setRoleId}
            />
          </Field>
        </Card>

        <Card>
          <CardHeader title="The person" subtitle="Their Cheche account never changes here." />
          <RecordKv single items={[{ label: "Name", value: personName }, { label: "Mobile", value: assignment.profile?.mobile ?? "—" }]} />
        </Card>
      </form>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard changes?"
        description="You changed the role, and haven't saved it yet."
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
