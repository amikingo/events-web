"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { NoOrganization, useOrganizationId } from "@/app/admin/_components/organization-scope";
import { Can, useModuleAccess } from "@/components/ability-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoIcon, PlusIcon, ShieldIcon } from "@/components/ui/icons";
import { Note } from "@/components/ui/note";
import { Pill } from "@/components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { TextLink } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { changeRoleStatus, createRole, listRoles, updateRole } from "@/lib/api/roles";
import type { Role, RoleCreateInput, RoleGrant, RoleUpdateInput } from "@/lib/api/roles";
import { MODULE_CODES } from "@/lib/constants/modules";
import { useOrganization } from "@/lib/organization-context";
import { roleQk, staffQk } from "@/lib/query-keys";
import { RoleForm } from "./role-form";

const BASE = "/admin/access/roles";
const MODULE = MODULE_CODES.ROLES;
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
        </div>
      </div>
    ),
  },
  { key: "code", header: "Code", accessor: (r) => <span className="font-mono">{r.code}</span> },
  { key: "access", header: "Access", filterValue: summarizeAccess, accessor: summarizeAccess },
  { key: "status", header: "Status", filterValue: (r) => (r.is_active ? "active" : "inactive"), render: status },
];

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

  const query = useQuery({ queryKey: roleQk.list(organizationId), queryFn: ({ signal }) => listRoles(organizationId, signal) });
  const roles = query.data ?? [];
  const ownerRole = roles.find((r) => r.code === "OWNER");

  const invalidateRoles = () => {
    void queryClient.invalidateQueries({ queryKey: roleQk.all(organizationId) });
    void queryClient.invalidateQueries({ queryKey: staffQk.all(organizationId) });
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
    return (
      <RoleForm
        key={existing?.id ?? "new"}
        role={existing}
        ownerRole={ownerRole}
        hasBranches={hasBranches}
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
            data={roles}
            getRowId={(r) => r.id}
            title="Roles"
            loading={query.isPending}
            onRowClick={onRowClick}
            activeRowId={activeRowId}
            highlightIds={highlightIds}
            onVisibleRowsChange={onVisibleRowsChange}
            toolbarActions={newRoleButton}
            className="rounded-none border-none shadow-none"
          />
        )}
        identity={(r, api) => {
          const isOwner = r.code === "OWNER";
          return {
            avatar: <Avatar initials={r.name.slice(0, 2).toUpperCase()} size={48} />,
            name: r.name,
            status: status(r),
            meta: <code>{r.code}</code>,
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
          { label: "Modules", value: String(activeGrants(r).length) },
          { label: "Status", value: r.is_active ? "Active" : "Switched off" },
        ]}
        panel={(r) => <Grants role={r} />}
        page={{
          tabs: [{ id: "access", label: "Access" }],
          content: (r) => <Grants role={r} />,
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
