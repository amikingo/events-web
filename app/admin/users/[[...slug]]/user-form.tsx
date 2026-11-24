"use client";

import { useState } from "react";
import { Avatar } from "../../../../components/ui/avatar";
import { Breadcrumb } from "../../../../components/ui/breadcrumb";
import { Button } from "../../../../components/ui/button";
import { Card, CardHeader } from "../../../../components/ui/card";
import { ConfirmDialog } from "../../../../components/ui/confirm-dialog";
import { Field } from "../../../../components/ui/field";
import { Input } from "../../../../components/ui/input";
import { PhoneInput } from "../../../../components/ui/phone-input";
import { Pill } from "../../../../components/ui/pill";
import { SegmentedControl } from "../../../../components/ui/segmented-control";
import { StatusPill } from "../../../../components/ui/status-pill";
import { Textarea } from "../../../../components/ui/textarea";
import type { Member, MemberRole } from "../../../../lib/services/members-service";

export interface UserFormValues {
  name: string;
  email: string;
  phone: string;
  role: MemberRole;
  department: string;
  note: string;
}

const EMPTY: UserFormValues = { name: "", email: "", phone: "", role: "Staff", department: "", note: "" };

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

interface UserFormProps {
  /** The person being edited. Leave out to create a new one. */
  member?: Member;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
}

/**
 * Create and edit page for a user: a normal page with two cards of fields and a live summary beside them.
 * The buttons sit in the header so they are always in view.
 */
export function UserForm({ member, onSubmit, onCancel }: UserFormProps) {
  const editing = Boolean(member);
  const start: UserFormValues = member
    ? { name: member.name, email: member.email, phone: member.phone, role: member.role, department: member.department, note: member.note }
    : EMPTY;

  const [values, setValues] = useState<UserFormValues>(start);
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const dirty = (Object.keys(start) as (keyof UserFormValues)[]).some((k) => values[k] !== start[k]);

  function set<K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = "Enter the person’s full name.";
    if (!values.email.trim()) next.email = "Enter their work email.";
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = "Enter a valid email, like name@company.com.";
    if (!values.department.trim()) next.department = "Enter a department.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    onSubmit(values);
  }

  function cancel() {
    if (dirty) setDiscardOpen(true);
    else onCancel();
  }

  const title = editing ? `Edit ${member!.name}` : "New user";
  const submitLabel = editing ? "Save changes" : "Create user";
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb
          items={[
            { label: "Users", onClick: cancel },
            ...(editing ? [{ label: member!.name, onClick: cancel }] : []),
            { label: editing ? "Edit" : "New user" },
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{title}</h1>
            <p className="type-body m-0 text-text-soft">
              {editing ? "Change their details or access." : "Add a person and choose what they can do."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="user-form" loading={saving} loadingLabel="Saving" disabled={editing && !dirty}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>

      {errorCount > 0 && (
        <p role="alert" className="type-body m-0 rounded-md border border-border bg-surface px-4 py-3 text-danger">
          {errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}
        </p>
      )}

      <form id="user-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Personal details" subtitle="Who this person is and how to reach them." />
            <div className="flex flex-col gap-4">
              <Field label="Full name" htmlFor="name" required error={errors.name}>
                <Input id="name" value={values.name} error={!!errors.name} onChange={(e) => set("name", e.target.value)} placeholder="Hana Bekele" autoComplete="off" />
              </Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Email" htmlFor="email" required error={errors.email}>
                  <Input id="email" type="email" value={values.email} error={!!errors.email} onChange={(e) => set("email", e.target.value)} placeholder="name@company.com" autoComplete="off" />
                </Field>
                <Field label="Phone" htmlFor="phone" hint="Optional.">
                  <PhoneInput id="phone" value={values.phone} onValueChange={(v) => set("phone", v)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Access" subtitle="What they can do and where they work." />
            <div className="flex flex-col gap-4">
              <Field label="Role" hint="Admins can manage users and settings.">
                <SegmentedControl
                  aria-label="Role"
                  value={values.role}
                  onValueChange={(v) => set("role", v as MemberRole)}
                  options={[
                    { value: "Admin", label: "Admin" },
                    { value: "Manager", label: "Manager" },
                    { value: "Staff", label: "Staff" },
                  ]}
                />
              </Field>
              <Field label="Department" htmlFor="department" required error={errors.department}>
                <Input id="department" value={values.department} error={!!errors.department} onChange={(e) => set("department", e.target.value)} placeholder="Sales" autoComplete="off" />
              </Field>
              <Field label="Note" htmlFor="note" hint="Only admins see this.">
                <Textarea id="note" value={values.note} onChange={(e) => set("note", e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-4">
          <CardHeader title="Summary" subtitle="How this person will appear." />
          <div className="flex items-center gap-3">
            <Avatar initials={initialsOf(values.name) || "?"} size={48} />
            <div className="flex min-w-0 flex-col">
              <span className="type-body font-medium truncate text-text">{values.name.trim() || "New user"}</span>
              <span className="type-body-sm truncate text-text-faint">{values.email.trim() || "No email yet"}</span>
            </div>
          </div>
          <dl className="m-0 mt-4 flex flex-col divide-y divide-border">
            <div className="flex items-center justify-between py-2.5">
              <dt className="type-body text-text-soft">Role</dt>
              <dd className="m-0">
                <Pill>{values.role}</Pill>
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="type-body text-text-soft">Department</dt>
              <dd className="type-body m-0 text-text">{values.department.trim() || "Not set"}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="type-body text-text-soft">Status</dt>
              <dd className="m-0">
                <StatusPill kind="account" status={member?.status ?? "invited"} />
              </dd>
            </div>
          </dl>
          {!editing && <p className="type-body-sm m-0 mt-3 text-text-faint">They get an invitation by email once you create the account.</p>}
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
