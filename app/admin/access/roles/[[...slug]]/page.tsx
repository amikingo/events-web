"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { NoOrganization, useOrganizationId } from "@/app/admin/_components/organization-scope";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { describeApiError } from "@/lib/api/errors";
import { listRoles } from "@/lib/api/roles";
import type { Role, RoleGrant } from "@/lib/api/roles";
import { roleQk } from "@/lib/query-keys";

const BASE = "/admin/access/roles";
const ACTIONS = ["view", "create", "update", "delete", "import", "export", "notify"] as const;

const status = (r: Role) => <StatusPill kind="account" status={r.is_active ? "active" : "inactive"} />;
/** The actions a grant allows, in words: "View, create, update". */
const allowed = (g: RoleGrant) =>
  ACTIONS.filter((a) => g[a])
    .map((a) => a[0]!.toUpperCase() + a.slice(1))
    .join(", ");
const modulesWithAccess = (r: Role) => r.grants.filter((g) => g.view || ACTIONS.some((a) => g[a])).length;

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
  { key: "modules", header: "Modules", numeric: true, accessor: (r) => modulesWithAccess(r) },
  { key: "status", header: "Status", filterValue: (r) => (r.is_active ? "active" : "inactive"), render: status },
];

/** What the role may do on each module, one row per module. */
function Grants({ role }: { role: Role }) {
  const rows = role.grants.filter((g) => ACTIONS.some((a) => g[a]));
  if (rows.length === 0) return <EmptyState size="sm" icon={<ShieldIcon />} title="No access" description="This role can't do anything yet." />;
  return (
    <div>
      <RecordHeading>What this role can do</RecordHeading>
      <RecordKv items={rows.map((g) => ({ label: g.module_name, value: allowed(g) }))} />
    </div>
  );
}

function RolesView({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const location = parseRecordPath(BASE, pathname);
  const query = useQuery({ queryKey: roleQk.list(organizationId), queryFn: ({ signal }) => listRoles(organizationId, signal) });
  const roles = query.data ?? [];

  if (query.isError) {
    return (
      <EmptyState size="lg" tone="danger" title="We couldn't load the roles" description={describeApiError(query.error, "role")} actions={<Button onClick={() => void query.refetch()}>Try again</Button>} />
    );
  }

  return (
    <RecordWorkspace
      fit
      inlineToasts={false}
      className={location.mode === "list" ? undefined : "h-[calc(100vh-270px)] min-h-[520px]"}
      records={roles}
      getId={(r) => r.id}
      noun="role"
      listLabel="Roles"
      location={location}
      onLocationChange={(next) => window.history.pushState(null, "", recordPath(BASE, next))}
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
          emptyState={<EmptyState icon={<ShieldIcon />} title="No roles yet" description="Roles are set up with the organization." />}
          className="rounded-none border-none shadow-none"
        />
      )}
      // Read only: the API has no way to create or change a role yet, so there is no Edit or New here.
      identity={(r) => ({
        avatar: <Avatar initials={r.name.slice(0, 2).toUpperCase()} size={48} />,
        name: r.name,
        status: status(r),
        meta: <code>{r.code}</code>,
      })}
      stats={(r) => [
        { label: "Modules", value: String(modulesWithAccess(r)) },
        { label: "Status", value: r.is_active ? "Active" : "Inactive" },
      ]}
      panel={(r) => <Grants role={r} />}
      page={{
        tabs: [{ id: "access", label: "Access" }],
        content: (r) => <Grants role={r} />,
        rail: (r) => (
          <RecordRailCard title="Role">
            <RecordKv single items={[{ label: "Code", value: r.code }, { label: "Description", value: r.description ?? "None" }, { label: "Status", value: status(r) }]} />
            <Pill>Read only</Pill>
          </RecordRailCard>
        ),
      }}
      form={{
        // Not used: roles can't be created or edited yet.
        sections: [],
        toValues: () => ({}),
        onSave: (_values, existing) => {
          if (existing) return existing;
          throw new Error("Roles can't be created yet.");
        },
      }}
    />
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
