"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { NoOrganization, useOrganizationId } from "@/app/admin/_components/organization-scope";
import { Can, useModuleAccess } from "@/components/ability-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingIcon, PlusIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { refreshAccessToken } from "@/lib/api-client";
import { createBranch, getBranch, listBranches, setBranchActive, updateBranch } from "@/lib/api/branches";
import type { Branch, BranchInput } from "@/lib/api/branches";
import { describeApiError } from "@/lib/api/errors";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatDate } from "@/lib/format";
import { branchQk, organizationQk } from "@/lib/query-keys";
import { BranchForm } from "./branch-form";

const BASE = "/admin/branches";
const MODULE = MODULE_CODES.BRANCHES;

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


/** Change the address without rebuilding the page (so a record page loads once). */
function go(path: string) {
  window.history.pushState(null, "", path);
}

function BranchesView({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  const canView = can("read", MODULE);
  const location = parseRecordPath(BASE, pathname);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // Switching something back on is harmless, so it gets the ordinary confirm (the workspace's own is the red, delete-style one).
  const [switchOn, setSwitchOn] = useState<{ title: string; description: string; confirmLabel: string; onConfirm: () => void } | null>(null);
  const params = { page, pageSize };

  // In an organization without branches, `permissions.BRANCHES.view` is false (`feature_disabled`), so never call GET .../branches.
  const list = useQuery({
    queryKey: branchQk.list(organizationId, params),
    queryFn: ({ signal }) => listBranches(organizationId, params, signal),
    enabled: canView,
    placeholderData: keepPreviousData,
  });

  // A record opened by link may not be on the current page: load it on its own.
  const openId = location.mode === "page" || location.mode === "edit" ? String(location.id) : null;
  const onPage = list.data?.data.some((b) => b.id === openId) ?? false;
  const detail = useQuery({
    queryKey: branchQk.detail(organizationId, openId ?? ""),
    queryFn: ({ signal }) => getBranch(organizationId, openId!, signal),
    enabled: canView && Boolean(openId) && list.isSuccess && !onPage,
  });
  const rows = list.data?.data ?? [];
  const branches = detail.data && !onPage ? [...rows, detail.data] : rows;

  /** After any change: every branch query of this organization is refetched. */
  const saved = () => void queryClient.invalidateQueries({ queryKey: branchQk.all(organizationId) });

  const create = useMutation({
    mutationFn: (input: BranchInput) => createBranch(organizationId, input),
    onSuccess: async () => {
      saved();
      // Adding the first branch turns branches on for the organization (`has_branches`); refresh `/me` so Branches joins the menu.
      void queryClient.invalidateQueries({ queryKey: organizationQk.all() });
      if (!canView) await refreshAccessToken().catch(() => undefined);
      await queryClient.refetchQueries({ queryKey: ["user", "effective-access"] });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<BranchInput> }) => updateBranch(organizationId, id, changes),
    onSuccess: saved,
  });
  const changeStatus = useMutation({
    mutationFn: ({ branch, isActive }: { branch: Branch; isActive: boolean }) => setBranchActive(organizationId, branch.id, isActive),
    onSuccess: (branch) => {
      saved();
      toast.success(branch.is_active ? "Branch switched on" : "Branch switched off");
    },
    onError: (error) => toast.error("Couldn't change the branch", { body: describeApiError(error, "branch") }),
  });

  if (canView && list.isError) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load the branches"
        description={describeApiError(list.error, "branch")}
        actions={<Button onClick={() => void list.refetch()}>Try again</Button>}
      />
    );
  }

  const canUpdate = can("update", MODULE);
  const newBranch = (label: string, icon = false) => (
    <Can I="create" a={MODULE}>
      <Button onClick={() => go(`${BASE}/new`)}>
        {icon && <PlusIcon className="size-4" />}
        {label}
      </Button>
    </Can>
  );

  // Create and edit are their own full pages.
  if (location.mode === "create" || location.mode === "edit") {
    const existing = location.mode === "edit" ? branches.find((r) => r.id === String(location.id)) : undefined;
    if (location.mode === "edit" && !existing) {
      if (list.isPending || detail.isPending) return null;
      return <EmptyState size="lg" title="This branch doesn't exist" description="It may have been removed. Go back to the list." />;
    }
    return (
      <BranchForm
        key={existing?.id ?? "new"}
        branch={existing}
        onCancel={() => go(existing ? `${BASE}/${existing.id}` : BASE)}
        onSubmit={async (input) => {
          try {
            if (existing) {
              // Send only what changed.
              const changes = Object.fromEntries(Object.entries(input).filter(([key, value]) => value !== existing[key as keyof Branch])) as Partial<BranchInput>;
              const saved = Object.keys(changes).length ? await update.mutateAsync({ id: existing.id, changes }) : existing;
              toast.success("Changes saved");
              go(`${BASE}/${saved.id}`);
            } else {
              const created = await create.mutateAsync(input);
              toast.success("Branch created");
              go(`${BASE}/${created.id}`);
            }
          } catch (e) {
            // The form stays open and shows this message (a code-based one: API messages are technical).
            throw new Error(describeApiError(e, "branch"));
          }
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
      className={location.mode === "list" ? undefined : "h-[calc(100vh-170px)] min-h-[520px]"}
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
          data={rows}
          getRowId={(r) => r.id}
          title="Branches"
          loading={list.isPending}
          // Pages come from the server. The API can't search branches yet, so the table doesn't offer a search
          // that would only look at the page on screen.
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
          emptyState={
            <EmptyState
              icon={<BuildingIcon />}
              title="No branches yet"
              description="Add a branch for each office or venue you run events from."
              actions={newBranch("New branch")}
            />
          }
          toolbarActions={newBranch("New branch", true)}
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
                        onConfirm: () => changeStatus.mutate({ branch: b, isActive: false }),
                      }),
                  },
                ]
            : [
                {
                  label: "Switch on branch",
                  onClick: () =>
                    setSwitchOn({
                      title: `Switch on ${b.name}?`,
                      description: "People will be able to use this branch again.",
                      confirmLabel: "Switch on branch",
                      onConfirm: () => changeStatus.mutate({ branch: b, isActive: true }),
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
        // Not used: create and edit are their own full pages (see the form above). The workspace still needs a form prop.
        sections: [],
        toValues: () => ({}),
        onSave: (_values, existing) => {
          if (existing) return existing;
          throw new Error("Use the form page.");
        },
      }}
    />
    <ConfirmDialog
      open={switchOn !== null}
      onOpenChange={(open) => !open && setSwitchOn(null)}
      tone="success"
      title={switchOn?.title ?? ""}
      description={switchOn?.description}
      confirmLabel={switchOn?.confirmLabel}
      onConfirm={() => {
        const action = switchOn;
        setSwitchOn(null);
        action?.onConfirm();
      }}
    />
    </>
  );
}

/** Branches are an organization's own: a platform role picks one in the switcher first. */
function BranchesScreen() {
  const organizationId = useOrganizationId();
  if (organizationId === undefined) return null;
  if (organizationId === null) return <NoOrganization what="Branches" />;
  return <BranchesView organizationId={organizationId} />;
}

export default function BranchesPage() {
  return (
    <Suspense>
      <BranchesScreen />
    </Suspense>
  );
}
