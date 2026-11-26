"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
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
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { TextLink } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { listModules } from "@/lib/api/modules";
import {
  changePlatformRoleStatus,
  createPlatformRole,
  listPlatformRoles,
  listPlatformStaff,
  platformGrantableModulesFromTree,
  updatePlatformRole,
} from "@/lib/api/platform";
import type { PlatformRoleCreateInput } from "@/lib/api/platform";
import type { Role, RoleGrant, RoleUpdateInput } from "@/lib/api/roles";
import type { StaffAssignment } from "@/lib/api/staff";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatNumber } from "@/lib/format";
import { moduleQk, platformRoleQk, platformStaffQk } from "@/lib/query-keys";
import { PlatformRoleForm } from "./platform-role-form";

const BASE = "/admin/platform/roles";
const MODULE = MODULE_CODES.ROLES;
const ACTIONS = ["view", "create", "update", "delete", "import", "export", "notify"] as const;

const statusPill = (r: Role) => <StatusPill kind="account" status={r.is_active ? "active" : "inactive"} />;
const allowed = (g: RoleGrant) =>
  ACTIONS.filter((a) => g[a])
    .map((a) => a[0]!.toUpperCase() + a.slice(1))
    .join(", ");
const activeGrants = (r: Role) => r.grants.filter((g) => ACTIONS.some((a) => g[a]));

function summarizeAccess(r: Role): string {
  const rows = activeGrants(r);
  if (r.code === "SUPER_ADMIN") return "Full platform access";
  if (rows.length === 0) return "No access";
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
        </div>
      </div>
    ),
  },
  { key: "code", header: "Code", accessor: (r) => <span className="font-mono">{r.code}</span> },
  { key: "modules", header: "Modules", numeric: true, filterValue: (r) => r.grant_count, accessor: (r) => formatNumber(r.grant_count) },
  { key: "staff", header: "Staff", numeric: true, filterValue: (r) => r.member_count, accessor: (r) => formatNumber(r.member_count) },
  { key: "access", header: "Access", filterValue: summarizeAccess, accessor: summarizeAccess },
  { key: "status", header: "Status", filterValue: (r) => (r.is_active ? "active" : "inactive"), render: statusPill },
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

function go(path: string) {
  window.history.pushState(null, "", path);
}

function PlatformRoleMembers({ roleId }: { roleId: string }) {
  const { hasModuleAccess } = useModuleAccess();
  const [page, setPage] = useState(1);
  const canViewStaff = hasModuleAccess(MODULE_CODES.USER_ROLES);
  const params = { page, pageSize: 20, roleId, isActive: true };

  const query = useQuery({
    queryKey: platformStaffQk.list(params),
    queryFn: ({ signal }) => listPlatformStaff(params, signal),
    enabled: canViewStaff,
  });

  if (!canViewStaff) {
    return (
      <EmptyState
        size="sm"
        icon={<UserIcon />}
        title="Platform staff hidden"
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
        description={describeApiError(query.error, "platform person")}
        actions={<Button variant="secondary" onClick={() => void query.refetch()}>Try again</Button>}
      />
    );
  }

  const members = query.data.data;
  if (members.length === 0) {
    return <EmptyState size="sm" icon={<UserIcon />} title="Nobody has this role yet" description="Assign staff from Platform staff to see them here." />;
  }

  const totalPages = query.data.totalPages;

  return (
    <div className="flex flex-col gap-3">
      <RecordHeading>Members</RecordHeading>
      <div className="divide-y divide-border overflow-hidden rounded-sm border border-border">
        {members.map((a) => (
          <Link
            key={a.id}
            href={`/admin/platform/staff/${a.id}`}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar initials={staffInitials(a)} size={32} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate type-body font-medium text-text">{staffName(a)}</span>
                <span className="truncate type-body-sm text-text-faint">{a.profile?.mobile ?? "—"} · Platform</span>
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

function PlatformGrants({ role }: { role: Role }) {
  const rows = activeGrants(role);
  return (
    <div className="flex flex-col gap-4">
      <Note icon={<InfoIcon />}>A platform role&apos;s access to organization modules applies in every organization.</Note>
      {role.code === "SUPER_ADMIN" && (
        <Note icon={<InfoIcon />}>The Super Admin role always has full access and can&apos;t be changed.</Note>
      )}
      <div>
        <RecordHeading>What this role can do</RecordHeading>
        {role.code === "SUPER_ADMIN" ? (
          <p className="m-0 type-body-sm text-text-soft">Full access to every active platform and organization module.</p>
        ) : rows.length === 0 ? (
          <EmptyState size="sm" icon={<ShieldIcon />} title="No access" description="This role can't do anything yet." />
        ) : (
          <RecordKv items={rows.map((g) => ({ label: g.module_name, value: allowed(g) }))} />
        )}
      </div>
    </div>
  );
}

function PlatformRolesView() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  const location = parseRecordPath(BASE, pathname);

  const [statusTarget, setStatusTarget] = useState<{ role: Role; isActive: boolean } | null>(null);
  const [statusError, setStatusError] = useState<{ message: string; linkToStaff?: boolean } | null>(null);

  const query = useQuery({ queryKey: platformRoleQk.list(), queryFn: ({ signal }) => listPlatformRoles(signal) });
  const isFormMode = location.mode === "create" || location.mode === "edit";
  const modulesQuery = useQuery({
    queryKey: moduleQk.tree(),
    queryFn: ({ signal }) => listModules(signal),
    enabled: isFormMode,
  });

  const roles = query.data ?? [];
  const grantableModules = platformGrantableModulesFromTree(modulesQuery.data ?? []);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: platformRoleQk.all() });
    void queryClient.invalidateQueries({ queryKey: platformStaffQk.all() });
    void queryClient.invalidateQueries({ queryKey: ["user", "effective-access"] });
  };

  const create = useMutation({
    mutationFn: (input: PlatformRoleCreateInput) => createPlatformRole(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ roleId, changes }: { roleId: string; changes: RoleUpdateInput }) => updatePlatformRole(roleId, changes),
    onSuccess: invalidate,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ roleId, isActive }: { roleId: string; isActive: boolean }) => changePlatformRoleStatus(roleId, isActive),
    onSuccess: (updated) => {
      invalidate();
      setStatusTarget(null);
      setStatusError(null);
      toast.success(updated.is_active ? "Platform role switched on" : "Platform role switched off");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "role_in_use") {
        setStatusError({ message: describeApiError(err, "platform role"), linkToStaff: true });
        return;
      }
      if (err instanceof ApiError && (err.code === "role_locked" || err.code === "permission_denied")) {
        setStatusTarget(null);
        setStatusError(null);
        toast.error(describeApiError(err, "platform role"));
        return;
      }
      setStatusError({ message: describeApiError(err, "platform role") });
    },
  });

  if (query.isError) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load platform roles"
        description={describeApiError(query.error, "platform role")}
        actions={<Button onClick={() => void query.refetch()}>Try again</Button>}
      />
    );
  }

  const canUpdate = can("update", MODULE);
  const newRoleButton = (
    <Can I="create" a={MODULE}>
      <Button onClick={() => go(`${BASE}/new`)}>
        <PlusIcon className="size-4" />
        New platform role
      </Button>
    </Can>
  );

  if (isFormMode) {
    const existing = location.mode === "edit" ? roles.find((r) => r.id === String(location.id)) : undefined;
    if (location.mode === "edit" && !existing) {
      if (query.isPending) return null;
      return (
        <EmptyState
          size="lg"
          title="This platform role doesn't exist"
          description="It may have been removed. Go back to the list."
          actions={<Button onClick={() => go(BASE)}>Back to platform roles</Button>}
        />
      );
    }
    if (existing?.code === "SUPER_ADMIN") {
      return (
        <EmptyState
          size="lg"
          icon={<ShieldIcon />}
          title="The Super Admin role can't be changed"
          description="The Super Admin role always has full access and can't be changed."
          actions={<Button onClick={() => go(`${BASE}/${existing.id}`)}>Back to role</Button>}
        />
      );
    }
    if (modulesQuery.isPending) {
      return (
        <SkeletonStack>
          <Skeleton shape="block" />
          <Skeleton shape="block" />
        </SkeletonStack>
      );
    }
    if (modulesQuery.isError) {
      return (
        <EmptyState
          size="lg"
          tone="danger"
          title="We couldn't load the module list"
          description={describeApiError(modulesQuery.error, "platform role")}
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => go(existing ? `${BASE}/${existing.id}` : BASE)}>
                Cancel
              </Button>
              <Button onClick={() => void modulesQuery.refetch()}>Try again</Button>
            </div>
          }
        />
      );
    }

    return (
      <PlatformRoleForm
        key={`${existing?.id ?? "new"}:${grantableModules.map((m) => m.module_code).join(",")}`}
        role={existing}
        grantableModules={grantableModules}
        onCancel={() => go(existing ? `${BASE}/${existing.id}` : BASE)}
        onCreate={async (input) => {
          const created = await create.mutateAsync(input);
          toast.success("Platform role created");
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
        noun="platform role"
        listLabel="Platform roles"
        location={location}
        onLocationChange={(next) => go(recordPath(BASE, next))}
        list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
          <Table
            columns={columns}
            data={roles}
            getRowId={(r) => r.id}
            title="Platform roles"
            loading={query.isPending}
            onRowClick={onRowClick}
            activeRowId={activeRowId}
            highlightIds={highlightIds}
            onVisibleRowsChange={onVisibleRowsChange}
            toolbarActions={newRoleButton}
            emptyState={
              <EmptyState
                icon={<ShieldIcon />}
                title="No platform roles yet"
                description="Create a role for platform support or administration staff."
                actions={newRoleButton}
              />
            }
            className="rounded-none border-none shadow-none"
          />
        )}
        identity={(r, api) => {
          const isSuperAdmin = r.code === "SUPER_ADMIN";
          return {
            avatar: <Avatar initials={r.name.slice(0, 2).toUpperCase()} size={48} />,
            name: r.name,
            status: statusPill(r),
            meta: (
              <span className="inline-flex flex-wrap items-center gap-2">
                <code>{r.code}</code>
              </span>
            ),
            primary: !isSuperAdmin && canUpdate ? { label: "Edit role", onClick: () => api.edit(r) } : undefined,
            menu:
              isSuperAdmin || !canUpdate
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
        panel={(r) => <PlatformGrants role={r} />}
        page={{
          tabs: [
            { id: "access", label: "Access" },
            { id: "members", label: "Members", count: (r) => r.member_count },
          ],
          content: (r, tab) => (tab === "members" ? <PlatformRoleMembers key={r.id} roleId={r.id} /> : <PlatformGrants role={r} />),
          rail: (r) => (
            <RecordRailCard title="Platform role">
              <RecordKv
                single
                items={[
                  { label: "Code", value: r.code },
                  { label: "Description", value: r.description ?? "None" },
                  { label: "Status", value: statusPill(r) },
                ]}
              />
              {r.code === "SUPER_ADMIN" && <Pill>Read only</Pill>}
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
            ? "Platform staff can be given this role again."
            : "Platform staff can't be given this role while it's off. Staff who hold it must be given another role first."
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
                      router.push("/admin/platform/staff");
                    }}
                  >
                    Go to Platform staff
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

export default function PlatformRolesPage() {
  return (
    <Suspense>
      <PlatformRolesView />
    </Suspense>
  );
}
