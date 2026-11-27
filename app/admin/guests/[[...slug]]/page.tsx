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
import { PlusIcon, UserIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard, RecordRows } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { describeApiError } from "@/lib/api/errors";
import { createPerson, getPerson, listPersons, setPersonActive, updatePerson } from "@/lib/api/persons";
import type { Person, PersonInput } from "@/lib/api/persons";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatDate } from "@/lib/format";
import { personQk } from "@/lib/query-keys";
import { formatMomentShort } from "@/lib/ethiopian-datetime";
import { GuestForm } from "./guest-form";

const BASE = "/admin/guests";
const MODULE = MODULE_CODES.REGISTRATIONS;

const fullName = (p: Pick<Person, "first_name" | "last_name">) => [p.first_name, p.last_name].filter(Boolean).join(" ");
const initialsOf = (p: Pick<Person, "first_name" | "last_name">) => `${p.first_name[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase() || "?";
const status = (p: Person) => <StatusPill kind="account" status={p.is_active ? "active" : "inactive"} />;

const columns: ColumnDef<Person>[] = [
  {
    key: "name",
    header: "Guest",
    primary: true,
    filterValue: (r) => fullName(r),
    accessor: (r) => (
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(r)} size={32} />
        <div className="flex min-w-0 flex-col">
          <span className="type-body font-medium text-text">{fullName(r)}</span>
          <span className="type-body-sm text-text-faint">{r.affiliation_name ?? "No organization"}</span>
        </div>
      </div>
    ),
  },
  { key: "phone", header: "Phone", accessor: (r) => r.phone ?? "—" },
  { key: "email", header: "Email", accessor: (r) => r.email ?? "—" },
  { key: "status", header: "Status", filterValue: (r) => (r.is_active ? "active" : "inactive"), render: status },
];




/** Change the address without rebuilding the page (so a record page loads once). */
function go(path: string) {
  window.history.pushState(null, "", path);
}

/** The Registrations tab of a guest's page: every event they hold or held a place at, in this organization. */
function GuestRegistrations({ organizationId, personId }: { organizationId: string; personId: string }) {
  const query = useQuery({ queryKey: personQk.detail(organizationId, personId), queryFn: ({ signal }) => getPerson(organizationId, personId, signal) });
  if (query.isPending) {
    return (
      <SkeletonStack>
        <Skeleton shape="block" />
        <Skeleton shape="block" />
      </SkeletonStack>
    );
  }
  if (query.isError) return <EmptyState size="sm" tone="danger" title="We couldn't load their registrations" description={describeApiError(query.error, "guest")} />;
  const registrations = query.data.registrations;
  if (registrations.length === 0) return <EmptyState size="sm" icon={<UserIcon />} title="No registrations yet" description="Register this guest from an event's Guests tab." />;
  return (
    <div>
      <RecordHeading>Registrations</RecordHeading>
      <RecordRows
        rows={registrations.map((r) => ({
          title: r.event.name,
          meta: (
            <>
              <code>{r.code}</code> · {r.ticket_type.name} · {r.event.starts_at ? formatMomentShort(r.event.starts_at, r.event.timezone) : "Date not set"}
            </>
          ),
          trailing: <Pill>{r.status === "CONFIRMED" ? "Confirmed" : "Cancelled"}</Pill>,
        }))}
      />
    </div>
  );
}

function GuestsView({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  const location = parseRecordPath(BASE, pathname);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // Switching something back on is harmless, so it gets the ordinary confirm (the workspace's own is the red, delete-style one).
  const [switchOn, setSwitchOn] = useState<{ title: string; description: string; confirmLabel: string; onConfirm: () => void } | null>(null);
  const [search, setSearch] = useState("");
  // The API searches names, email and phone (`09…` also finds `+251…`). Ask once the person stops typing.
  const q = useDebouncedValue(search.trim(), 300);
  const params = { page, pageSize, q: q || undefined };

  const list = useQuery({
    queryKey: personQk.list(organizationId, params),
    queryFn: ({ signal }) => listPersons(organizationId, params, signal),
    placeholderData: keepPreviousData,
  });

  // A record opened by link may not be on the current page (or the search): load it on its own.
  const openId = location.mode === "page" || location.mode === "edit" ? String(location.id) : null;
  const onPage = list.data?.data.some((p) => p.id === openId) ?? false;
  const detail = useQuery({
    queryKey: personQk.detail(organizationId, openId ?? ""),
    queryFn: ({ signal }) => getPerson(organizationId, openId!, signal),
    enabled: Boolean(openId) && list.isSuccess && !onPage,
  });
  const rows = list.data?.data ?? [];
  const persons = detail.data && !onPage ? [...rows, detail.data] : rows;

  /** After any change: every guest query of this organization is refetched. */
  const saved = () => void queryClient.invalidateQueries({ queryKey: personQk.all(organizationId) });

  const create = useMutation({ mutationFn: (input: PersonInput) => createPerson(organizationId, input), onSuccess: saved });
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<PersonInput> }) => updatePerson(organizationId, id, changes),
    onSuccess: saved,
  });
  const changeStatus = useMutation({
    mutationFn: ({ person, isActive }: { person: Person; isActive: boolean }) => setPersonActive(organizationId, person.id, isActive),
    onSuccess: (person) => {
      saved();
      toast.success(person.is_active ? "Guest switched on" : "Guest switched off");
    },
    onError: (error) => toast.error("Couldn't change the guest", { body: describeApiError(error, "guest") }),
  });

  if (list.isError && !list.data) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load the guests"
        description={describeApiError(list.error, "guest")}
        actions={<Button onClick={() => void list.refetch()}>Try again</Button>}
      />
    );
  }

  const canUpdate = can("update", MODULE);
  const newGuest = (label: string, icon = false) => (
    <Can I="create" a={MODULE}>
      <Button onClick={() => go(`${BASE}/new`)}>
        {icon && <PlusIcon className="size-4" />}
        {label}
      </Button>
    </Can>
  );

  // Create and edit are their own full pages.
  if (location.mode === "create" || location.mode === "edit") {
    const existing = location.mode === "edit" ? persons.find((r) => r.id === String(location.id)) : undefined;
    if (location.mode === "edit" && !existing) {
      if (list.isPending || detail.isPending) return null;
      return <EmptyState size="lg" title="This guest doesn't exist" description="It may have been removed. Go back to the list." />;
    }
    return (
      <GuestForm
        key={existing?.id ?? "new"}
        person={existing}
        onCancel={() => go(existing ? `${BASE}/${existing.id}` : BASE)}
        onSubmit={async (input) => {
          try {
            if (existing) {
              // Send only what changed.
              const changes = Object.fromEntries(Object.entries(input).filter(([key, value]) => value !== existing[key as keyof Person])) as Partial<PersonInput>;
              const saved = Object.keys(changes).length ? await update.mutateAsync({ id: existing.id, changes }) : existing;
              toast.success("Changes saved");
              go(`${BASE}/${saved.id}`);
            } else {
              const created = await create.mutateAsync(input);
              toast.success("Guest added");
              go(`${BASE}/${created.id}`);
            }
          } catch (e) {
            // The form stays open and shows this message (a code-based one: API messages are technical).
            throw new Error(describeApiError(e, "guest"));
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
      records={persons}
      getId={(p) => p.id}
      noun="guest"
      listLabel="Guests"
      location={location}
      // pushState (not router.push) changes the address without rebuilding the page, so the record page loads once.
      onLocationChange={(next) => go(recordPath(BASE, next))}
      list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
        <Table
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          title="Guests"
          loading={list.isPending}
          // Search runs on the server, so it finds a guest on any page.
          searchQuery={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="Search name, phone or email"
          page={page}
          onPageChange={setPage}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          totalRows={list.data?.totalItems ?? 0}
          filters={false}
          onRowClick={onRowClick}
          activeRowId={activeRowId}
          highlightIds={highlightIds}
          onVisibleRowsChange={onVisibleRowsChange}
          emptyState={
            q ? (
              <EmptyState icon={<UserIcon />} title="No guest matches" description={`Nobody matches "${q}". Check the spelling, or add them as a new guest.`} actions={newGuest("New guest")} />
            ) : (
              <EmptyState icon={<UserIcon />} title="No guests yet" description="Guests are created when someone registers, or you can add one now." actions={newGuest("New guest")} />
            )
          }
          toolbarActions={newGuest("New guest", true)}
          className="rounded-none border-none shadow-none"
        />
      )}
      identity={(p, api) => ({
        avatar: <Avatar initials={initialsOf(p)} size={48} />,
        name: fullName(p),
        status: status(p),
        meta: (
          <>
            {p.phone ?? p.email ?? "No contact details"} · Added {formatDate(p.created_at)}
          </>
        ),
        primary: canUpdate ? { label: "Edit guest", onClick: () => api.edit(p) } : undefined,
        menu: !canUpdate
          ? []
          : [
              p.is_active
                ? {
                    label: "Switch off guest",
                    destructive: true,
                    onClick: () =>
                      api.confirm({
                        title: `Switch off ${fullName(p)}?`,
                        description: "They keep their registrations, but can't be registered for events until you switch them back on.",
                        confirmLabel: "Switch off guest",
                        onConfirm: () => changeStatus.mutate({ person: p, isActive: false }),
                      }),
                  }
                : {
                    label: "Switch on guest",
                    onClick: () =>
                      setSwitchOn({
                        title: `Switch on ${fullName(p)}?`,
                        description: "They can be registered for events again.",
                        confirmLabel: "Switch on guest",
                        onConfirm: () => changeStatus.mutate({ person: p, isActive: true }),
                      }),
                  },
            ],
      })}
      stats={(p) => [
        { label: "Phone", value: p.phone ?? "—" },
        { label: "Email", value: p.email ?? "—" },
        { label: "Country", value: p.country ?? "—" },
        { label: "Status", value: p.is_active ? "Active" : "Inactive" },
      ]}
      panel={(p) => (
        <div>
          <RecordHeading>Details</RecordHeading>
          <RecordKv
            items={[
              { label: "Organization", value: p.affiliation_name ?? "None" },
              { label: "Phone", value: p.phone ?? "Not set" },
              { label: "Email", value: p.email ?? "Not set" },
              { label: "Added", value: formatDate(p.created_at) },
            ]}
          />
        </div>
      )}
      page={{
        tabs: [
          { id: "overview", label: "Overview" },
          { id: "registrations", label: "Registrations" },
        ],
        content: (p, tab) =>
          tab === "registrations" ? (
            <GuestRegistrations organizationId={organizationId} personId={p.id} />
          ) : (
            <div>
              <RecordHeading>Details</RecordHeading>
              <RecordKv
                items={[
                  { label: "First name", value: p.first_name },
                  { label: "Last name", value: p.last_name ?? "Not set" },
                  { label: "Phone", value: p.phone ?? "Not set" },
                  { label: "Email", value: p.email ?? "Not set" },
                  { label: "Organization", value: p.affiliation_name ?? "None" },
                  { label: "Country", value: p.country ?? "Not set" },
                  { label: "Last changed", value: formatDate(p.updated_at) },
                ]}
              />
            </div>
          ),
        rail: (p) => (
          <RecordRailCard title="Guest">
            <RecordKv
              single
              items={[
                { label: "Guest ID", value: p.id },
                { label: "Status", value: status(p) },
                { label: "Has an account", value: p.user_id ? "Yes" : "No" },
                { label: "Added", value: formatDate(p.created_at) },
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

/** Guests are an organization's own: a platform role picks one in the switcher first. */
function GuestsScreen() {
  const organizationId = useOrganizationId();
  if (organizationId === undefined) return null;
  if (organizationId === null) return <NoOrganization what="Guests" />;
  return <GuestsView organizationId={organizationId} />;
}

export default function GuestsPage() {
  return (
    <Suspense>
      <GuestsScreen />
    </Suspense>
  );
}
