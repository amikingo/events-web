"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Avatar } from "../../../../components/ui/avatar";
import { Button } from "../../../../components/ui/button";
import { EmptyState } from "../../../../components/ui/empty-state";
import { Field } from "../../../../components/ui/field";
import { CheckIcon } from "../../../../components/ui/icons";
import { Input } from "../../../../components/ui/input";
import { Select } from "../../../../components/ui/select";
import { StatusPill } from "../../../../components/ui/status-pill";
import { Table } from "../../../../components/ui/table";
import type { ColumnDef, RowAction } from "../../../../components/ui/table";
import { toast } from "../../../../components/ui/toaster";
import { membersService } from "../../../../lib/services/members-service";
import type { Member, MemberRole } from "../../../../lib/services/members-service";
import { SampleNote, SettingsGroup } from "./settings-ui";

const ROLE_OPTIONS = [
  { value: "Admin", label: "Admin" },
  { value: "Manager", label: "Manager" },
  { value: "Staff", label: "Staff" },
];

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const nameFromEmail = (email: string) =>
  email
    .split("@")[0]!
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

interface Permission {
  id: string;
  label: string;
  Admin: boolean;
  Manager: boolean;
  Staff: boolean;
}

const PERMISSIONS: Permission[] = [
  { id: "p1", label: "View dashboards and reports", Admin: true, Manager: true, Staff: true },
  { id: "p2", label: "Record and edit payments", Admin: true, Manager: true, Staff: true },
  { id: "p3", label: "Approve requests", Admin: true, Manager: true, Staff: false },
  { id: "p4", label: "Export data", Admin: true, Manager: true, Staff: false },
  { id: "p5", label: "Add and manage users", Admin: true, Manager: false, Staff: false },
  { id: "p6", label: "Change workspace settings", Admin: true, Manager: false, Staff: false },
];

const mark = (allowed: boolean, who: string) =>
  allowed ? <CheckIcon className="size-4 text-success" aria-label={`${who} can`} /> : <span aria-label={`${who} cannot`} className="text-text-faint">—</span>;

const permissionColumns: ColumnDef<Permission>[] = [
  { key: "label", header: "What they can do", primary: true, accessor: (r) => r.label },
  { key: "Admin", header: "Admin", filter: false, render: (r) => mark(r.Admin, "Admin") },
  { key: "Manager", header: "Manager", filter: false, render: (r) => mark(r.Manager, "Manager") },
  { key: "Staff", header: "Staff", filter: false, render: (r) => mark(r.Staff, "Staff") },
];

export function TeamTab() {
  const router = useRouter();
  const members = useSyncExternalStore(
    (cb) => membersService.subscribe(cb),
    () => membersService.getSnapshot(),
    () => membersService.getSnapshot(),
  );

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("Staff");
  const [emailError, setEmailError] = useState<string>();
  const [inviting, setInviting] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return setEmailError("Enter an email address.");
    if (!/^\S+@\S+\.\S+$/.test(value)) return setEmailError("Enter a valid email, like name@company.com.");
    if (members.some((m) => m.email.toLowerCase() === value)) return setEmailError("That person is already on your team.");
    setInviting(true);
    await new Promise((r) => setTimeout(r, 300));
    const today = new Date().toISOString().slice(0, 10);
    membersService.create({ id: membersService.nextId(), name: nameFromEmail(value), email: value, phone: "", role, department: "Unassigned", status: "invited", joined: today, lastActive: today, note: "" });
    setInviting(false);
    setEmail("");
    toast.success("Invitation added", { body: `${value} is on the list as ${role}.` });
  }

  const memberColumns: ColumnDef<Member>[] = [
    {
      key: "name",
      header: "Member",
      primary: true,
      sortable: true,
      filterValue: (r) => `${r.name} ${r.email}`,
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <Avatar initials={initialsOf(r.name)} size={32} />
          <div className="flex min-w-0 flex-col">
            <span className="type-body font-medium text-text">{r.name}</span>
            <span className="type-body-sm text-text-faint">{r.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      filterValue: (r) => r.role,
      render: (r) => (
        <div className="w-36" onClick={(e) => e.stopPropagation()}>
          <Select
            aria-label={`Role for ${r.name}`}
            value={r.role}
            options={ROLE_OPTIONS}
            onValueChange={(v) => (membersService.update(r.id, { role: v as MemberRole }), toast.success(`${r.name} is now ${v}`))}
          />
        </div>
      ),
    },
    { key: "status", header: "Status", mobile: "badge", filterValue: (r) => r.status, render: (r) => <StatusPill kind="account" status={r.status} /> },
  ];

  /** Suspending or reactivating an account is done on the person's own page (the "⋯" menu there), never from a row. */
  const memberActions = (r: Member): RowAction<Member>[] => [
    { key: "view", label: "View profile", view: true, onClick: () => router.push(`/admin/users/${r.id}`) },
    ...(r.status === "invited" ? [{ key: "resend", label: "Send invite again", onClick: () => toast.success("Invitation sent again", { body: `We’ll send it to ${r.email}.` }) }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <SampleNote>The people here are examples and are kept until you reload the page. Connect your own user directory to make them permanent.</SampleNote>

      <form onSubmit={invite} noValidate>
        <SettingsGroup title="Invite people" description="They get an email with a link to join.">
          <div className="grid grid-cols-1 items-start gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_180px_auto]">
            <Field label="Email" htmlFor="invite-email" error={emailError}>
              <Input id="invite-email" type="email" value={email} error={!!emailError} onChange={(e) => (setEmail(e.target.value), setEmailError(undefined))} placeholder="name@company.com" autoComplete="off" />
            </Field>
            <Field label="Role" htmlFor="invite-role">
              <Select id="invite-role" value={role} options={ROLE_OPTIONS} onValueChange={(v) => setRole(v as MemberRole)} />
            </Field>
            <div className="md:pt-[26px]">
              <Button type="submit" loading={inviting} loadingLabel="Inviting" className="w-full md:w-auto">
                Send invite
              </Button>
            </div>
          </div>
        </SettingsGroup>
      </form>

      <Table
        title={`Members (${members.length})`}
        columns={memberColumns}
        data={members}
        getRowId={(m) => m.id}
        rowActions={memberActions}
        filters={false}
        pagination={members.length > 10}
        emptyState={<EmptyState title="No members yet" description="Invite someone above to get started." />}
      />

      <Table
        title="Roles and permissions"
        columns={permissionColumns}
        data={PERMISSIONS}
        getRowId={(p) => p.id}
        toolbar
        filters={false}
        pagination={false}
      />

    </div>
  );
}
