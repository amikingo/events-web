"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { staffSession } from "@/app/auth/staff/staff-store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingIcon, PlusIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard, RecordRows } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { listBranches } from "@/lib/api/branches";
import type { Branch } from "@/lib/api/branches";
import { describeApiError } from "@/lib/api/errors";
import type { Organization } from "@/lib/api/organizations";
import { formatDate } from "@/lib/format";
import { useStorageStore } from "@/lib/marketplace/storage-store";
import { organizationsService } from "@/lib/services/organizations-service";
import { usePermissions } from "@/lib/services/permissions-service";

const BASE = "/admin/organizations";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const columns: ColumnDef<Organization>[] = [
  {
    key: "name",
    header: "Organization",
    primary: true,
    sortable: true,
    filterValue: (r) => r.name,
    accessor: (r) => (
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(r.name)} size={32} />
        <div className="flex min-w-0 flex-col">
          <span className="type-body font-medium text-text">{r.name}</span>
          <span className="type-body-sm text-text-faint">{r.description ?? "No description"}</span>
        </div>
      </div>
    ),
  },
  { key: "slug", header: "Slug", sortable: true, filterValue: (r) => r.slug, accessor: (r) => <span className="font-mono">{r.slug}</span> },
  { key: "status", header: "Status", filterValue: (r) => (r.is_active ? "active" : "inactive"), render: (r) => <StatusPill kind="account" status={r.is_active ? "active" : "inactive"} /> },
  { key: "created", header: "Created", sortable: true, filterValue: (r) => r.created_at, accessor: (r) => formatDate(r.created_at) },
];

const sections = [
  {
    id: "organization",
    title: "Organization",
    hint: "The company or team that runs events.",
    fields: [
      { name: "name", label: "Name", required: true, requiredMessage: "Enter the organization's name.", full: true, placeholder: "Selam Events" },
      {
        name: "slug",
        label: "Slug",
        hint: "Lower-case letters, numbers and hyphens. Left empty, we make one from the name. A name with no Latin letters, like Amharic, needs one.",
        placeholder: "selam-events",
        full: true,
        validate: (value: string) => {
          const v = value.trim();
          if (!v) return undefined;
          return v.length >= 2 && SLUG.test(v) ? undefined : "Use at least 2 lower-case letters, numbers or hyphens, like selam-events.";
        },
      },
      { name: "description", label: "Description", type: "textarea" as const, full: true, hint: "Optional." },
    ],
  },
  {
    id: "first-branch",
    title: "First branch",
    hint: "Leave both empty and we'll create a branch called MAIN.",
    fields: [
      {
        name: "branchName",
        label: "Branch name",
        placeholder: "Addis Office",
        validate: (value: string, all: Record<string, string>) => (!value.trim() && all.branchCode?.trim() ? "Enter the branch name, or clear the code." : undefined),
      },
      {
        name: "branchCode",
        label: "Branch code",
        placeholder: "ADDIS",
        hint: "Letters, numbers and underscores.",
        validate: (value: string, all: Record<string, string>) => {
          const v = value.trim();
          if (!v) return all.branchName?.trim() ? "Enter the branch code, or clear the name." : undefined;
          return /^[A-Za-z0-9_]+$/.test(v) ? undefined : "Use letters, numbers and underscores only.";
        },
      },
    ],
  },
];

/** Change the address without rebuilding the page (so a record page loads once). */
function go(path: string) {
  window.history.pushState(null, "", path);
}

function useOrganizations() {
  return useSyncExternalStore(organizationsService.subscribe, organizationsService.getSnapshot, organizationsService.getSnapshot);
}

/** The Branches tab of an organization's page. It loads with the page, so it has its own loading and error states. */
function OrganizationBranches({ organizationId }: { organizationId: string }) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; branches: Branch[]; error?: unknown }>({ status: "loading", branches: [] });

  useEffect(() => {
    const controller = new AbortController();
    listBranches(organizationId, controller.signal)
      .then((branches) => setState({ status: "ready", branches }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: "error", branches: [], error });
      });
    return () => controller.abort();
  }, [organizationId]);

  if (state.status === "loading") {
    return (
      <SkeletonStack>
        <Skeleton shape="block" />
        <Skeleton shape="block" />
      </SkeletonStack>
    );
  }
  if (state.status === "error") {
    return <EmptyState size="sm" tone="danger" title="We couldn't load the branches" description={describeApiError(state.error, "branch")} />;
  }
  if (state.branches.length === 0) return <EmptyState size="sm" icon={<BuildingIcon />} title="No branches yet" description="This organization has no branches." />;
  return (
    <div>
      <RecordHeading>Branches</RecordHeading>
      <RecordRows
        rows={state.branches.map((b) => ({
          title: b.name,
          meta: (
            <>
              <code>{b.code}</code> · Created {formatDate(b.created_at)}
            </>
          ),
          trailing: (
            <span className="flex items-center gap-2">
              {b.is_default && <Pill>Default</Pill>}
              <StatusPill kind="account" status={b.is_active ? "active" : "inactive"} />
            </span>
          ),
        }))}
      />
    </div>
  );
}

function OrganizationsView() {
  const pathname = usePathname();
  const { organizations, status, error } = useOrganizations();
  const user = useStorageStore(staffSession);
  const { can } = usePermissions();
  const location = parseRecordPath(BASE, pathname);

  // A platform role is not tied to an organization and sees them all. A tenant role sees only its own.
  const scope = user === undefined || user === null ? null : user.organizationId || "all";
  const isPlatform = scope === "all";

  useEffect(() => {
    if (scope) void organizationsService.load(scope);
  }, [scope]);

  if (status === "error") {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load the organizations"
        description={describeApiError(error, "organization")}
        actions={<Button onClick={() => scope && void organizationsService.load(scope, { force: true })}>Try again</Button>}
      />
    );
  }

  const canCreate = isPlatform && can("ORGANIZATIONS", "create");
  const loading = status === "idle" || status === "loading";

  return (
    <RecordWorkspace
      fit
      inlineToasts={false}
      className="h-[calc(100vh-270px)] min-h-[520px]"
      records={organizations}
      getId={(o) => o.id}
      noun="organization"
      listLabel="Organizations"
      location={location}
      // pushState (not router.push) changes the address without rebuilding the page, so the record page loads once.
      onLocationChange={(next) => go(recordPath(BASE, next))}
      list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
        <Table
          columns={columns}
          data={organizations}
          getRowId={(r) => r.id}
          title="Organizations"
          loading={loading}
          onRowClick={onRowClick}
          activeRowId={activeRowId}
          highlightIds={highlightIds}
          onVisibleRowsChange={onVisibleRowsChange}
          emptyState={
            <EmptyState
              icon={<BuildingIcon />}
              title="No organizations yet"
              description="Create one for each company that runs events."
              actions={canCreate ? <Button onClick={() => go(`${BASE}/new`)}>New organization</Button> : undefined}
            />
          }
          toolbarActions={
            canCreate ? (
              <Button onClick={() => go(`${BASE}/new`)}>
                <PlusIcon className="size-4" />
                New organization
              </Button>
            ) : undefined
          }
          className="rounded-none border-none shadow-none"
        />
      )}
      // Editing is not offered yet: the API can create and read organizations, not change them.
      identity={(o) => ({
        avatar: <Avatar initials={initialsOf(o.name)} size={48} />,
        name: o.name,
        status: <StatusPill kind="account" status={o.is_active ? "active" : "inactive"} />,
        meta: (
          <>
            <code>{o.slug}</code> · Created {formatDate(o.created_at)}
          </>
        ),
      })}
      stats={(o) => [
        { label: "Slug", value: o.slug },
        { label: "Status", value: o.is_active ? "Active" : "Inactive" },
        { label: "Created", value: formatDate(o.created_at, { year: false }) },
        { label: "Last changed", value: formatDate(o.updated_at, { year: false }) },
      ]}
      panel={(o) => (
        <div>
          <RecordHeading>Details</RecordHeading>
          <RecordKv
            items={[
              { label: "Name", value: o.name },
              { label: "Slug", value: o.slug },
              { label: "Description", value: o.description ?? "None" },
              { label: "Created", value: formatDate(o.created_at) },
            ]}
          />
        </div>
      )}
      page={{
        tabs: [
          { id: "overview", label: "Overview" },
          { id: "branches", label: "Branches" },
        ],
        content: (o, tab) =>
          tab === "branches" ? (
            <OrganizationBranches organizationId={o.id} />
          ) : (
            <div>
              <RecordHeading>Details</RecordHeading>
              <RecordKv
                items={[
                  { label: "Name", value: o.name },
                  { label: "Slug", value: o.slug },
                  { label: "Description", value: o.description ?? "None" },
                  { label: "Last changed", value: formatDate(o.updated_at) },
                ]}
              />
            </div>
          ),
        rail: (o) => (
          <RecordRailCard title="Organization">
            <RecordKv
              single
              items={[
                { label: "Organization ID", value: o.id },
                { label: "Status", value: <StatusPill kind="account" status={o.is_active ? "active" : "inactive"} /> },
                { label: "Created", value: formatDate(o.created_at) },
              ]}
            />
          </RecordRailCard>
        ),
      }}
      form={{
        sections,
        toValues: (o) => ({ name: o.name, slug: o.slug, description: o.description ?? "" }),
        onSave: async (values, existing) => {
          // The API has no way to change an organization yet; the edit route exists only because the workspace has one.
          if (existing) throw new Error("Organizations can't be changed yet.");
          const branchName = values.branchName?.trim();
          const branchCode = values.branchCode?.trim();
          try {
            return await organizationsService.create({
              name: values.name!.trim(),
              slug: values.slug?.trim() || undefined,
              description: values.description?.trim() || null,
              defaultBranch: branchName && branchCode ? { name: branchName, code: branchCode } : undefined,
            });
          } catch (e) {
            // The form stays open and shows this message.
            throw new Error(describeApiError(e, "organization"));
          }
        },
        createdMessage: "Organization created",
        savedMessage: "Changes saved",
      }}
    />
  );
}

export default function OrganizationsPage() {
  return (
    <Suspense>
      <OrganizationsView />
    </Suspense>
  );
}
