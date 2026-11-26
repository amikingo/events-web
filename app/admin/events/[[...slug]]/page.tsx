"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { NoOrganization, useOrganizationId } from "@/app/admin/_components/organization-scope";
import { Can, useModuleAccess } from "@/components/ability-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingIcon, PlusIcon, ScheduleIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { RecordHeading, RecordKv, RecordRailCard } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { describeApiError } from "@/lib/api/errors";
import { listAllClients } from "@/lib/api/clients";
import { createEvent, getEvent, listEvents, setEventStatus, updateEvent, uploadEventCover } from "@/lib/api/events";
import type { EventInput, StaffEvent } from "@/lib/api/events";
import { getOrganization } from "@/lib/api/organizations";
import { listAllVenues } from "@/lib/api/venues";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatDate, formatNumber } from "@/lib/format";
import { clientQk, eventQk, organizationQk, venueQk } from "@/lib/query-keys";
import { formatDateShort, formatMomentFull, formatMomentShort } from "@/lib/ethiopian-datetime";
import { EventForm } from "./event-form";
import { CoverTab, TicketTypesTab, isEditable } from "./event-tabs";
import { RegistrationsTab } from "./registrations-tab";

const BASE = "/admin/events";
const MODULE = MODULE_CODES.EVENTS;
const FALLBACK_TIMEZONE = "Africa/Addis_Ababa";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const statusPill = (e: StaffEvent) => <StatusPill kind="event" status={e.display_status} />;
const visibilityLabel = (e: StaffEvent) => (e.visibility === "PUBLIC" ? "Public" : "Link only");
const when = (e: StaffEvent) => (e.starts_at ? formatMomentShort(e.starts_at, e.timezone) : "Not set");
/** The full Ethiopian-first text on the record page; "Not set" while a draft has no date yet. */
const full = (iso: string | null, timeZone: string) => (iso ? formatMomentFull(iso, timeZone) : "Not set");

/** Change the address without rebuilding the page (so a record page loads once). */
function go(path: string) {
  window.history.pushState(null, "", path);
}

/** Only the fields that differ from the stored event. Instants are compared as moments, not strings. */
function changesFrom(input: EventInput, event: StaffEvent): Partial<EventInput> {
  const same = (key: keyof EventInput, value: unknown) => {
    const stored = event[key as keyof StaffEvent];
    if (key.endsWith("_at")) return (value === null && stored === null) || (typeof value === "string" && typeof stored === "string" && Date.parse(value) === Date.parse(stored));
    return value === stored;
  };
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => !same(key as keyof EventInput, value))) as Partial<EventInput>;
}

function EventsView({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  const location = parseRecordPath(BASE, pathname);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const params = { page, pageSize };

  const list = useQuery({
    queryKey: eventQk.list(organizationId, params),
    queryFn: ({ signal }) => listEvents(organizationId, params, signal),
    placeholderData: keepPreviousData,
  });

  // A record opened by link may not be on the current page: load it on its own.
  const openId = location.mode === "page" || location.mode === "edit" ? String(location.id) : null;
  const onPage = list.data?.data.some((e) => e.id === openId) ?? false;
  const detail = useQuery({
    queryKey: eventQk.detail(organizationId, openId ?? ""),
    queryFn: ({ signal }) => getEvent(organizationId, openId!, signal),
    enabled: Boolean(openId) && list.isSuccess && !onPage,
  });
  const rows = list.data?.data ?? [];
  const events = detail.data && !onPage ? [...rows, detail.data] : rows;

  // Venues and clients name what each event points at, and fill the form's pickers. A role without access to
  // clients simply doesn't load them (the API would answer 403).
  const venues = useQuery({ queryKey: venueQk.everyone(organizationId), queryFn: ({ signal }) => listAllVenues(organizationId, signal) }).data ?? [];
  const clients =
    useQuery({
      queryKey: clientQk.everyone(organizationId),
      queryFn: ({ signal }) => listAllClients(organizationId, signal),
      enabled: can("read", MODULE_CODES.CUSTOMERS),
    }).data ?? [];
  // The organization's timezone: new events' times are typed in it.
  const organization = useQuery({ queryKey: organizationQk.detail(organizationId), queryFn: ({ signal }) => getOrganization(organizationId, signal) }).data;
  const orgTimeZone = organization?.timezone ?? FALLBACK_TIMEZONE;

  /**
   * After any change: every event query of this organization is refetched, and so are its guest summaries and lists
   * (a capacity or status change moves "places left" and who can still register).
   */
  const saved = () => {
    void queryClient.invalidateQueries({ queryKey: eventQk.all(organizationId) });
    void queryClient.invalidateQueries({ queryKey: ["registrations", organizationId] });
  };

  const create = useMutation({ mutationFn: (input: EventInput) => createEvent(organizationId, input), onSuccess: saved });
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<EventInput> }) => updateEvent(organizationId, id, changes),
    onSuccess: saved,
  });
  const changeStatus = useMutation({
    mutationFn: ({ event, status }: { event: StaffEvent; status: "PUBLISHED" | "CLOSED" | "CANCELLED" }) => setEventStatus(organizationId, event.id, status),
    onSuccess: (_event, { status }) => {
      saved();
      toast.success(status === "PUBLISHED" ? "Event published" : status === "CLOSED" ? "Event closed" : "Event cancelled");
    },
    onError: (error, { status }) =>
      toast.error(status === "PUBLISHED" ? "Couldn't publish the event" : "Couldn't change the event", { body: describeApiError(error, "event") }),
  });

  if (list.isError) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load the events"
        description={describeApiError(list.error, "event")}
        actions={<Button onClick={() => void list.refetch()}>Try again</Button>}
      />
    );
  }

  const canUpdate = can("update", MODULE);
  const newEvent = (label: string, icon = false) => (
    <Can I="create" a={MODULE}>
      <Button onClick={() => go(`${BASE}/new`)}>
        {icon && <PlusIcon className="size-4" />}
        {label}
      </Button>
    </Can>
  );
  const venueName = (id: string | null) => (id ? (venues.find((v) => v.id === id)?.name ?? "A venue") : "No venue yet");
  const clientName = (id: string | null) => (id ? (clients.find((c) => c.id === id)?.name ?? "A client") : "Our own event");

  // Create and edit are their own full pages (the workspace's built-in form has no date and time fields).
  if (location.mode === "create" || location.mode === "edit") {
    const existing = location.mode === "edit" ? events.find((e) => e.id === String(location.id)) : undefined;
    if (location.mode === "edit" && !existing) {
      if (list.isPending || detail.isPending) return null;
      return <EmptyState size="lg" title="This event doesn't exist" description="It may have been removed. Go back to the list." />;
    }
    if (existing && !isEditable(existing)) {
      return <EmptyState size="lg" title="This event can't change any more" description="Closed and cancelled events keep their details as they were." />;
    }
    return (
      <EventForm
        key={existing?.id ?? "new"}
        event={existing}
        timeZone={existing?.timezone ?? orgTimeZone}
        organizationSlug={organization?.slug}
        venues={venues}
        clients={clients}
        onCancel={() => go(existing ? `${BASE}/${existing.id}` : BASE)}
        onSubmit={async (input, cover) => {
          let savedEvent: StaffEvent;
          try {
            if (existing) {
              const changes = changesFrom(input, existing);
              savedEvent = Object.keys(changes).length ? await update.mutateAsync({ id: existing.id, changes }) : existing;
            } else {
              savedEvent = await create.mutateAsync(input);
            }
          } catch (e) {
            throw new Error(describeApiError(e, "event"));
          }
          // The event is saved either way; a photo that fails to upload can be added again from the Cover tab.
          let coverFailed: unknown = null;
          if (cover) {
            try {
              await uploadEventCover(organizationId, savedEvent.id, cover);
              saved();
            } catch (e) {
              coverFailed = e;
            }
          }
          if (existing) toast.success("Changes saved");
          else toast.success("Event created", { body: "It's a draft with a General Admission ticket. Publish it when it's ready." });
          if (coverFailed) toast.error("The photo didn't upload", { body: `${describeApiError(coverFailed, "event")} Add it again from the Cover tab.` });
          go(`${BASE}/${savedEvent.id}`);
        }}
      />
    );
  }

  const columns: ColumnDef<StaffEvent>[] = [
    {
      key: "name",
      header: "Event",
      primary: true,
      sortable: true,
      filterValue: (r) => r.name,
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <Avatar initials={initialsOf(r.name)} size={32} />
          <div className="flex min-w-0 flex-col">
            <span className="type-body font-medium text-text">{r.name}</span>
            <span className="type-body-sm text-text-faint">{r.category ?? "No category"}</span>
          </div>
        </div>
      ),
    },
    { key: "when", header: "Starts", sortable: true, filterValue: (r) => r.starts_at ?? "", accessor: when },
    { key: "venue", header: "Venue", filterValue: (r) => venueName(r.venue_id), accessor: (r) => venueName(r.venue_id) },
    { key: "visibility", header: "Visibility", filterValue: visibilityLabel, render: (r) => <Pill>{visibilityLabel(r)}</Pill> },
    { key: "status", header: "Status", filterValue: (r) => r.display_status, render: statusPill },
  ];

  return (
    <RecordWorkspace
      fit
      inlineToasts={false}
      // A short list sizes to its rows; the record page, panel and forms keep a tall stage.
      className={location.mode === "list" ? undefined : "h-[calc(100vh-270px)] min-h-[520px]"}
      records={events}
      getId={(e) => e.id}
      noun="event"
      listLabel="Events"
      location={location}
      // pushState (not router.push) changes the address without rebuilding the page, so the record page loads once.
      onLocationChange={(next) => go(recordPath(BASE, next))}
      list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
        <Table
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          title="Events"
          loading={list.isPending}
          // Pages come from the server. The API can't search events yet, so the table doesn't offer a search
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
              icon={<ScheduleIcon />}
              title="No events yet"
              description="Create your first event. It stays a draft until you publish it."
              actions={newEvent("New event")}
            />
          }
          toolbarActions={
            <>
              <Button variant="secondary" onClick={() => go("/admin/venues")}>
                <BuildingIcon className="size-4" />
                Venues
              </Button>
              {newEvent("New event", true)}
            </>
          }
          className="rounded-none border-none shadow-none"
        />
      )}
      identity={(e, api) => {
        const edit = { label: "Edit event", onClick: () => go(`${BASE}/${e.id}/edit`) };
        const cancelItem = {
          label: "Cancel event",
          destructive: true,
          onClick: () =>
            api.confirm({
              title: `Cancel ${e.name}?`,
              description: "This can't be undone. The event can't change after this, and its public page will say it's cancelled.",
              confirmLabel: "Cancel event",
              onConfirm: () => changeStatus.mutate({ event: e, status: "CANCELLED" }),
            }),
        };
        const base = {
          avatar: <Avatar initials={initialsOf(e.name)} size={48} />,
          name: e.name,
          status: statusPill(e),
          meta: (
            <>
              <code>{e.slug}</code> · {when(e)}
            </>
          ),
        };
        if (!canUpdate || !isEditable(e)) return base;
        if (e.status === "DRAFT") {
          return {
            ...base,
            primary: {
              label: "Publish event",
              onClick: () =>
                api.confirm({
                  title: `Publish ${e.name}?`,
                  description:
                    e.visibility === "PUBLIC"
                      ? "It appears on the public site, and its web address is fixed from now on."
                      : "This event won't appear in the catalog: only people with the link can register. Switch it to Public to list it. Its web address is fixed from now on.",
                  confirmLabel: "Publish event",
                  onConfirm: () => changeStatus.mutate({ event: e, status: "PUBLISHED" }),
                }),
            },
            secondary: edit,
            menu: [cancelItem],
          };
        }
        return {
          ...base,
          primary: edit,
          menu: [
            {
              label: "Close event",
              onClick: () =>
                api.confirm({
                  title: `Close ${e.name}?`,
                  description: "This can't be undone. Sign-ups stop and the event can't change after this. To pause sign-ups instead, set when they close.",
                  confirmLabel: "Close event",
                  onConfirm: () => changeStatus.mutate({ event: e, status: "CLOSED" }),
                }),
            },
            cancelItem,
          ],
        };
      }}
      stats={(e) => [
        { label: "Starts", value: e.starts_at ? formatDateShort(e.starts_at, e.timezone) : "Not set" },
        { label: "Visibility", value: visibilityLabel(e) },
        { label: "Capacity", value: e.capacity ? formatNumber(e.capacity) : "No limit" },
        { label: "Created", value: formatDate(e.created_at, { year: false }) },
      ]}
      panel={(e) => (
        <div>
          <RecordHeading>Details</RecordHeading>
          <RecordKv
            items={[
              { label: "Starts", value: full(e.starts_at, e.timezone) },
              { label: "Ends", value: full(e.ends_at, e.timezone) },
              { label: "Venue", value: venueName(e.venue_id) },
              { label: "Client", value: clientName(e.customer_account_id) },
              { label: "Category", value: e.category ?? "None" },
              { label: "Web address", value: e.slug },
            ]}
          />
        </div>
      )}
      page={{
        tabs: [
          { id: "overview", label: "Overview" },
          { id: "tickets", label: "Ticket types" },
          // The guest list needs the Guests module (REGISTRATIONS): a role without it never sees the tab.
          ...(can("read", MODULE_CODES.REGISTRATIONS) ? [{ id: "guests", label: "Guests" }] : []),
          { id: "cover", label: "Cover" },
        ],
        content: (e, tab) =>
          tab === "guests" ? (
            <RegistrationsTab
              event={e}
              canCreate={can("create", MODULE_CODES.REGISTRATIONS)}
              canUpdate={can("update", MODULE_CODES.REGISTRATIONS)}
              canExport={can("export", MODULE_CODES.REGISTRATIONS)}
            />
          ) : tab === "tickets" ? (
            <TicketTypesTab event={e} canUpdate={canUpdate} />
          ) : tab === "cover" ? (
            <CoverTab event={e} canUpdate={canUpdate} />
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <RecordHeading>When</RecordHeading>
                <RecordKv
                  items={[
                    { label: "Starts", value: full(e.starts_at, e.timezone) },
                    { label: "Ends", value: full(e.ends_at, e.timezone) },
                    { label: "Sign-ups open", value: e.registration_opens_at ? full(e.registration_opens_at, e.timezone) : "When published" },
                    { label: "Sign-ups close", value: e.registration_closes_at ? full(e.registration_closes_at, e.timezone) : "When the event ends" },
                    { label: "Timezone", value: e.timezone.replace(/_/g, " ") },
                  ]}
                />
              </div>
              <div>
                <RecordHeading>About</RecordHeading>
                <RecordKv
                  items={[
                    { label: "Category", value: e.category ?? "None" },
                    { label: "Venue", value: venueName(e.venue_id) },
                    { label: "Client", value: clientName(e.customer_account_id) },
                    { label: "Capacity", value: e.capacity ? formatNumber(e.capacity) : "No limit" },
                  ]}
                />
              </div>
              {e.description && (
                <div>
                  <RecordHeading>Description</RecordHeading>
                  <p className="m-0 whitespace-pre-line type-body-sm text-text-soft">{e.description}</p>
                </div>
              )}
            </div>
          ),
        rail: (e) => (
          <RecordRailCard title="Event">
            <RecordKv
              single
              items={[
                { label: "Status", value: statusPill(e) },
                { label: "Visibility", value: visibilityLabel(e) },
                { label: "Web address", value: e.slug },
                { label: "First published", value: e.published_at ? formatDate(e.published_at) : "Not yet" },
                { label: "Event ID", value: e.id },
              ]}
            />
          </RecordRailCard>
        ),
      }}
      form={{
        // Not used: create and edit are full pages above. The workspace needs a form for its own create/edit states.
        sections: [],
        toValues: () => ({}),
        onSave: (_values, existing) => {
          if (existing) return existing;
          throw new Error("Use the New event page.");
        },
      }}
    />
  );
}

/** Events are an organization's own: a platform role picks one in the switcher first. */
function EventsScreen() {
  const organizationId = useOrganizationId();
  if (organizationId === undefined) return null;
  if (organizationId === null) return <NoOrganization what="Events" />;
  return <EventsView organizationId={organizationId} />;
}

export default function EventsPage() {
  return (
    <Suspense>
      <EventsScreen />
    </Suspense>
  );
}
