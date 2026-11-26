"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Can, useModuleAccess } from "@/components/ability-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DestructiveDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoIcon, PlusIcon, UserIcon } from "@/components/ui/icons";
import { Note } from "@/components/ui/note";
import { RecordHeading, RecordKv, RecordRailCard } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { Select } from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { describeApiError } from "@/lib/api/errors";
import {
  deletePlatformStaff,
  getPlatformStaff,
  listPlatformRoles,
  listPlatformStaff,
  setPlatformStaffActive,
  updatePlatformStaff,
} from "@/lib/api/platform";
import type { StaffAssignment } from "@/lib/api/staff";
import { useAuth } from "@/lib/auth-context";
import { MODULE_CODES } from "@/lib/constants/modules";
import { platformRoleQk, platformStaffQk } from "@/lib/query-keys";
import { AddPlatformStaffForm } from "./add-platform-staff-form";
import { ChangePlatformRoleForm } from "./change-platform-role-form";

const BASE = "/admin/platform/staff";
const MODULE = MODULE_CODES.USER_ROLES;
const ALL_FILTER = "all";

const nameOf = (a: StaffAssignment) =>
  (a.profile ? [a.profile.firstname, a.profile.middlename, a.profile.lastname].filter(Boolean).join(" ") : "") || "Name unavailable";
const initialsOf = (a: StaffAssignment) =>
  nameOf(a)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
const statusPill = (a: StaffAssignment) => <StatusPill kind="account" status={a.is_active ? "active" : "inactive"} />;

const columns: ColumnDef<StaffAssignment>[] = [
  {
    key: "name",
    header: "Person",
    primary: true,
    filterValue: nameOf,
    accessor: (a) => (
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(a)} size={32} />
        <div className="flex min-w-0 flex-col">
          <span className="type-body font-medium text-text">{nameOf(a)}</span>
          <span className="type-body-sm text-text-faint">{a.profile?.mobile ?? "Cheche account unavailable"}</span>
        </div>
      </div>
    ),
  },
  { key: "mobile", header: "Mobile", accessor: (a) => a.profile?.mobile ?? "—" },
  { key: "role", header: "Role", filterValue: (a) => a.role.name, accessor: (a) => a.role.name },
  { key: "status", header: "Status", filterValue: (a) => (a.is_active ? "active" : "inactive"), render: statusPill },
];

function go(path: string) {
  window.history.pushState(null, "", path);
}

function PlatformStaffView() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { can } = useModuleAccess();
  const location = parseRecordPath(BASE, pathname);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [roleFilter, setRoleFilter] = useState(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [deleteTarget, setDeleteTarget] = useState<StaffAssignment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const params = {
    page,
    pageSize,
    ...(roleFilter !== ALL_FILTER ? { roleId: roleFilter } : {}),
    ...(statusFilter === "all" ? {} : { isActive: statusFilter === "active" }),
  };

  const list = useQuery({
    queryKey: platformStaffQk.list(params),
    queryFn: ({ signal }) => listPlatformStaff(params, signal),
    placeholderData: keepPreviousData,
  });
  const roles = useQuery({
    queryKey: platformRoleQk.list(),
    queryFn: ({ signal }) => listPlatformRoles(signal),
  });

  const rows = list.data?.data ?? [];
  const targetId = location.mode === "page" || location.mode === "edit" ? String(location.id) : null;
  const detail = useQuery({
    queryKey: platformStaffQk.detail(targetId ?? ""),
    queryFn: ({ signal }) => getPlatformStaff(targetId!, signal),
    enabled: Boolean(targetId),
  });
  const records = detail.data && !rows.some((r) => r.id === detail.data.id) ? [detail.data, ...rows] : rows;

  const saved = () => {
    void queryClient.invalidateQueries({ queryKey: platformStaffQk.all() });
    void queryClient.invalidateQueries({ queryKey: platformRoleQk.all() });
  };

  const change = useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: string }) => updatePlatformStaff(id, roleId),
    onSuccess: saved,
  });

  const toggle = useMutation({
    mutationFn: ({ assignment, isActive }: { assignment: StaffAssignment; isActive: boolean }) =>
      setPlatformStaffActive(assignment.id, isActive),
    onSuccess: (a) => {
      saved();
      toast.success(a.is_active ? "Access switched on" : "Access switched off", { body: "It applies on their next request." });
    },
    onError: (error) => toast.error("Couldn't change platform access", { body: describeApiError(error, "platform person") }),
  });

  const remove = useMutation({
    mutationFn: (assignmentId: string) => deletePlatformStaff(assignmentId),
    onSuccess: () => {
      saved();
      setDeleteTarget(null);
      setDeleteError(null);
      toast.success("Platform assignment deleted");
      go(BASE);
    },
    onError: (error) => {
      setDeleteError(describeApiError(error, "platform person"));
    },
  });

  if (list.isError && !list.data) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load platform staff"
        description={describeApiError(list.error, "platform person")}
        actions={<Button onClick={() => void list.refetch()}>Try again</Button>}
      />
    );
  }

  const canUpdate = can("update", MODULE);
  const canDelete = can("delete", MODULE);

  const addButton = (label: string, icon = false) => (
    <Can I="create" a={MODULE}>
      <Button onClick={() => go(`${BASE}/new`)}>
        {icon && <PlusIcon className="size-4" />}
        {label}
      </Button>
    </Can>
  );

  if (location.mode === "create") {
    return <AddPlatformStaffForm onDone={(id) => go(id ? `${BASE}/${id}` : BASE)} />;
  }

  if (location.mode === "edit") {
    const existing = detail.data ?? rows.find((a) => a.id === targetId);
    if (!existing) {
      if (detail.isPending || list.isPending) return null;
      return (
        <EmptyState
          size="lg"
          tone={detail.isError ? "danger" : undefined}
          title={detail.isError ? "We couldn't load this assignment" : "This person isn't in the list"}
          description={detail.isError ? describeApiError(detail.error, "platform person") : "They may be on another page, or the assignment was removed."}
          actions={<Button onClick={() => go(BASE)}>Back to platform staff</Button>}
        />
      );
    }
    return (
      <ChangePlatformRoleForm
        key={existing.id}
        assignment={existing}
        personName={nameOf(existing)}
        roles={roles.data ?? []}
        onCancel={() => go(`${BASE}/${existing.id}`)}
        onSubmit={async (roleId) => {
          await change.mutateAsync({ id: existing.id, roleId });
          go(`${BASE}/${existing.id}`);
          toast.success("Platform role changed", { body: "It applies on their next request." });
        }}
      />
    );
  }

  if (location.mode === "page" && !records.some((a) => a.id === targetId)) {
    if (detail.isPending) return null;
    if (detail.isError) {
      return (
        <EmptyState
          size="lg"
          tone="danger"
          title="We couldn't load this assignment"
          description={describeApiError(detail.error, "platform person")}
          actions={<Button onClick={() => go(BASE)}>Back to platform staff</Button>}
        />
      );
    }
  }

  const filterBar = (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <Select
        aria-label="Filter by role"
        value={roleFilter}
        onValueChange={(value) => {
          setRoleFilter(value);
          setPage(1);
        }}
        options={[{ value: ALL_FILTER, label: "All roles" }, ...(roles.data ?? []).map((r) => ({ value: r.id, label: r.name }))]}
        className="w-full sm:w-[170px]"
      />
      <Select
        aria-label="Filter by status"
        value={statusFilter}
        onValueChange={(value) => {
          setStatusFilter(value as "all" | "active" | "inactive");
          setPage(1);
        }}
        options={[
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Switched off" },
        ]}
        className="w-full sm:w-[150px]"
      />
      {addButton("Add platform staff", true)}
    </div>
  );

  return (
    <>
      <RecordWorkspace
        fit
        inlineToasts={false}
        className={location.mode === "list" ? undefined : "h-[calc(100vh-270px)] min-h-[520px]"}
        records={records}
        getId={(a) => a.id}
        noun="platform assignment"
        listLabel="Platform staff"
        location={location}
        onLocationChange={(next) => go(recordPath(BASE, next))}
        list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
          <Table
            columns={columns}
            data={rows}
            getRowId={(r) => r.id}
            title="Platform staff"
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
            emptyState={
              roleFilter !== ALL_FILTER || statusFilter !== "all" ? (
                <EmptyState
                  icon={<UserIcon />}
                  title="No platform staff match these filters"
                  description="Try another role or status."
                  actions={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setRoleFilter(ALL_FILTER);
                        setStatusFilter("all");
                        setPage(1);
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<UserIcon />}
                  title="No platform staff yet"
                  description="Give someone a platform role to help administer the platform."
                  actions={addButton("Add platform staff")}
                />
              )
            }
            toolbarActions={filterBar}
            className="rounded-none border-none shadow-none"
          />
        )}
        identity={(a, api) => {
          const isOwn = Boolean(user?.id && user.id === a.user_id);
          const toggleItems =
            !canUpdate || isOwn
              ? []
              : [
                  a.is_active
                    ? {
                        label: "Switch off access",
                        destructive: true,
                        onClick: () =>
                          api.confirm({
                            title: `Switch off ${nameOf(a)}'s platform access?`,
                            description: "They won't be able to sign in with this platform role until you switch it back on.",
                            confirmLabel: "Switch off access",
                            onConfirm: () => toggle.mutate({ assignment: a, isActive: false }),
                          }),
                      }
                    : {
                        label: "Switch on access",
                        onClick: () =>
                          api.confirm({
                            title: `Switch on ${nameOf(a)}'s platform access?`,
                            description: "They get their platform role back on their next request.",
                            confirmLabel: "Switch on access",
                            onConfirm: () => toggle.mutate({ assignment: a, isActive: true }),
                          }),
                      },
                ];
          const deleteItems =
            canDelete && !isOwn
              ? [
                  {
                    label: "Delete assignment",
                    destructive: true,
                    onClick: () => {
                      setDeleteError(null);
                      setDeleteTarget(a);
                    },
                  },
                ]
              : [];

          return {
            avatar: <Avatar initials={initialsOf(a)} size={48} />,
            name: nameOf(a),
            status: statusPill(a),
            meta: <>{a.role.name} · Platform</>,
            primary: canUpdate && !isOwn ? { label: "Change role", onClick: () => api.edit(a) } : undefined,
            menu: [...toggleItems, ...deleteItems],
          };
        }}
        stats={(a) => [
          { label: "Role", value: a.role.name },
          { label: "Scope", value: "Platform" },
          { label: "Status", value: a.is_active ? "Active" : "Inactive" },
        ]}
        panel={(a) => {
          const isOwn = Boolean(user?.id && user.id === a.user_id);
          return (
            <div className="flex flex-col gap-3">
              <div>
                <RecordHeading>Details</RecordHeading>
                <RecordKv items={[{ label: "Mobile", value: a.profile?.mobile ?? "—" }, { label: "Role", value: a.role.name }, { label: "Scope", value: "Platform" }]} />
              </div>
              {isOwn && <Note icon={<InfoIcon />}>You can&apos;t change or remove your own platform access. Ask another Super Admin.</Note>}
            </div>
          );
        }}
        page={{
          tabs: [{ id: "overview", label: "Overview" }],
          content: (a) => {
            const isOwn = Boolean(user?.id && user.id === a.user_id);
            return (
              <div className="flex flex-col gap-4">
                <div>
                  <RecordHeading>Details</RecordHeading>
                  <RecordKv
                    items={[
                      { label: "Name", value: nameOf(a) },
                      { label: "Mobile", value: a.profile?.mobile ?? "—" },
                      { label: "Role", value: a.role.name },
                      { label: "Scope", value: "Platform" },
                    ]}
                  />
                </div>
                {isOwn && <Note icon={<InfoIcon />}>You can&apos;t change or remove your own platform access. Ask another Super Admin.</Note>}
              </div>
            );
          },
          rail: (a) => (
            <RecordRailCard title="Platform assignment">
              <RecordKv
                single
                items={[
                  { label: "Role code", value: a.role.code },
                  { label: "Status", value: statusPill(a) },
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
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title={deleteTarget ? `Delete ${nameOf(deleteTarget)}'s platform assignment?` : ""}
        description={
          deleteTarget
            ? `This removes ${nameOf(deleteTarget)}'s ${deleteTarget.role.name} platform role for good. Switch it off instead if they may come back.`
            : ""
        }
        confirmLabel="Delete assignment"
        loading={remove.isPending}
        loadingLabel="Deleting"
        error={deleteError ?? undefined}
        onConfirm={() => {
          if (!deleteTarget) return;
          setDeleteError(null);
          remove.mutate(deleteTarget.id);
        }}
      />
    </>
  );
}

export default function PlatformStaffPage() {
  return (
    <Suspense>
      <PlatformStaffView />
    </Suspense>
  );
}
