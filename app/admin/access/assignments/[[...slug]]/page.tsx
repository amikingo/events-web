"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { NoOrganization, useOrganizationId } from "@/app/admin/_components/organization-scope";
import { Can, useModuleAccess } from "@/components/ability-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusIcon, UserIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { listAllBranches } from "@/lib/api/branches";
import { describeApiError } from "@/lib/api/errors";
import { listRoles } from "@/lib/api/roles";
import { changeStaffAssignment, listStaffAssignments, setStaffActive } from "@/lib/api/staff";
import type { StaffAssignment } from "@/lib/api/staff";
import { MODULE_CODES } from "@/lib/constants/modules";
import { useOrganization } from "@/lib/organization-context";
import { branchQk, roleQk, staffQk } from "@/lib/query-keys";
import { AddStaffForm } from "./add-staff-form";
import { ChangeRoleForm } from "./change-role-form";

const BASE = "/admin/access/assignments";
const MODULE = MODULE_CODES.USER_ROLES;

const nameOf = (a: StaffAssignment) => (a.profile ? [a.profile.firstname, a.profile.middlename, a.profile.lastname].filter(Boolean).join(" ") : "") || "Name unavailable";
const initialsOf = (a: StaffAssignment) => nameOf(a).split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
const where = (a: StaffAssignment) => a.branch?.name ?? "Whole organization";
const status = (a: StaffAssignment) => <StatusPill kind="account" status={a.is_active ? "active" : "inactive"} />;

const columns: ColumnDef<StaffAssignment>[] = [
  {
    key: "name",
    header: "Person",
    primary: true,
    filterValue: (r) => nameOf(r),
    accessor: (r) => (
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(r)} size={32} />
        <div className="flex min-w-0 flex-col">
          <span className="type-body font-medium text-text">{nameOf(r)}</span>
          <span className="type-body-sm text-text-faint">{r.profile?.mobile ?? "—"}</span>
        </div>
      </div>
    ),
  },
  { key: "role", header: "Role", filterValue: (r) => r.role.name, render: (r) => <Pill>{r.role.name}</Pill> },
  { key: "where", header: "Where", accessor: where },
  { key: "status", header: "Status", filterValue: (r) => (r.is_active ? "active" : "inactive"), render: status },
];

/** Change address without rebuilding the page. */
function go(path: string) {
  window.history.pushState(null, "", path);
}

function StaffView({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  const { hasBranches } = useOrganization();
  const location = parseRecordPath(BASE, pathname);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const params = { page, pageSize };

  const list = useQuery({ queryKey: staffQk.list(organizationId, params), queryFn: ({ signal }) => listStaffAssignments(organizationId, params, signal), placeholderData: keepPreviousData });
  const roles = useQuery({ queryKey: roleQk.list(organizationId), queryFn: ({ signal }) => listRoles(organizationId, signal) });
  const branches = useQuery({ queryKey: branchQk.everyone(organizationId), queryFn: ({ signal }) => listAllBranches(organizationId, signal), enabled: hasBranches });
  const rows = list.data?.data ?? [];

  const saved = () => void queryClient.invalidateQueries({ queryKey: staffQk.all(organizationId) });
  const change = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: { role_id?: string; branch_id?: string | null } }) => changeStaffAssignment(organizationId, id, changes),
    onSuccess: saved,
  });
  const toggle = useMutation({
    mutationFn: ({ assignment, isActive }: { assignment: StaffAssignment; isActive: boolean }) => setStaffActive(organizationId, assignment.id, isActive),
    onSuccess: (a) => {
      saved();
      toast.success(a.is_active ? "Access switched on" : "Access switched off", { body: "It applies on their next request." });
    },
    onError: (error) => toast.error("Couldn't change their access", { body: describeApiError(error, "person") }),
  });

  if (list.isError && !list.data) {
    return <EmptyState size="lg" tone="danger" title="We couldn't load the staff" description={describeApiError(list.error, "person")} actions={<Button onClick={() => void list.refetch()}>Try again</Button>} />;
  }

  // The only active Owner can't be switched off or moved: the API refuses (`last_owner_assignment`), so don't offer it.
  // Known only when everyone fits on one page; otherwise the API's answer is the backstop.
  const onePage = (list.data?.totalPages ?? 1) === 1;
  const activeOwners = rows.filter((r) => r.role.code === "OWNER" && r.is_active);
  const isLastOwner = (a: StaffAssignment) => onePage && a.role.code === "OWNER" && a.is_active && activeOwners.length === 1;

  const canUpdate = can("update", MODULE);
  const addStaff = (label: string, icon = false) => (
    <Can I="create" a={MODULE}>
      <Button onClick={() => go(`${BASE}/new`)}>
        {icon && <PlusIcon className="size-4" />}
        {label}
      </Button>
    </Can>
  );

  if (location.mode === "create") {
    return <AddStaffForm organizationId={organizationId} hasBranches={hasBranches} onDone={(id) => go(id ? `${BASE}/${id}` : BASE)} />;
  }


  // Changing a role is its own full page.
  if (location.mode === "edit") {
    const existing = rows.find((a) => a.id === String(location.id));
    if (!existing) {
      if (list.isPending) return null;
      return <EmptyState size="lg" title="This person isn't in the list" description="They may be on another page, or the assignment was removed. Go back to the list." actions={<Button onClick={() => go(BASE)}>Back to staff</Button>} />;
    }
    return (
      <ChangeRoleForm
        key={existing.id}
        assignment={existing}
        personName={nameOf(existing)}
        roles={roles.data ?? []}
        branches={hasBranches ? (branches.data ?? []) : undefined}
        onCancel={() => go(`${BASE}/${existing.id}`)}
        onSubmit={async (changes) => {
          try {
            if (Object.keys(changes).length) await change.mutateAsync({ id: existing.id, changes });
            toast.success("Role changed", { body: "It applies on their next request." });
            go(`${BASE}/${existing.id}`);
          } catch (e) {
            throw new Error(describeApiError(e, "person"));
          }
        }}
      />
    );
  }

  return (
    <RecordWorkspace
      fit
      inlineToasts={false}
      className={location.mode === "list" ? undefined : "h-[calc(100vh-270px)] min-h-[520px]"}
      records={rows}
      getId={(a) => a.id}
      noun="person"
      listLabel="Staff"
      location={location}
      onLocationChange={(next) => go(recordPath(BASE, next))}
      list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
        <Table
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          title="Staff assignments"
          loading={list.isPending}
          page={page}
          onPageChange={setPage}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          totalRows={list.data?.totalItems ?? 0}
          searchable={false}
          filters={false}
          onRowClick={onRowClick}
          activeRowId={activeRowId}
          highlightIds={highlightIds}
          onVisibleRowsChange={onVisibleRowsChange}
          emptyState={<EmptyState icon={<UserIcon />} title="No staff yet" description="Give someone who has a Cheche account a role here." actions={addStaff("Add staff")} />}
          toolbarActions={addStaff("Add staff", true)}
          className="rounded-none border-none shadow-none"
        />
      )}
      identity={(a, api) => ({
        avatar: <Avatar initials={initialsOf(a)} size={48} />,
        name: nameOf(a),
        status: status(a),
        meta: (
          <>
            {a.role.name} · {where(a)}
          </>
        ),
        primary: canUpdate && !isLastOwner(a) ? { label: "Change role", onClick: () => api.edit(a) } : undefined,
        menu:
          !canUpdate || isLastOwner(a)
            ? []
            : [
                a.is_active
                  ? {
                      label: "Switch off access",
                      destructive: true,
                      onClick: () =>
                        api.confirm({
                          title: `Switch off ${nameOf(a)}'s access?`,
                          description: "They can't sign in to this organization until you switch it back on. It applies on their next request.",
                          confirmLabel: "Switch off access",
                          onConfirm: () => toggle.mutate({ assignment: a, isActive: false }),
                        }),
                    }
                  : {
                      label: "Switch on access",
                      onClick: () =>
                        api.confirm({
                          title: `Switch on ${nameOf(a)}'s access?`,
                          description: "They get their role back on their next request.",
                          confirmLabel: "Switch on access",
                          onConfirm: () => toggle.mutate({ assignment: a, isActive: true }),
                        }),
                    },
              ],
      })}
      stats={(a) => [
        { label: "Role", value: a.role.name },
        { label: "Where", value: where(a) },
        { label: "Status", value: a.is_active ? "Active" : "Inactive" },
      ]}
      panel={(a) => (
        <div>
          <RecordHeading>Details</RecordHeading>
          <RecordKv items={[{ label: "Mobile", value: a.profile?.mobile ?? "—" }, { label: "Role", value: a.role.name }, { label: "Where", value: where(a) }]} />
          {isLastOwner(a) && <p className="type-body-sm m-0 mt-3 text-text-faint">The only active Owner. Give the role to someone else before changing this.</p>}
        </div>
      )}
      page={{
        tabs: [{ id: "overview", label: "Overview" }],
        content: (a) => (
          <div>
            <RecordHeading>Details</RecordHeading>
            <RecordKv items={[{ label: "Name", value: nameOf(a) }, { label: "Mobile", value: a.profile?.mobile ?? "—" }, { label: "Role", value: a.role.name }, { label: "Where", value: where(a) }]} />
          </div>
        ),
        rail: (a) => (
          <RecordRailCard title="Assignment">
            <RecordKv single items={[{ label: "Status", value: status(a) }, { label: "Role code", value: a.role.code }]} />
          </RecordRailCard>
        ),
      }}
      form={{
        // Not used: create and edit are their own full pages (see the form above). The workspace still needs a form prop.
        sections: [],
        toValues: () => ({}),
        onSave: (_values, existing) => {
          if (existing) return existing;
          throw new Error("Use the form page.");
        },
      }}
    />
  );
}

function StaffScreen() {
  const organizationId = useOrganizationId();
  if (organizationId === undefined) return null;
  if (organizationId === null) return <NoOrganization what="Staff" />;
  return <StaffView organizationId={organizationId} />;
}

export default function StaffAssignmentsPage() {
  return (
    <Suspense>
      <StaffScreen />
    </Suspense>
  );
}
