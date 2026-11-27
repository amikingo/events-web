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
import { RecordHeading, RecordKv, RecordRailCard } from "@/components/ui/record-view";
import { RecordWorkspace, parseRecordPath, recordPath } from "@/components/ui/record-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { describeApiError } from "@/lib/api/errors";
import { removeVenuePin, saveVenuePin } from "@/lib/api/venue-locations";
import type { VenuePin } from "@/lib/api/venue-locations";
import { createVenue, getVenue, listVenues, setVenueActive, updateVenue } from "@/lib/api/venues";
import type { Venue, VenueInput } from "@/lib/api/venues";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatDate, formatNumber } from "@/lib/format";
import { venueQk } from "@/lib/query-keys";
import { VenueForm } from "./venue-form";
import { VenuePinPreview, useVenuePin, venuePinQk } from "./venue-pin";

const BASE = "/admin/venues";
/** Venues belong to the Events module on the backend: whoever may change events may change venues. */
const MODULE = MODULE_CODES.EVENTS;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const place = (v: Venue) => [v.city, v.country].filter(Boolean).join(", ") || "—";
const status = (v: Venue) => <StatusPill kind="account" status={v.is_active ? "active" : "inactive"} />;
const capacityLabel = (v: Venue) => (v.capacity ? formatNumber(v.capacity) : "—");

const columns: ColumnDef<Venue>[] = [
  {
    key: "name",
    header: "Venue",
    primary: true,
    filterValue: (r) => r.name,
    accessor: (r) => (
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(r.name)} size={32} />
        <div className="flex min-w-0 flex-col">
          <span className="type-body font-medium text-text">{r.name}</span>
          <span className="type-body-sm text-text-faint">{r.address ?? "No address"}</span>
        </div>
      </div>
    ),
  },
  { key: "place", header: "City", accessor: place },
  { key: "capacity", header: "Capacity", numeric: true, accessor: capacityLabel },
  { key: "status", header: "Status", filterValue: (r) => (r.is_active ? "active" : "inactive"), render: status },
];




/** Change the address without rebuilding the page (so a record page loads once). */
function go(path: string) {
  window.history.pushState(null, "", path);
}

function VenuesView({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  const location = parseRecordPath(BASE, pathname);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // Switching something back on is harmless, so it gets the ordinary confirm (the workspace's own is the red, delete-style one).
  const [switchOn, setSwitchOn] = useState<{ title: string; description: string; confirmLabel: string; onConfirm: () => void } | null>(null);
  const params = { page, pageSize };

  const list = useQuery({
    queryKey: venueQk.list(organizationId, params),
    queryFn: ({ signal }) => listVenues(organizationId, params, signal),
    placeholderData: keepPreviousData,
  });

  // A record opened by link may not be on the current page: load it on its own.
  const openId = location.mode === "page" || location.mode === "edit" ? String(location.id) : null;
  const onPage = list.data?.data.some((v) => v.id === openId) ?? false;
  const detail = useQuery({
    queryKey: venueQk.detail(organizationId, openId ?? ""),
    queryFn: ({ signal }) => getVenue(organizationId, openId!, signal),
    enabled: Boolean(openId) && list.isSuccess && !onPage,
  });
  const rows = list.data?.data ?? [];
  const records = detail.data && !onPage ? [...rows, detail.data] : rows;

  /** After any change: every venue query of this organization is refetched. */
  const saved = () => void queryClient.invalidateQueries({ queryKey: venueQk.all(organizationId) });

  const create = useMutation({ mutationFn: (input: VenueInput) => createVenue(organizationId, input), onSuccess: saved });
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<VenueInput> }) => updateVenue(organizationId, id, changes),
    onSuccess: saved,
  });
  const changeStatus = useMutation({
    mutationFn: ({ venue, isActive }: { venue: Venue; isActive: boolean }) => setVenueActive(organizationId, venue.id, isActive),
    onSuccess: (venue) => {
      saved();
      toast.success(venue.is_active ? "Venue switched on" : "Venue switched off");
    },
    onError: (error) => toast.error("Couldn't change the venue", { body: describeApiError(error, "venue") }),
  });

  // The edit form starts from the venue's pin, so it is read before the form shows.
  const editingPin = useVenuePin(organizationId, location.mode === "edit" ? String(location.id) : null);

  /** Saves a changed pin after the venue itself; a failure says so without undoing the venue. */
  async function savePin(venueId: string, pin: VenuePin | null | undefined) {
    if (pin === undefined) return;
    try {
      if (pin) await saveVenuePin(organizationId, venueId, pin);
      else await removeVenuePin(organizationId, venueId);
      queryClient.setQueryData(venuePinQk(organizationId, venueId), { available: true, pin });
    } catch (error) {
      toast.error("The venue was saved, but not its map pin", { body: describeApiError(error, "venue") });
    }
  }

  if (list.isError) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load the venues"
        description={describeApiError(list.error, "venue")}
        actions={<Button onClick={() => void list.refetch()}>Try again</Button>}
      />
    );
  }

  const canUpdate = can("update", MODULE);
  const newVenue = (label: string, icon = false) => (
    <Can I="create" a={MODULE}>
      <Button onClick={() => go(`${BASE}/new`)}>
        {icon && <PlusIcon className="size-4" />}
        {label}
      </Button>
    </Can>
  );

  // Create and edit are their own full pages.
  if (location.mode === "create" || location.mode === "edit") {
    const existing = location.mode === "edit" ? records.find((r) => r.id === String(location.id)) : undefined;
    if (location.mode === "edit" && !existing) {
      if (list.isPending || detail.isPending) return null;
      return <EmptyState size="lg" title="This venue doesn't exist" description="It may have been removed. Go back to the list." />;
    }
    if (editingPin.loading) return <Skeleton shape="block" height={420} />;
    return (
      <VenueForm
        key={existing?.id ?? "new"}
        venue={existing}
        pin={existing ? editingPin.pin : null}
        pinAvailable={existing ? editingPin.available : true}
        onCancel={() => go(existing ? `${BASE}/${existing.id}` : BASE)}
        onSubmit={async (input, pin) => {
          try {
            if (existing) {
              // Send only what changed.
              const changes = Object.fromEntries(Object.entries(input).filter(([key, value]) => value !== existing[key as keyof Venue])) as Partial<VenueInput>;
              const saved = Object.keys(changes).length ? await update.mutateAsync({ id: existing.id, changes }) : existing;
              toast.success("Changes saved");
              await savePin(saved.id, pin);
              go(`${BASE}/${saved.id}`);
            } else {
              const created = await create.mutateAsync(input);
              toast.success("Venue added");
              await savePin(created.id, pin);
              go(`${BASE}/${created.id}`);
            }
          } catch (e) {
            // The form stays open and shows this message (a code-based one: API messages are technical).
            throw new Error(describeApiError(e, "venue"));
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
      records={records}
      getId={(v) => v.id}
      noun="venue"
      listLabel="Venues"
      location={location}
      // pushState (not router.push) changes the address without rebuilding the page, so the record page loads once.
      onLocationChange={(next) => go(recordPath(BASE, next))}
      list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
        <Table
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          title="Venues"
          loading={list.isPending}
          // Pages come from the server. The API can't search venues yet, so the table doesn't offer a search
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
            <EmptyState icon={<BuildingIcon />} title="No venues yet" description="Add the places you hold events, then pick them on each event." actions={newVenue("New venue")} />
          }
          toolbarActions={newVenue("New venue", true)}
          className="rounded-none border-none shadow-none"
        />
      )}
      identity={(v, api) => ({
        avatar: <Avatar initials={initialsOf(v.name)} size={48} />,
        name: v.name,
        status: status(v),
        meta: (
          <>
            {place(v)} · Added {formatDate(v.created_at)}
          </>
        ),
        primary: canUpdate ? { label: "Edit venue", onClick: () => api.edit(v) } : undefined,
        menu: !canUpdate
          ? []
          : [
              v.is_active
                ? {
                    label: "Switch off venue",
                    destructive: true,
                    onClick: () =>
                      api.confirm({
                        title: `Switch off ${v.name}?`,
                        description: "It can't be picked for new events until you switch it back on. Past events keep it.",
                        confirmLabel: "Switch off venue",
                        onConfirm: () => changeStatus.mutate({ venue: v, isActive: false }),
                      }),
                  }
                : {
                    label: "Switch on venue",
                    onClick: () =>
                      setSwitchOn({
                        title: `Switch on ${v.name}?`,
                        description: "It can be picked for events again.",
                        confirmLabel: "Switch on venue",
                        onConfirm: () => changeStatus.mutate({ venue: v, isActive: true }),
                      }),
                  },
            ],
      })}
      stats={(v) => [
        { label: "City", value: v.city ?? "—" },
        { label: "Country", value: v.country ?? "—" },
        { label: "Capacity", value: capacityLabel(v) },
        { label: "Status", value: v.is_active ? "Active" : "Inactive" },
      ]}
      panel={(v) => (
        <div>
          <RecordHeading>Details</RecordHeading>
          <RecordKv
            items={[
              { label: "Address", value: v.address ?? "Not set" },
              { label: "City", value: v.city ?? "Not set" },
              { label: "Country", value: v.country ?? "Not set" },
              { label: "Capacity", value: capacityLabel(v) },
            ]}
          />
        </div>
      )}
      page={{
        tabs: [{ id: "overview", label: "Overview" }],
        content: (v) => (
          <div>
            <RecordHeading>Details</RecordHeading>
            <RecordKv
              items={[
                { label: "Address", value: v.address ?? "Not set" },
                { label: "City", value: v.city ?? "Not set" },
                { label: "Country", value: v.country ?? "Not set" },
                { label: "Capacity", value: capacityLabel(v) },
                { label: "Last changed", value: formatDate(v.updated_at) },
              ]}
            />
            <RecordHeading>On the map</RecordHeading>
            <VenuePinPreview organizationId={organizationId} venueId={v.id} name={v.name} />
          </div>
        ),
        rail: (v) => (
          <RecordRailCard title="Venue">
            <RecordKv
              single
              items={[
                { label: "Venue ID", value: v.id },
                { label: "Status", value: status(v) },
                { label: "Added", value: formatDate(v.created_at) },
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

/** Venues are an organization's own: a platform role sees a prompt to switch to an organization role. */
function VenuesScreen() {
  const organizationId = useOrganizationId();
  if (organizationId === undefined) return null;
  if (organizationId === null) return <NoOrganization what="Venues" />;
  return <VenuesView organizationId={organizationId} />;
}

export default function VenuesPage() {
  return (
    <Suspense>
      <VenuesScreen />
    </Suspense>
  );
}
