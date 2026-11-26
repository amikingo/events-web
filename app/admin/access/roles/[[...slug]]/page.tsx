"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { NoOrganization, useOrganizationId } from "@/app/admin/_components/organization-scope";
import { Can, useModuleAccess } from "@/components/ability-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoIcon, PlusIcon, ShieldIcon, UserIcon } from "@/components/ui/icons";
import { Note } from "@/components/ui/note";
import { Pill } from "@/components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { Select } from "@/components/ui/select";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { TextLink } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { listOrganizationRoleTemplates } from "@/lib/api/role-templates";
import { changeRoleStatus, createRole, listGrantableModules, listRoles, updateRole } from "@/lib/api/roles";
import type { Role, RoleCreateInput, RoleGrant, RoleUpdateInput } from "@/lib/api/roles";
import { listStaffAssignments } from "@/lib/api/staff";
import type { StaffAssignment } from "@/lib/api/staff";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatNumber } from "@/lib/format";
import { useOrganization } from "@/lib/organization-context";
import { roleQk, roleTemplateQk, staffQk } from "@/lib/query-keys";
import { RoleForm } from "./role-form";

const BASE = "/admin/access/roles";
const MODULE = MODULE_CODES.ROLES;
const ALL_FILTER = "all";
const ACTIONS = ["view", "create", "update", "delete", "import", "export", "notify"] as const;

const status = (r: Role) => <StatusPill kind="account" status={r.is_active ? "active" : "inactive"} />;
/** The actions a grant allows, in words: "View, create, update". */
const allowed = (g: RoleGrant) =>
  ACTIONS.filter((a) => g[a])
    .map((a) => a[0]!.toUpperCase() + a.slice(1))
    .join(", ");
const activeGrants = (r: Role) => r.grants.filter((g) => ACTIONS.some((a) => g[a]));

function summarizeAccess(r: Role): string {
  const rows = activeGrants(r);
  if (rows.length === 0) return "No access";
  if (r.code === "OWNER") return "Full organization access";
  const names = rows.slice(0, 3).map((g) => g.module_name);
  return rows.length > 3 ? `${names.join(", ")} +${rows.length - 3} more` : names.join(", ");
}

const columns: ColumnDef<Role>[] = [
  {
    key: "name",
    header: "Role",
    primary: true,
    filterValue: (r) => r.name,
    accessor: (r) => (
      <div className="flex items-center gap-3">
        <Avatar initials={r.name.slice(0, 2).toUpperCase()} size={32} />
        <div className="flex min-w-0 flex-col">
          <span className="type-body font-medium text-text">{r.name}</span>
          <span className="type-body-sm text-text-faint">{r.description ?? "No description"}</span>
          {r.role_template && <span className="type-body-sm text-text-faint">Made from {r.role_template.name}</span>}
        </div>
      </div>
    ),
  },
  { key: "code", header: "Code", accessor: (r) => <span className="font-mono">{r.code}</span> },
  { key: "modules", header: "Modules", numeric: true, filterValue: (r) => r.grant_count, accessor: (r) => formatNumber(r.grant_count) },
  { key: "staff", header: "Staff", numeric: true, filterValue: (r) => r.member_count, accessor: (r) => formatNumber(r.member_count) },
  { key: "access", header: "Access", filterValue: summarizeAccess, accessor: summarizeAccess },
  { key: "status", header: "Status", filterValue: (r) => (r.is_active ? "active" : "inactive"), render: status },
];

const staffName = (a: StaffAssignment) =>
  (a.profile ? [a.profile.firstname, a.profile.middlename, a.profile.lastname].filter(Boolean).join(" ") : "") || "Name unavailable";
const staffInitials = (a: StaffAssignment) =>
  staffName(a)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/**
 * Read-only list of the active staff holding this role (the same people `member_count` counts), each linking
 * directly to the assignment.
 */
function RoleMembers({ organizationId, roleId }: { organizationId: string; roleId: string }) {
  const { hasModuleAccess } = useModuleAccess();
  const [page, setPage] = useState(1);
  const canViewStaff = hasModuleAccess(MODULE_CODES.USER_ROLES);
  const params = { page, pageSize: 20, roleId, isActive: true };

  const query = useQuery({
    queryKey: staffQk.list(organizationId, params),
    queryFn: ({ signal }) => listStaffAssignments(organizationId, params, signal),
    enabled: canViewStaff,
  });

  if (!canViewStaff) {
    return (
      <EmptyState
        size="sm"
        icon={<UserIcon />}
        title="Staff assignments hidden"
        description="You need Staff Assignments access to view members of this role."
      />
    );
  }

  if (query.isPending) {
    return (
      <SkeletonStack>
        <Skeleton shape="block" />
        <Skeleton shape="block" />
      </SkeletonStack>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        size="sm"
        tone="danger"
        title="We couldn't load members"
        description={describeApiError(query.error, "person")}
        actions={<Button variant="secondary" onClick={() => void query.refetch()}>Try again</Button>}
      />
    );
  }

  const members = query.data.data;
  if (members.length === 0) {
    return <EmptyState size="sm" icon={<UserIcon />} title="Nobody has this role yet" description="Assign staff from Staff Assignments to see them here." />;
  }

  const totalPages = query.data.totalPages;

  return (
    <div className="flex flex-col gap-3">
      <RecordHeading>Members</RecordHeading>
      <div className="divide-y divide-border overflow-hidden rounded-sm border border-border">
        {members.map((a) => (
          <Link
            key={a.id}
            href={`/admin/access/assignments/${a.id}`}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar initials={staffInitials(a)} size={32} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate type-body font-medium text-text">{staffName(a)}</span>
                <span className="truncate type-body-sm text-text-faint">
                  {a.profile?.mobile ?? "—"} · {a.branch?.name ?? "Whole organization"}
                </span>
              </div>
            </div>
            <StatusPill kind="account" status={a.is_active ? "active" : "inactive"} size="sm" />
          </Link>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="type-body-sm text-text-faint">
            Page {page} of {totalPages}
          </span>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/** Change the address without rebuilding the page. */
function go(path: string) {
  window.history.pushState(null, "", path);
}

/** What the role may do on each module, one row per module. */
function Grants({ role }: { role: Role }) {
  const rows = activeGrants(role);
  return (
    <div>
      <RecordHeading>What this role can do</RecordHeading>
      {rows.length === 0 ? (
        <EmptyState size="sm" icon={<ShieldIcon />} title="No access" description="This role can't do anything yet." />
      ) : (
        <RecordKv items={rows.map((g) => ({ label: g.module_name, value: allowed(g) }))} />
      )}
      {role.code === "OWNER" && (
        <Note icon={<InfoIcon />}>The Owner role always has full access and can&apos;t be changed.</Note>
      )}
    </div>
  );
}

function RolesView({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  const { hasBranches } = useOrganization();
  const location = parseRecordPath(BASE, pathname);

  const [statusTarget, setStatusTarget] = useState<{ role: Role; isActive: boolean } | null>(null);
  const [statusError, setStatusError] = useState<{ message: string; linkToStaff?: boolean } | null>(null);
  const [templateFilter, setTemplateFilter] = useState(ALL_FILTER);

  const query = useQuery({ queryKey: roleQk.list(organizationId), queryFn: ({ signal }) => listRoles(organizationId, signal) });
  const filteredQuery = useQuery({
    queryKey: roleQk.list(organizationId, templateFilter),
    queryFn: ({ signal }) => listRoles(organizationId, signal, { roleTemplateId: templateFilter }),
    enabled: templateFilter !== ALL_FILTER,
  });
  const canCreate = can("create", MODULE);
  const isFormMode = location.mode === "create" || location.mode === "edit";
  const grantable = useQuery({
    queryKey: roleQk.grantableModules(organizationId),
    queryFn: ({ signal }) => listGrantableModules(organizationId, signal),
    enabled: isFormMode,
  });
  const templates = useQuery({
    queryKey: roleTemplateQk.organizationOptions(organizationId),
    queryFn: ({ signal }) => listOrganizationRoleTemplates(organizationId, signal),
    enabled: location.mode === "create" && canCreate,
  });
  const roles = query.data ?? [];
  const tableRoles = templateFilter === ALL_FILTER ? roles : (filteredQuery.data ?? []);
  const templateOptions = Array.from(
    new Map(
      roles
        .filter((r): r is Role & { role_template: NonNullable<Role["role_template"]> } => Boolean(r.role_template))
        .map((r) => [r.role_template.id, r.role_template]),
    ).values(),
  );

  const invalidateRoles = () => {
    void queryClient.invalidateQueries({ queryKey: roleQk.all(organizationId) });
    void queryClient.invalidateQueries({ queryKey: staffQk.all(organizationId) });
    void queryClient.invalidateQueries({ queryKey: roleTemplateQk.all() });
    void queryClient.invalidateQueries({ queryKey: ["user", "effective-access"] });
  };

  const create = useMutation({
    mutationFn: (input: RoleCreateInput) => createRole(organizationId, input),
    onSuccess: invalidateRoles,
  });

  const update = useMutation({
    mutationFn: ({ roleId, changes }: { roleId: string; changes: RoleUpdateInput }) => updateRole(organizationId, roleId, changes),
    onSuccess: invalidateRoles,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ roleId, isActive }: { roleId: string; isActive: boolean }) => changeRoleStatus(organizationId, roleId, isActive),
    onSuccess: (updated) => {
      invalidateRoles();
      setStatusTarget(null);
      setStatusError(null);
      toast.success(updated.is_active ? "Role switched on" : "Role switched off");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "role_in_use") {
        setStatusError({ message: describeApiError(err, "role"), linkToStaff: true });
        return;
      }
      if (err instanceof ApiError && (err.code === "role_locked" || err.code === "permission_denied")) {
        setStatusTarget(null);
        setStatusError(null);
        toast.error(describeApiError(err, "role"));
        return;
      }
      setStatusError({ message: describeApiError(err, "role") });
    },
  });

  if (query.isError) {
    return (
      <EmptyState size="lg" tone="danger" title="We couldn't load the roles" description={describeApiError(query.error, "role")} actions={<Button onClick={() => void query.refetch()}>Try again</Button>} />
    );
  }

  const canUpdate = can("update", MODULE);
  const newRoleButton = (
    <Can I="create" a={MODULE}>
      <Button onClick={() => go(`${BASE}/new`)}>
        <PlusIcon className="size-4" />
        New role
      </Button>
    </Can>
  );

  if (location.mode === "create" || location.mode === "edit") {
    const existing = location.mode === "edit" ? roles.find((r) => r.id === String(location.id)) : undefined;
    if (location.mode === "edit" && !existing) {
      if (query.isPending) return null;
      return (
        <EmptyState
          size="lg"
          title="This role doesn't exist"
          description="It may have been removed. Go back to the list."
          actions={<Button onClick={() => go(BASE)}>Back to roles</Button>}
        />
      );
    }
    if (existing?.code === "OWNER") {
      return (
        <EmptyState
          size="lg"
          icon={<ShieldIcon />}
          title="The Owner role can't be changed"
          description="The Owner role always has full access and can't be changed."
          actions={<Button onClick={() => go(`${BASE}/${existing.id}`)}>Back to role</Button>}
        />
      );
    }
    if (grantable.isPending) {
      return (
        <SkeletonStack>
          <Skeleton shape="block" />
          <Skeleton shape="block" />
        </SkeletonStack>
      );
    }
    if (grantable.isError) {
      return (
        <EmptyState
          size="lg"
          tone="danger"
          title="We couldn't load the module list"
          description={describeApiError(grantable.error, "role")}
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => go(existing ? `${BASE}/${existing.id}` : BASE)}>
                Cancel
              </Button>
              <Button onClick={() => void grantable.refetch()}>Try again</Button>
            </div>
          }
        />
      );
    }
    return (
      <RoleForm
        key={`${existing?.id ?? "new"}:${grantable.data.map((m) => m.module_code).join(",")}`}
        role={existing}
        grantableModules={grantable.data}
        hasBranches={hasBranches}
        templates={!existing ? templates.data : undefined}
        onCancel={() => go(existing ? `${BASE}/${existing.id}` : BASE)}
        onCreate={async (input) => {
          const created = await create.mutateAsync(input);
          toast.success("Role created");
          go(`${BASE}/${created.id}`);
        }}
        onUpdate={async (changes) => {
          const saved = Object.keys(changes).length ? await update.mutateAsync({ roleId: existing!.id, changes }) : existing!;
          toast.success("Changes saved");
          go(`${BASE}/${saved.id}`);
        }}
      />
    );
  }

  return (
    <>
      <RecordWorkspace
        fit
        inlineToasts={false}
        className={location.mode === "list" ? undefined : "h-[calc(100vh-270px)] min-h-[520px]"}
        records={roles}
        getId={(r) => r.id}
        noun="role"
        listLabel="Roles"
        location={location}
        onLocationChange={(next) => go(recordPath(BASE, next))}
        list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
          <Table
            columns={columns}
            data={tableRoles}
            getRowId={(r) => r.id}
            title="Roles"
            loading={query.isPending || (templateFilter !== ALL_FILTER && filteredQuery.isPending)}
            onRowClick={onRowClick}
            activeRowId={activeRowId}
            highlightIds={highlightIds}
            onVisibleRowsChange={onVisibleRowsChange}
            toolbarActions={
              templateOptions.length > 0 ? (
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                  <Select
                    aria-label="Filter by template"
                    value={templateFilter}
                    onValueChange={setTemplateFilter}
                    options={[{ value: ALL_FILTER, label: "All templates" }, ...templateOptions.map((t) => ({ value: t.id, label: t.name }))]}
                    className="w-full sm:w-[190px]"
                  />
                  {newRoleButton}
                </div>
              ) : (
                newRoleButton
              )
            }
            className="rounded-none border-none shadow-none"
          />
        )}
        identity={(r, api) => {
          const isOwner = r.code === "OWNER";
          return {
            avatar: <Avatar initials={r.name.slice(0, 2).toUpperCase()} size={48} />,
            name: r.name,
            status: status(r),
            meta: (
              <span className="inline-flex flex-wrap items-center gap-2">
                <code>{r.code}</code>
                {r.role_template && <Pill size="sm">Made from {r.role_template.name}</Pill>}
              </span>
            ),
            primary: !isOwner && canUpdate ? { label: "Edit role", onClick: () => api.edit(r) } : undefined,
            menu:
              isOwner || !canUpdate
                ? []
                : [
                    r.is_active
                      ? {
                          label: "Switch off",
                          destructive: true,
                          onClick: () => {
                            setStatusError(null);
                            setStatusTarget({ role: r, isActive: false });
                          },
                        }
                      : {
                          label: "Switch on",
                          onClick: () => {
                            setStatusError(null);
                            setStatusTarget({ role: r, isActive: true });
                          },
                        },
                  ],
          };
        }}
        stats={(r) => [
          { label: "Modules", value: String(r.grant_count) },
          { label: "Staff", value: String(r.member_count) },
          { label: "Status", value: r.is_active ? "Active" : "Switched off" },
        ]}
        panel={(r) => <Grants role={r} />}
        page={{
          tabs: [
            { id: "access", label: "Access" },
            { id: "members", label: "Members", count: (r) => r.member_count },
          ],
          content: (r, tab) => (tab === "members" ? <RoleMembers key={r.id} organizationId={organizationId} roleId={r.id} /> : <Grants role={r} />),
          rail: (r) => (
            <RecordRailCard title="Role">
              <RecordKv
                single
                items={[
                  { label: "Code", value: r.code },
                  { label: "Description", value: r.description ?? "None" },
                  { label: "Status", value: status(r) },
                ]}
              />
              {r.code === "OWNER" && <Pill>Read only</Pill>}
            </RecordRailCard>
          ),
        }}
        form={{
          sections: [],
          toValues: () => ({}),
          onSave: (_values, existing) => {
            if (existing) return existing;
            throw new Error("Use the form page.");
          },
        }}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
            setStatusError(null);
          }
        }}
        tone={statusTarget?.isActive ? "accent" : "warning"}
        title={statusTarget ? (statusTarget.isActive ? `Switch on ${statusTarget.role.name}?` : `Switch off ${statusTarget.role.name}?`) : ""}
        description={
          statusTarget?.isActive
            ? "Staff can be given this role again."
            : "Staff can't be given this role while it's off. Staff who hold it must be given another role first."
        }
        confirmLabel={statusTarget?.isActive ? "Switch on" : "Switch off"}
        loading={toggleStatus.isPending}
        loadingLabel={statusTarget?.isActive ? "Switching on" : "Switching off"}
        error={
          statusError ? (
            <span>
              {statusError.message}
              {statusError.linkToStaff && (
                <>
                  {" "}
                  <TextLink
                    type="button"
                    onClick={() => {
                      setStatusTarget(null);
                      setStatusError(null);
                      router.push("/admin/access/assignments");
                    }}
                  >
                    Go to Staff Assignments
                  </TextLink>
                </>
              )}
            </span>
          ) : undefined
        }
        onConfirm={() => {
          if (!statusTarget) return;
          setStatusError(null);
          toggleStatus.mutate({ roleId: statusTarget.role.id, isActive: statusTarget.isActive });
        }}
      />
    </>
  );
}

function RolesScreen() {
  const organizationId = useOrganizationId();
  if (organizationId === undefined) return null;
  if (organizationId === null) return <NoOrganization what="Roles" />;
  return <RolesView organizationId={organizationId} />;
}

export default function RolesPage() {
  return (
    <Suspense>
      <RolesScreen />
    </Suspense>
  );
}
