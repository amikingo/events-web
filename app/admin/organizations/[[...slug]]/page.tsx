"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Can, useModuleAccess } from "@/components/ability-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, DestructiveDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingIcon, PlusIcon, UserIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard, RecordRows } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { listAllBranches } from "@/lib/api/branches";
import { describeApiError } from "@/lib/api/errors";
import { createOrganization, getOrganization, listOrganizations, setOrganizationActive, updateOrganization } from "@/lib/api/organizations";
import type { Organization, OrganizationInput, OrganizationUpdateInput } from "@/lib/api/organizations";
import { listStaffAssignments } from "@/lib/api/staff";
import { useAuth } from "@/lib/auth-context";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatDate } from "@/lib/format";
import { useOrganization } from "@/lib/organization-context";
import { branchQk, organizationQk, staffQk } from "@/lib/query-keys";
import { OrganizationForm } from "./organization-form";

const BASE = "/admin/organizations";
const MODULE = MODULE_CODES.ORGANIZATIONS;

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

/** Change the address without rebuilding the page (so a record page loads once). */
function go(path: string) {
  window.history.pushState(null, "", path);
}

/** The Branches tab of an organization's page. It loads with the page, so it has its own loading and error states. */
function OrganizationBranches({ organizationId }: { organizationId: string }) {
  const query = useQuery({
    queryKey: branchQk.everyone(organizationId),
    queryFn: ({ signal }) => listAllBranches(organizationId, signal),
  });
  const state = { status: query.isPending ? "loading" : query.isError ? "error" : "ready", branches: query.data ?? [], error: query.error } as const;

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

/** The Staff Assignments tab of an organization's page, showing its assigned staff including the Owner. */
function OrganizationStaff({ organizationId }: { organizationId: string }) {
  const params = { page: 1, pageSize: 50 };
  const query = useQuery({
    queryKey: staffQk.list(organizationId, params),
    queryFn: ({ signal }) => listStaffAssignments(organizationId, params, signal),
  });

  if (query.isPending) {
    return (
      <SkeletonStack>
        <Skeleton shape="block" />
        <Skeleton shape="block" />
      </SkeletonStack>
    );
  }
  if (query.isError) {
    return <EmptyState size="sm" tone="danger" title="We couldn't load the staff" description={describeApiError(query.error, "person")} />;
  }
  const staff = query.data?.data ?? [];
  if (staff.length === 0) {
    return <EmptyState size="sm" icon={<UserIcon />} title="No staff yet" description="Add staff in Staff Assignments." />;
  }
  return (
    <div>
      <RecordHeading>Staff Assignments</RecordHeading>
      <RecordRows
        rows={staff.map((a) => {
          const name = a.profile ? [a.profile.firstname, a.profile.middlename, a.profile.lastname].filter(Boolean).join(" ") : "";
          return {
            title: name || a.profile?.mobile || "Name unavailable",
            meta: (
              <>
                {a.profile?.mobile ? `${a.profile.mobile} · ` : ""}
                {a.branch?.name ?? "Whole organization"}
              </>
            ),
            trailing: (
              <span className="flex items-center gap-2">
                <Pill>{a.role.name}</Pill>
                <StatusPill kind="account" status={a.is_active ? "active" : "inactive"} />
              </span>
            ),
          };
        })}
      />
    </div>
  );
}

function OrganizationsView() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  const { assignment } = useAuth();
  const { isPlatform, organizationId: ownOrganizationId } = useOrganization();
  const isSuperAdmin = assignment !== null && assignment.organizationId === null;
  const location = parseRecordPath(BASE, pathname);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusTarget, setStatusTarget] = useState<{ organization: Organization; isActive: boolean } | null>(null);
  const params = { page, pageSize };

  // A platform role is not tied to an organization and sees them all, a page at a time. A tenant role sees only its own.
  const list = useQuery({
    queryKey: organizationQk.list(params),
    queryFn: ({ signal }) => listOrganizations(params, signal),
    placeholderData: keepPreviousData,
    enabled: isPlatform,
  });
  const own = useQuery({
    queryKey: organizationQk.detail(ownOrganizationId ?? ""),
    queryFn: ({ signal }) => getOrganization(ownOrganizationId!, signal),
    enabled: !isPlatform && Boolean(ownOrganizationId),
  });

  // A record opened by link may not be on the current page: load it on its own.
  const openId = isPlatform && (location.mode === "page" || location.mode === "edit") ? String(location.id) : null;
  const onPage = list.data?.data.some((o) => o.id === openId) ?? false;
  const detail = useQuery({
    queryKey: organizationQk.detail(openId ?? ""),
    queryFn: ({ signal }) => getOrganization(openId!, signal),
    enabled: Boolean(openId) && list.isSuccess && !onPage,
  });
  const rows = isPlatform ? (list.data?.data ?? []) : own.data ? [own.data] : [];
  const organizations = detail.data && !onPage ? [...rows, detail.data] : rows;
  const source = isPlatform ? list : own;

  // Staff of one organization can only read their own: open its page rather than a list of one.
  useEffect(() => {
    if (!isPlatform && ownOrganizationId && location.mode === "list") window.history.replaceState(null, "", `${BASE}/${ownOrganizationId}`);
  }, [isPlatform, ownOrganizationId, location.mode]);

  /** After any change: every organization query is refetched (the platform picker too). */
  const saved = () => void queryClient.invalidateQueries({ queryKey: organizationQk.all() });

  const create = useMutation({
    mutationFn: (input: OrganizationInput) => createOrganization(input),
    onSuccess: (created) => {
      saved();
      void queryClient.invalidateQueries({ queryKey: staffQk.all(created.organization.id) });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: OrganizationUpdateInput }) => updateOrganization(id, changes),
    onSuccess: saved,
  });
  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setOrganizationActive(id, isActive),
    onSuccess: (updated) => {
      saved();
      setStatusTarget(null);
      toast.success(updated.is_active ? "Organization switched on" : "Organization switched off");
    },
    onError: (err) => {
      setStatusTarget(null);
      toast.error(describeApiError(err, "organization"));
    },
  });

  if (source.isError) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load the organizations"
        description={describeApiError(source.error, "organization")}
        actions={<Button onClick={() => void source.refetch()}>Try again</Button>}
      />
    );
  }

  const canUpdate = can("update", MODULE);
  const canViewStaff = can("read", MODULE_CODES.USER_ROLES);
  const newOrganization = (label: string, icon = false) =>
    isPlatform ? (
      <Can I="create" a={MODULE}>
        <Button onClick={() => go(`${BASE}/new`)}>
          {icon && <PlusIcon className="size-4" />}
          {label}
        </Button>
      </Can>
    ) : undefined;

  // Create and edit are their own full pages.
  if (location.mode === "create" || location.mode === "edit") {
    const existing = location.mode === "edit" ? organizations.find((o) => o.id === String(location.id)) : undefined;
    if (location.mode === "edit" && !existing) {
      if (source.isPending || detail.isPending) return null;
      return <EmptyState size="lg" title="This organization doesn't exist" description="It may have been removed. Go back to the list." />;
    }
    return (
      <OrganizationForm
        key={existing?.id ?? "new"}
        organization={existing}
        onCancel={() => go(existing ? `${BASE}/${existing.id}` : BASE)}
        onCreate={async (input) => {
          const result = await create.mutateAsync(input);
          toast.success(result.owner ? "Organization created with its Owner" : "Organization created");
          go(`${BASE}/${result.organization.id}`);
        }}
        onSave={async (changes) => {
          if (Object.keys(changes).length) await update.mutateAsync({ id: existing!.id, changes });
          toast.success("Organization updated");
          go(`${BASE}/${existing!.id}`);
        }}
      />
    );
  }

  return (
    <>
      <RecordWorkspace
        fit
        inlineToasts={false}
        // A short list sizes to its rows; the record page, panel and forms keep a tall stage.
        className={location.mode === "list" ? undefined : "h-[calc(100vh-270px)] min-h-[520px]"}
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
            data={rows}
            getRowId={(r) => r.id}
            title="Organizations"
            loading={source.isPending}
            // Pages come from the server. The API can't search organizations yet, so the table doesn't offer a
            // search that would only look at the page on screen.
            page={page}
            onPageChange={setPage}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            totalRows={isPlatform ? (list.data?.totalItems ?? 0) : rows.length}
            searchable={false}
            filters={false}
            onRowClick={onRowClick}
            activeRowId={activeRowId}
            highlightIds={highlightIds}
            onVisibleRowsChange={onVisibleRowsChange}
            emptyState={
              <EmptyState
                icon={<BuildingIcon />}
                title="No organizations yet"
                description="Create one for each company that runs events."
                actions={newOrganization("New organization")}
              />
            }
            toolbarActions={newOrganization("New organization", true)}
            className="rounded-none border-none shadow-none"
          />
        )}
        identity={(o, api) => ({
          primary: canUpdate ? { label: "Edit organization", onClick: () => api.edit(o) } : undefined,
          menu: !isSuperAdmin
            ? []
            : [
                o.is_active
                  ? {
                      label: "Switch off organization",
                      destructive: true,
                      onClick: () => setStatusTarget({ organization: o, isActive: false }),
                    }
                  : {
                      label: "Switch on organization",
                      onClick: () => setStatusTarget({ organization: o, isActive: true }),
                    },
              ],
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
          { label: "Country", value: o.country },
          { label: "Timezone", value: o.timezone.replace(/_/g, " ") },
          { label: "Currency", value: o.default_currency },
          { label: "Branches", value: o.has_branches ? "On" : "Off" },
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
            ...(canViewStaff ? [{ id: "staff", label: "Staff Assignments" }] : []),
          ],
          content: (o, tab) =>
            tab === "branches" ? (
              o.has_branches ? (
                <OrganizationBranches organizationId={o.id} />
              ) : (
                <EmptyState size="sm" icon={<BuildingIcon />} title="Branches are off" description="This organization runs everything as one. Adding a branch turns them on." />
              )
            ) : tab === "staff" ? (
              <OrganizationStaff organizationId={o.id} />
            ) : (
              <div className="flex flex-col gap-4">
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
                <div>
                  <RecordHeading>Defaults for new events</RecordHeading>
                  <RecordKv
                    items={[
                      { label: "Country", value: o.country },
                      { label: "Timezone", value: o.timezone.replace(/_/g, " ") },
                      { label: "Currency", value: o.default_currency },
                    ]}
                  />
                </div>
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
          sections: [],
          toValues: () => ({}),
          onSave: (_values, existing) => {
            if (existing) return existing;
            throw new Error("Use the form page.");
          },
        }}
      />

      <DestructiveDialog
        open={Boolean(statusTarget && !statusTarget.isActive)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        title={statusTarget ? `Switch off ${statusTarget.organization.name}?` : ""}
        description="Its staff won't be able to sign in or work, and its events disappear from the public site. Nothing is deleted; you can switch it back on."
        confirmLabel="Switch off organization"
        loading={toggleStatus.isPending}
        loadingLabel="Switching off"
        onConfirm={() => {
          if (!statusTarget) return;
          toggleStatus.mutate({ id: statusTarget.organization.id, isActive: false });
        }}
      />

      <ConfirmDialog
        open={Boolean(statusTarget && statusTarget.isActive)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        title={statusTarget ? `Switch on ${statusTarget.organization.name}?` : ""}
        description="Its staff will be able to sign in and work again, and its published events can appear on the public site."
        confirmLabel="Switch on organization"
        loading={toggleStatus.isPending}
        loadingLabel="Switching on"
        onConfirm={() => {
          if (!statusTarget) return;
          toggleStatus.mutate({ id: statusTarget.organization.id, isActive: true });
        }}
      />
    </>
  );
}

export default function OrganizationsPage() {
  return (
    <Suspense>
      <OrganizationsView />
    </Suspense>
  );
}
