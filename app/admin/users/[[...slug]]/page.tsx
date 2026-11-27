"use client";

import { usePathname } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";
import { Avatar } from "../../../../components/ui/avatar";
import { Button } from "../../../../components/ui/button";
import { PlusIcon } from "../../../../components/ui/icons";
import { Pill } from "../../../../components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard, RecordRows } from "../../../../components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "../../../../components/ui/record-workspace";
import { StatusPill } from "../../../../components/ui/status-pill";
import { Table } from "../../../../components/ui/table";
import type { ColumnDef } from "../../../../components/ui/table";
import { toast } from "../../../../components/ui/toaster";
import { UserForm } from "./user-form";
import type { UserFormValues } from "./user-form";
import { formatDate } from "../../../../lib/format";
import { membersService } from "../../../../lib/services/members-service";
import type { Member, MemberRole } from "../../../../lib/services/members-service";

function useMembers(): Member[] {
  return useSyncExternalStore(
    (cb) => membersService.subscribe(cb),
    () => membersService.getSnapshot(),
    () => membersService.getSnapshot(),
  );
}

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const columns: ColumnDef<Member>[] = [
  {
    key: "name",
    header: "Name",
    primary: true,
    sortable: true,
    filterValue: (r) => r.name,
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
  { key: "role", header: "Role", filterValue: (r) => r.role, render: (r) => <Pill>{r.role}</Pill> },
  { key: "department", header: "Department", accessor: (r) => r.department },
  { key: "status", header: "Status", filterValue: (r) => r.status, render: (r) => <StatusPill kind="account" status={r.status} /> },
  { key: "lastActive", header: "Last active", sortable: true, accessor: (r) => formatDate(r.lastActive) },
];

const sections = [
  {
    id: "personal",
    title: "Personal details",
    hint: "Who this person is and how to reach them.",
    fields: [
      { name: "name", label: "Full name", required: true, requiredMessage: "Enter the person’s full name.", full: true },
      { name: "email", label: "Email", type: "email" as const, required: true, requiredMessage: "Enter their work email." },
      { name: "phone", label: "Phone", type: "tel" as const },
    ],
  },
  {
    id: "access",
    title: "Access",
    hint: "What they can do and where they work.",
    fields: [
      {
        name: "role",
        label: "Role",
        type: "segmented" as const,
        options: [
          { label: "Admin", value: "Admin" },
          { label: "Manager", value: "Manager" },
          { label: "Staff", value: "Staff" },
        ],
      },
      { name: "department", label: "Department", required: true, requiredMessage: "Enter a department." },
      { name: "note", label: "Note", type: "textarea" as const, full: true, hint: "Only admins see this." },
    ],
  },
];

/** Change the address without rebuilding the page (so a record page loads once). */
function go(path: string) {
  window.history.pushState(null, "", path);
}

function UsersView() {
  const pathname = usePathname();
  const members = useMembers();
  const location = parseRecordPath("/admin/users", pathname);

  // Create and edit are their own pages with their own layout (not the workspace's built-in form).
  if (location.mode === "create" || location.mode === "edit") {
    const existing = location.mode === "edit" ? members.find((m) => m.id === location.id) : undefined;
    function save(values: UserFormValues) {
      if (existing) {
        membersService.update(existing.id, values);
        toast.success("Changes saved");
        go(`/admin/users/${existing.id}`);
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const created: Member = { id: membersService.nextId(), status: "invited", joined: today, lastActive: today, ...values };
        membersService.create(created);
        toast.success("User added", { body: `${created.name} will get an invitation by email.` });
        go(`/admin/users/${created.id}`);
      }
    }
    return (
      <UserForm
        key={existing?.id ?? "new"}
        member={existing}
        onSubmit={save}
        onCancel={() => go(existing ? `/admin/users/${existing.id}` : "/admin/users")}
      />
    );
  }

  return (
    <RecordWorkspace
      fit
      inlineToasts={false}
      className="h-[calc(100vh-170px)] min-h-[520px]"
      records={members}
      getId={(m) => m.id}
      noun="user"
      listLabel="Users"
      location={location}
      // pushState (not router.push) changes the address without rebuilding the page, so the record page loads once.
      onLocationChange={(next) => go(recordPath("/admin/users", next))}
      list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
        <Table
          columns={columns}
          data={members}
          getRowId={(r) => r.id}
          title="Users"
          onRowClick={onRowClick}
          activeRowId={activeRowId}
          highlightIds={highlightIds}
          onVisibleRowsChange={onVisibleRowsChange}
          toolbarActions={
            <Button onClick={() => go("/admin/users/new")}>
              <PlusIcon className="size-4" />
              New user
            </Button>
          }
          className="rounded-none border-none shadow-none"
        />
      )}
      identity={(m, api) => ({
        avatar: <Avatar initials={initialsOf(m.name)} size={48} />,
        name: m.name,
        status: <StatusPill kind="account" status={m.status} />,
        meta: (
          <>
            <code>{m.id}</code> · {m.role} · Joined {formatDate(m.joined)}
          </>
        ),
        primary: { label: "Edit user", onClick: () => go(`/admin/users/${m.id}/edit`) },
        secondary: {
          label: "Copy email",
          onClick: () => {
            navigator.clipboard?.writeText(m.email);
            toast.success("Email copied");
          },
        },
        menu:
          m.status === "suspended"
            ? [
                {
                  label: "Reactivate account",
                  onClick: () =>
                    api.confirm({
                      title: `Reactivate ${m.name}?`,
                      description: `${m.name} will be able to sign in again.`,
                      confirmLabel: "Reactivate account",
                      onConfirm: () => {
                        membersService.update(m.id, { status: "active" });
                        toast.success("Account reactivated");
                      },
                    }),
                },
              ]
            : [
                {
                  label: "Suspend account",
                  destructive: true,
                  onClick: () =>
                    api.confirm({
                      title: `Suspend ${m.name}?`,
                      description: `${m.name} will not be able to sign in until you reactivate the account.`,
                      confirmLabel: "Suspend account",
                      onConfirm: () => {
                        membersService.update(m.id, { status: "suspended" });
                        toast.success("Account suspended");
                      },
                    }),
                },
              ],
      })}
      stats={(m) => [
        { label: "Role", value: m.role },
        { label: "Department", value: m.department },
        { label: "Joined", value: formatDate(m.joined, { year: false }) },
        { label: "Last active", value: formatDate(m.lastActive, { year: false }) },
      ]}
      panel={(m) => (
        <div>
          <RecordHeading>Contact</RecordHeading>
          <RecordKv
            items={[
              { label: "Email", value: m.email },
              { label: "Phone", value: m.phone },
              { label: "Department", value: m.department },
              { label: "Joined", value: formatDate(m.joined) },
            ]}
          />
        </div>
      )}
      page={{
        tabs: [
          { id: "overview", label: "Overview" },
          { id: "activity", label: "Activity" },
        ],
        content: (m, tab) =>
          tab === "activity" ? (
            <div>
              <RecordHeading>Recent activity</RecordHeading>
              <RecordRows
                rows={[
                  { title: "Signed in", meta: formatDate(m.lastActive) },
                  { title: "Account created", meta: formatDate(m.joined) },
                ]}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <RecordHeading>Details</RecordHeading>
                <RecordKv
                  items={[
                    { label: "Full name", value: m.name },
                    { label: "Email", value: m.email },
                    { label: "Phone", value: m.phone },
                    { label: "Role", value: m.role },
                    { label: "Department", value: m.department },
                  ]}
                />
              </div>
              {m.note && (
                <div>
                  <RecordHeading>Note</RecordHeading>
                  <p className="m-0 type-body-sm text-text-soft">{m.note}</p>
                </div>
              )}
            </div>
          ),
        rail: (m) => (
          <RecordRailCard title="Account">
            <RecordKv
              single
              items={[
                { label: "User ID", value: m.id },
                { label: "Status", value: <StatusPill kind="account" status={m.status} /> },
                { label: "Joined", value: formatDate(m.joined) },
              ]}
            />
          </RecordRailCard>
        ),
      }}
      form={{
        sections,
        toValues: (m) => ({
          name: m.name,
          email: m.email,
          phone: m.phone,
          role: m.role,
          department: m.department,
          note: m.note,
        }),
        onSave: (values, existing) => {
          const fields = {
            name: values.name!,
            email: values.email!,
            phone: values.phone ?? "",
            role: (values.role ?? "Staff") as MemberRole,
            department: values.department!,
            note: values.note ?? "",
          };
          if (existing) {
            membersService.update(existing.id, fields);
            return { ...existing, ...fields };
          }
          const today = new Date().toISOString().slice(0, 10);
          const created: Member = { id: membersService.nextId(), status: "invited", joined: today, lastActive: today, ...fields };
          membersService.create(created);
          return created;
        },
        createdMessage: "User added",
        savedMessage: "Changes saved",
      }}
    />
  );
}

export default function UsersPage() {
  return (
    <Suspense>
      <UsersView />
    </Suspense>
  );
}
