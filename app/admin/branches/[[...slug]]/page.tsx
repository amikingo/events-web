"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";
import { staffSession } from "@/app/auth/staff/staff-store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingIcon, PlusIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import type { Branch } from "@/lib/api/branches";
import { describeApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { useStorageStore } from "@/lib/marketplace/storage-store";
import { branchesService } from "@/lib/services/branches-service";
import { usePermissions } from "@/lib/services/permissions-service";

const BASE = "/admin/branches";

const columns: ColumnDef<Branch>[] = [
  {
    key: "name",
    header: "Branch",
    primary: true,
    sortable: true,
    filterValue: (r) => r.name,
    accessor: (r) => (
      <div className="flex items-center gap-3">
        <Avatar initials={r.code.slice(0, 2).toUpperCase()} size={32} />
        <div className="flex min-w-0 flex-col">
          <span className="type-body font-medium text-text">{r.name}</span>
          <span className="type-body-sm text-text-faint">{r.description ?? "No description"}</span>
        </div>
      </div>
    ),
  },
  { key: "code", header: "Code", sortable: true, filterValue: (r) => r.code, accessor: (r) => <span className="font-mono">{r.code}</span> },
  { key: "default", header: "Type", filterValue: (r) => (r.is_default ? "Default" : "Branch"), render: (r) => (r.is_default ? <Pill>Default</Pill> : null) },
  { key: "status", header: "Status", filterValue: (r) => (r.is_active ? "active" : "inactive"), render: (r) => <StatusPill kind="account" status={r.is_active ? "active" : "inactive"} /> },
  { key: "created", header: "Created", sortable: true, filterValue: (r) => r.created_at, accessor: (r) => formatDate(r.created_at) },
];

const sections = [
  {
    id: "details",
    title: "Branch details",
    hint: "The place or office these events run from.",
    fields: [
      { name: "name", label: "Name", required: true, requiredMessage: "Enter the branch name.", full: true, placeholder: "Addis Office" },
      {
        name: "code",
        label: "Code",
        required: true,
        requiredMessage: "Enter a short code.",
        hint: "Letters, numbers and underscores. Saved in capitals.",
        placeholder: "ADDIS",
        validate: (value: string) => (/^[A-Za-z0-9_]+$/.test(value.trim()) ? undefined : "Use letters, numbers and underscores only."),
      },
      { name: "description", label: "Description", type: "textarea" as const, full: true, hint: "Optional." },
    ],
  },
];

/** Change the address without rebuilding the page (so a record page loads once). */
function go(path: string) {
  window.history.pushState(null, "", path);
}

function useBranches() {
  return useSyncExternalStore(branchesService.subscribe, branchesService.getSnapshot, branchesService.getSnapshot);
}

function BranchesView() {
  const pathname = usePathname();
  const { branches, status, error } = useBranches();
  const user = useStorageStore(staffSession);
  const { can } = usePermissions();
  const organizationId = user?.organizationId || null;
  const location = parseRecordPath(BASE, pathname);

  useEffect(() => {
    if (organizationId) void branchesService.load(organizationId);
  }, [organizationId]);

  // Branches belong to an organization. Platform roles are not tied to one, so there is nothing to list yet.
  if (user !== undefined && !organizationId) {
    return (
      <EmptyState
        size="lg"
        icon={<BuildingIcon />}
        title="Pick an organization first"
        description="Your role isn't tied to one. Open an organization to see its branches."
      />
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load the branches"
        description={describeApiError(error, "branch")}
        actions={<Button onClick={() => organizationId && void branchesService.load(organizationId, { force: true })}>Try again</Button>}
      />
    );
  }

  const canCreate = can("BRANCHES", "create");
  const canUpdate = can("BRANCHES", "update");
  const loading = status === "idle" || status === "loading";

  async function changeStatus(branch: Branch, isActive: boolean) {
    try {
      await branchesService.setActive(branch.organization_id, branch.id, isActive);
      toast.success(isActive ? "Branch switched on" : "Branch switched off");
    } catch (e) {
      toast.error("Couldn't change the branch", { body: describeApiError(e, "branch") });
    }
  }

  return (
    <RecordWorkspace
      fit
      inlineToasts={false}
      className="h-[calc(100vh-270px)] min-h-[520px]"
      records={branches}
      getId={(b) => b.id}
      noun="branch"
      listLabel="Branches"
      location={location}
      // pushState (not router.push) changes the address without rebuilding the page, so the record page loads once.
      onLocationChange={(next) => go(recordPath(BASE, next))}
      list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
        <Table
          columns={columns}
          data={branches}
          getRowId={(r) => r.id}
          title="Branches"
          loading={loading}
          onRowClick={onRowClick}
          activeRowId={activeRowId}
          highlightIds={highlightIds}
          onVisibleRowsChange={onVisibleRowsChange}
          emptyState={
            <EmptyState
              icon={<BuildingIcon />}
              title="No branches yet"
              description="Add a branch for each office or venue you run events from."
              actions={canCreate ? <Button onClick={() => go(`${BASE}/new`)}>New branch</Button> : undefined}
            />
          }
          toolbarActions={
            canCreate ? (
              <Button onClick={() => go(`${BASE}/new`)}>
                <PlusIcon className="size-4" />
                New branch
              </Button>
            ) : undefined
          }
          className="rounded-none border-none shadow-none"
        />
      )}
      identity={(b, api) => ({
        avatar: <Avatar initials={b.code.slice(0, 2).toUpperCase()} size={48} />,
        name: b.name,
        status: <StatusPill kind="account" status={b.is_active ? "active" : "inactive"} />,
        meta: (
          <>
            <code>{b.code}</code>
            {b.is_default ? " · Default branch" : ""} · Created {formatDate(b.created_at)}
          </>
        ),
        primary: canUpdate ? { label: "Edit branch", onClick: () => api.edit(b) } : undefined,
        menu: !canUpdate
          ? []
          : b.is_active
            ? b.is_default
              ? []
              : [
                  {
                    label: "Switch off branch",
                    destructive: true,
                    onClick: () =>
                      api.confirm({
                        title: `Switch off ${b.name}?`,
                        description: "People can't use this branch until you switch it back on.",
                        confirmLabel: "Switch off branch",
                        onConfirm: () => void changeStatus(b, false),
                      }),
                  },
                ]
            : [
                {
                  label: "Switch on branch",
                  onClick: () =>
                    api.confirm({
                      title: `Switch on ${b.name}?`,
                      description: "People will be able to use this branch again.",
                      confirmLabel: "Switch on branch",
                      onConfirm: () => void changeStatus(b, true),
                    }),
                },
              ],
      })}
      stats={(b) => [
        { label: "Code", value: b.code },
        { label: "Type", value: b.is_default ? "Default" : "Branch" },
        { label: "Status", value: b.is_active ? "Active" : "Inactive" },
        { label: "Created", value: formatDate(b.created_at, { year: false }) },
      ]}
      panel={(b) => (
        <div>
          <RecordHeading>Details</RecordHeading>
          <RecordKv
            items={[
              { label: "Name", value: b.name },
              { label: "Code", value: b.code },
              { label: "Description", value: b.description ?? "None" },
              { label: "Created", value: formatDate(b.created_at) },
            ]}
          />
        </div>
      )}
      page={{
        tabs: [{ id: "overview", label: "Overview" }],
        content: (b) => (
          <div>
            <RecordHeading>Details</RecordHeading>
            <RecordKv
              items={[
                { label: "Name", value: b.name },
                { label: "Code", value: b.code },
                { label: "Description", value: b.description ?? "None" },
                { label: "Last changed", value: formatDate(b.updated_at) },
              ]}
            />
          </div>
        ),
        rail: (b) => (
          <RecordRailCard title="Branch">
            <RecordKv
              single
              items={[
                { label: "Branch ID", value: b.id },
                { label: "Status", value: <StatusPill kind="account" status={b.is_active ? "active" : "inactive"} /> },
                { label: "Created", value: formatDate(b.created_at) },
              ]}
            />
          </RecordRailCard>
        ),
      }}
      form={{
        sections,
        toValues: (b) => ({ name: b.name, code: b.code, description: b.description ?? "" }),
        onSave: async (values, existing) => {
          const input = { name: values.name!.trim(), code: values.code!.trim(), description: values.description?.trim() || null };
          try {
            if (!existing) return await branchesService.create(organizationId!, input);
            // Send only what changed, so an edit never overwrites a field someone else just changed.
            const changes: Partial<typeof input> = {};
            if (input.name !== existing.name) changes.name = input.name;
            if (input.code.toUpperCase() !== existing.code) changes.code = input.code;
            if (input.description !== existing.description) changes.description = input.description;
            return Object.keys(changes).length ? await branchesService.update(organizationId!, existing.id, changes) : existing;
          } catch (e) {
            // The form stays open and shows this message.
            throw new Error(describeApiError(e, "branch"));
          }
        },
        createdMessage: "Branch created",
        savedMessage: "Changes saved",
      }}
    />
  );
}

export default function BranchesPage() {
  return (
    <Suspense>
      <BranchesView />
    </Suspense>
  );
}
