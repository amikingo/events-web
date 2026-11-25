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
import { createClient, getClient, listClients, setClientActive, updateClient } from "@/lib/api/clients";
import type { Client, ClientInput } from "@/lib/api/clients";
import { describeApiError } from "@/lib/api/errors";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatDate } from "@/lib/format";
import { clientQk } from "@/lib/query-keys";
import { ClientForm } from "./client-form";

const BASE = "/admin/clients";
const MODULE = MODULE_CODES.CUSTOMERS;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const kindLabel = (c: Client) => (c.kind === "INDIVIDUAL" ? "Individual" : "Organization");
const status = (c: Client) => <StatusPill kind="account" status={c.is_active ? "active" : "inactive"} />;

const columns: ColumnDef<Client>[] = [
  {
    key: "name",
    header: "Client",
    primary: true,
    sortable: true,
    filterValue: (r) => r.name,
    accessor: (r) => (
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(r.name)} size={32} />
        <div className="flex min-w-0 flex-col">
          <span className="type-body font-medium text-text">{r.name}</span>
          <span className="type-body-sm text-text-faint">{r.primary_contact_name ?? "No contact person"}</span>
        </div>
      </div>
    ),
  },
  { key: "kind", header: "Kind", filterValue: kindLabel, render: (r) => <Pill>{kindLabel(r)}</Pill> },
  { key: "type", header: "Sector", filterValue: (r) => r.type ?? "", accessor: (r) => r.type ?? "—" },
  { key: "phone", header: "Phone", accessor: (r) => r.primary_contact_phone ?? "—" },
  { key: "status", header: "Status", filterValue: (r) => (r.is_active ? "active" : "inactive"), render: status },
];



/** Change the address without rebuilding the page (so a record page loads once). */
function go(path: string) {
  window.history.pushState(null, "", path);
}

function ClientsView({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  const location = parseRecordPath(BASE, pathname);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const params = { page, pageSize };

  const list = useQuery({
    queryKey: clientQk.list(organizationId, params),
    queryFn: ({ signal }) => listClients(organizationId, params, signal),
    placeholderData: keepPreviousData,
  });

  // A record opened by link may not be on the current page: load it on its own.
  const openId = location.mode === "page" || location.mode === "edit" ? String(location.id) : null;
  const onPage = list.data?.data.some((c) => c.id === openId) ?? false;
  const detail = useQuery({
    queryKey: clientQk.detail(organizationId, openId ?? ""),
    queryFn: ({ signal }) => getClient(organizationId, openId!, signal),
    enabled: Boolean(openId) && list.isSuccess && !onPage,
  });
  const rows = list.data?.data ?? [];
  const clients = detail.data && !onPage ? [...rows, detail.data] : rows;

  /** After any change: every client query of this organization is refetched (the event form's picker too). */
  const saved = () => void queryClient.invalidateQueries({ queryKey: clientQk.all(organizationId) });

  const create = useMutation({ mutationFn: (input: ClientInput) => createClient(organizationId, input), onSuccess: saved });
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<ClientInput> }) => updateClient(organizationId, id, changes),
    onSuccess: saved,
  });
  const changeStatus = useMutation({
    mutationFn: ({ client, isActive }: { client: Client; isActive: boolean }) => setClientActive(organizationId, client.id, isActive),
    onSuccess: (client) => {
      saved();
      toast.success(client.is_active ? "Client switched on" : "Client switched off");
    },
    onError: (error) => toast.error("Couldn't change the client", { body: describeApiError(error, "client") }),
  });

  if (list.isError) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load the clients"
        description={describeApiError(list.error, "client")}
        actions={<Button onClick={() => void list.refetch()}>Try again</Button>}
      />
    );
  }

  const canUpdate = can("update", MODULE);
  const newClient = (label: string, icon = false) => (
    <Can I="create" a={MODULE}>
      <Button onClick={() => go(`${BASE}/new`)}>
        {icon && <PlusIcon className="size-4" />}
        {label}
      </Button>
    </Can>
  );

  // Create and edit are their own full pages.
  if (location.mode === "create" || location.mode === "edit") {
    const existing = location.mode === "edit" ? clients.find((r) => r.id === String(location.id)) : undefined;
    if (location.mode === "edit" && !existing) {
      if (list.isPending || detail.isPending) return null;
      return <EmptyState size="lg" title="This client doesn't exist" description="It may have been removed. Go back to the list." />;
    }
    return (
      <ClientForm
        key={existing?.id ?? "new"}
        client={existing}
        onCancel={() => go(existing ? `${BASE}/${existing.id}` : BASE)}
        onSubmit={async (input) => {
          try {
            if (existing) {
              // Send only what changed.
              const changes = Object.fromEntries(Object.entries(input).filter(([key, value]) => value !== existing[key as keyof Client])) as Partial<ClientInput>;
              const saved = Object.keys(changes).length ? await update.mutateAsync({ id: existing.id, changes }) : existing;
              toast.success("Changes saved");
              go(`${BASE}/${saved.id}`);
            } else {
              const created = await create.mutateAsync(input);
              toast.success("Client added");
              go(`${BASE}/${created.id}`);
            }
          } catch (e) {
            // The form stays open and shows this message (a code-based one: API messages are technical).
            throw new Error(describeApiError(e, "client"));
          }
        }}
      />
    );
  }

  return (
    <RecordWorkspace
      fit
      inlineToasts={false}
      // A short list sizes to its rows; the record page, panel and forms keep a tall stage.
      className={location.mode === "list" ? undefined : "h-[calc(100vh-270px)] min-h-[520px]"}
      records={clients}
      getId={(c) => c.id}
      noun="client"
      listLabel="Clients"
      location={location}
      // pushState (not router.push) changes the address without rebuilding the page, so the record page loads once.
      onLocationChange={(next) => go(recordPath(BASE, next))}
      list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
        <Table
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          title="Clients"
          loading={list.isPending}
          // Pages come from the server. The API can't search clients yet, so the table doesn't offer a search
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
              icon={<UserIcon />}
              title="No clients yet"
              description="Add the companies and people who commission your events."
              actions={newClient("New client")}
            />
          }
          toolbarActions={newClient("New client", true)}
          className="rounded-none border-none shadow-none"
        />
      )}
      identity={(c, api) => ({
        avatar: <Avatar initials={initialsOf(c.name)} size={48} />,
        name: c.name,
        status: status(c),
        meta: (
          <>
            {kindLabel(c)}
            {c.type ? ` · ${c.type}` : ""} · Added {formatDate(c.created_at)}
          </>
        ),
        primary: canUpdate ? { label: "Edit client", onClick: () => api.edit(c) } : undefined,
        menu: !canUpdate
          ? []
          : [
              c.is_active
                ? {
                    label: "Switch off client",
                    destructive: true,
                    onClick: () =>
                      api.confirm({
                        title: `Switch off ${c.name}?`,
                        description: "They can't be picked for new events until you switch them back on. Past events keep them.",
                        confirmLabel: "Switch off client",
                        onConfirm: () => changeStatus.mutate({ client: c, isActive: false }),
                      }),
                  }
                : {
                    label: "Switch on client",
                    onClick: () =>
                      api.confirm({
                        title: `Switch on ${c.name}?`,
                        description: "They can be picked for events again.",
                        confirmLabel: "Switch on client",
                        onConfirm: () => changeStatus.mutate({ client: c, isActive: true }),
                      }),
                  },
            ],
      })}
      stats={(c) => [
        { label: "Kind", value: kindLabel(c) },
        { label: "Sector", value: c.type ?? "—" },
        { label: "Status", value: c.is_active ? "Active" : "Inactive" },
        { label: "Added", value: formatDate(c.created_at, { year: false }) },
      ]}
      panel={(c) => (
        <div>
          <RecordHeading>Contact person</RecordHeading>
          <RecordKv
            items={[
              { label: "Name", value: c.primary_contact_name ?? "Not set" },
              { label: "Email", value: c.primary_contact_email ?? "Not set" },
              { label: "Phone", value: c.primary_contact_phone ?? "Not set" },
            ]}
          />
        </div>
      )}
      page={{
        tabs: [{ id: "overview", label: "Overview" }],
        content: (c) => (
          <div>
            <RecordHeading>Contact person</RecordHeading>
            <RecordKv
              items={[
                { label: "Name", value: c.primary_contact_name ?? "Not set" },
                { label: "Email", value: c.primary_contact_email ?? "Not set" },
                { label: "Phone", value: c.primary_contact_phone ?? "Not set" },
                { label: "Last changed", value: formatDate(c.updated_at) },
              ]}
            />
          </div>
        ),
        rail: (c) => (
          <RecordRailCard title="Client">
            <RecordKv
              single
              items={[
                { label: "Client ID", value: c.id },
                { label: "Status", value: status(c) },
                { label: "Added", value: formatDate(c.created_at) },
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
  );
}

/** Clients are an organization's own: a platform role picks one in the switcher first. */
function ClientsScreen() {
  const organizationId = useOrganizationId();
  if (organizationId === undefined) return null;
  if (organizationId === null) return <NoOrganization what="Clients" />;
  return <ClientsView organizationId={organizationId} />;
}

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsScreen />
    </Suspense>
  );
}
