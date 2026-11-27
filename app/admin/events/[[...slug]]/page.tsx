"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { NoOrganization, useOrganizationId } from "@/app/admin/_components/organization-scope";
import { Can, useModuleAccess } from "@/components/ability-provider";
import { Avatar } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCard } from "@/components/ui/alert-card";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { getRegistrationSummary } from "@/lib/api/registrations";
import type { EventInput, HolderFields, StaffEvent } from "@/lib/api/events";
import { getOrganization } from "@/lib/api/organizations";
import { listAllVenues } from "@/lib/api/venues";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatDate, formatNumber } from "@/lib/format";
import { clientQk, eventQk, organizationQk, registrationQk, venueQk } from "@/lib/query-keys";
import { formatDateShort, formatMomentFull, formatMomentShort } from "@/lib/ethiopian-datetime";
import { EventForm } from "./event-form";
import { CancelEventDialog, RescheduleDialog } from "./event-schedule";
import { CoverTab, TicketTypesTab, isEditable } from "./event-tabs";
import { DoorScreen } from "./door";
import { IssueTicketsForm } from "./issue-tickets-form";
import { OrderPage, OrdersTab } from "./orders-tab";
import { RegistrationsTab } from "./registrations-tab";
import { TicketDesignPage } from "./ticket-design-page";

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
/** One section of the Overview: a card with label-and-value rows, a thin line between them; long values wrap. */
function DetailCard({ title, rows }: { title: string; rows: { label: string; value: ReactNode }[] }) {
  return (
    <Card>
      <CardHeader title={title} />
      <dl className="m-0 flex flex-col divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-1 gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:gap-4">
            <dt className="type-body-sm text-text-soft">{r.label}</dt>
            <dd className="type-body m-0 break-words text-text">{r.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** "Name and mobile required · email, organization and country optional": a Detailed event's guest details in one line. */
function guestDetailsSummary(fields: HolderFields | undefined): string {
  if (!fields) return "Name and mobile required";
  if (fields.name === "HIDDEN") return "None: tickets are unnamed";
  const words: Record<keyof HolderFields, string> = { name: "name", mobile: "mobile", email: "email", affiliation: "organization", country: "country" };
  const list = (setting: string) => (Object.keys(words) as (keyof HolderFields)[]).filter((k) => fields[k] === setting).map((k) => words[k]);
  const join = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
  const required = list("REQUIRED");
  const optional = list("OPTIONAL");
  const parts = [required.length ? `${join(required)} required` : "", optional.length ? `${join(optional)} optional` : ""].filter(Boolean);
  const text = parts.join(" · ") || "None asked";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function changesFrom(input: EventInput, event: StaffEvent): Partial<EventInput> {
  const same = (key: keyof EventInput, value: unknown) => {
    const stored = event[key as keyof StaffEvent];
    if (key.endsWith("_at")) return (value === null && stored === null) || (typeof value === "string" && typeof stored === "string" && Date.parse(value) === Date.parse(stored));
    // holder_fields is an object: compare it by value, or every save would resend it.
    if (typeof value === "object" && value !== null) return JSON.stringify(value) === JSON.stringify(stored);
    return value === stored;
  };
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => !same(key as keyof EventInput, value))) as Partial<EventInput>;
}

function EventsView({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const router = useRouter();
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
  // Publishing isn't destructive, so it gets the ordinary confirm (the workspace's own confirm is the red, delete-style one).
  const [publishTarget, setPublishTarget] = useState<StaffEvent | null>(null);
  // Phase 9: cancelling and rescheduling have their own dialogs (the cancel one may ask about refunds).
  const [cancelTarget, setCancelTarget] = useState<StaffEvent | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<StaffEvent | null>(null);

  // Editing a published event: once a guest was let in, its schedule is locked (the API refuses a change).
  const editingId = location.mode === "edit" ? String(location.id) : null;
  const editSummary = useQuery({
    queryKey: registrationQk.summary(organizationId, editingId ?? ""),
    queryFn: ({ signal }) => getRegistrationSummary(organizationId, editingId!, signal),
    enabled: Boolean(editingId) && can("read", MODULE_CODES.REGISTRATIONS),
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

  // An event's own pages beyond the record: /events/{id}/issue (Issue tickets), /events/{id}/door (the door),
  // /events/{id}/design (Ticket design) and /events/{id}/orders/{orderId}.
  const [, sub, subId] = pathname.slice(BASE.length).split("/").filter(Boolean);
  if (openId && (sub === "issue" || sub === "door" || sub === "design" || (sub === "orders" && subId))) {
    const ev = events.find((e) => e.id === openId);
    if (!ev) {
      if (list.isPending || detail.isPending) return null;
      return <EmptyState size="lg" title="This event doesn't exist" description="It may have been removed. Go back to the list." />;
    }
    if (sub === "door") {
      if (!can("update", MODULE_CODES.REGISTRATIONS)) {
        return <EmptyState size="lg" title="You can't let guests in" description="Ask an admin for the Guests › update right." />;
      }
      return <DoorScreen event={ev} onBack={() => go(`${BASE}/${ev.id}`)} />;
    }
    if (sub === "design") {
      if (!canUpdate) {
        return <EmptyState size="lg" title="You can't design tickets" description="Ask an admin for the Events › update right." />;
      }
      return <TicketDesignPage event={ev} venueName={ev.venue_id ? (venues.find((v) => v.id === ev.venue_id)?.name ?? null) : null} onBack={() => go(`${BASE}/${ev.id}`)} />;
    }
    if (sub === "issue") {
      if (!can("create", MODULE_CODES.REGISTRATIONS)) {
        return <EmptyState size="lg" title="You can't issue tickets" description="Ask an admin for the Guests › create right." />;
      }
      return <IssueTicketsForm event={ev} onDone={(orderId) => go(orderId ? `${BASE}/${ev.id}/orders/${orderId}` : `${BASE}/${ev.id}`)} />;
    }
    return <OrderPage event={ev} orderId={subId!} />;
  }

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
        scheduleLocked={existing?.status === "PUBLISHED" && (editSummary.data?.checked_in ?? 0) > 0}
        onCancel={() => go(existing ? `${BASE}/${existing.id}` : BASE)}
        onSubmit={async (input, cover) => {
          let savedEvent: StaffEvent;
          try {
            if (existing) {
              const changes = changesFrom(input, existing);
              // A published event's schedule moves as one: start and end together, and the door time again when it
              // has one (else the API answers schedule_pair_required or doors_open_at_reconfirm).
              if (existing.status === "PUBLISHED" && ("starts_at" in changes || "ends_at" in changes || "doors_open_at" in changes)) {
                changes.starts_at = input.starts_at;
                changes.ends_at = input.ends_at;
                if (existing.doors_open_at || "doors_open_at" in changes) changes.doors_open_at = input.doors_open_at ?? null;
              }
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
    <>
    <RecordWorkspace
      fit
      inlineToasts={false}
      // A short list sizes to its rows; the record page, panel and forms keep a tall stage.
      // The record page scrolls inside the workspace: let it use the rest of the window instead of stopping short.
      className={location.mode === "list" ? undefined : "h-[calc(100vh-170px)] min-h-[520px]"}
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
        const cancelItem = { label: "Cancel event", destructive: true, onClick: () => setCancelTarget(e) };
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
        const design = { label: "Ticket design", onClick: () => go(`${BASE}/${e.id}/design`) };
        if (!canUpdate) return base;
        if (!isEditable(e)) return { ...base, secondary: design };
        if (e.status === "DRAFT") {
          return {
            ...base,
            primary: {
              label: "Publish event",
              onClick: () => setPublishTarget(e),
            },
            secondary: edit,
            menu: [design, cancelItem],
          };
        }
        return {
          ...base,
          primary: edit,
          secondary: design,
          menu: [
            { label: "Reschedule", onClick: () => setRescheduleTarget(e) },
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
          ...(can("read", MODULE_CODES.REGISTRATIONS) ? [{ id: "guests", label: "Guests" }, { id: "orders", label: "Orders" }] : []),
          { id: "cover", label: "Cover" },
        ],
        content: (e, tab) =>
          tab === "orders" ? (
            <OrdersTab event={e} />
          ) : tab === "guests" ? (
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
              {e.status === "CANCELLED" && (
                <AlertCard
                  tone="danger"
                  title="This event was cancelled"
                  time={e.cancelled_at ? formatMomentShort(e.cancelled_at, e.timezone) : undefined}
                  body={
                    e.refund_admitted_tickets
                      ? "Sales and the door are stopped. Every paid ticket is refunded, including tickets already used at the door."
                      : e.refund_admitted_tickets === false
                        ? "Sales and the door are stopped. Paid tickets that weren't used are refunded; used ones aren't."
                        : "Sales and the door are stopped. Paid tickets are refunded under Payments."
                  }
                  actions={
                    can("read", MODULE_CODES.PAYMENTS) ? (
                      <Button variant="secondary" onClick={() => router.push(`/admin/payments?event_id=${e.id}&kind=EVENT_CANCELLATION`)}>
                        Open refunds
                      </Button>
                    ) : undefined
                  }
                />
              )}
              {/* The strip above already shows the start date, visibility, capacity and creation date: not repeated here. */}
              <DetailCard
                title="When"
                rows={[
                  { label: "Starts", value: full(e.starts_at, e.timezone) },
                  { label: "Ends", value: full(e.ends_at, e.timezone) },
                  { label: "Doors open", value: e.doors_open_at ? full(e.doors_open_at, e.timezone) : "At the start" },
                  { label: "Timezone", value: e.timezone.replace(/_/g, " ") },
                ]}
              />
              <DetailCard
                title="Registration"
                rows={[
                  { label: "How people register", value: e.registration_mode === "QUICK" ? "Quick: one mobile per order, tickets can be unnamed" : "Detailed: each guest's details" },
                  ...(e.registration_mode === "QUICK" ? [] : [{ label: "Guest details", value: guestDetailsSummary(e.holder_fields) }]),
                  { label: "Per mobile number", value: e.purchase_limit_per_mobile ? `Up to ${formatNumber(e.purchase_limit_per_mobile)} tickets` : "No limit" },
                  { label: "Sign-ups open", value: e.registration_opens_at ? full(e.registration_opens_at, e.timezone) : "When published" },
                  { label: "Sign-ups close", value: e.registration_closes_at ? full(e.registration_closes_at, e.timezone) : "When the event ends" },
                ]}
              />
              <DetailCard
                title="About"
                rows={[
                  { label: "Category", value: e.category ?? "None" },
                  { label: "Venue", value: venueName(e.venue_id) },
                  { label: "Client", value: clientName(e.customer_account_id) },
                ]}
              />
              {e.description && (
                <Card>
                  <CardHeader title="Description" />
                  <p className="m-0 whitespace-pre-line type-body text-text-soft">{e.description}</p>
                </Card>
              )}
            </div>
          ),
        rail: (e) => (
          <RecordRailCard title="Event">
            <RecordKv
              single
              items={[
                { label: "Status", value: statusPill(e) },
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
    <ConfirmDialog
      open={publishTarget !== null}
      onOpenChange={(open) => !open && setPublishTarget(null)}
      tone="accent"
      icon={<Send />}
      title={publishTarget ? `Publish ${publishTarget.name}?` : ""}
      description={
        publishTarget?.visibility === "PUBLIC"
          ? "It appears on the public site, and its web address is fixed from now on."
          : "Only people with the link can register; it won't appear in the catalog. Switch it to Public to list it. Its web address is fixed from now on."
      }
      confirmLabel="Publish event"
      onConfirm={() => {
        const target = publishTarget;
        setPublishTarget(null);
        if (target) changeStatus.mutate({ event: target, status: "PUBLISHED" });
      }}
    />
    {/* Mounted only while open, so each opening starts from the event's current values. */}
    {cancelTarget && <CancelEventDialog key={cancelTarget.id} event={cancelTarget} open onClose={() => setCancelTarget(null)} />}
    {rescheduleTarget && <RescheduleDialog key={`${rescheduleTarget.id}-${rescheduleTarget.updated_at}`} event={rescheduleTarget} open onClose={() => setRescheduleTarget(null)} />}
    </>
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
