"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, DoorOpen, Receipt, RotateCcw, Ticket, Undo2, UserCheck, UserX, Users } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardGrid, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { DownloadIcon, UserIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { isValidEthiopianPhone, PhoneInput } from "@/components/ui/phone-input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RecordRows } from "@/components/ui/record-view";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectCard } from "@/components/ui/select-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { TextLink } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toaster";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api-client";
import { listTicketTypes } from "@/lib/api/events";
import type { StaffEvent } from "@/lib/api/events";
import { describeApiError, paymentRequiredMessage } from "@/lib/api/errors";
import { listPersons } from "@/lib/api/persons";
import type { Person, RegistrationStatus } from "@/lib/api/persons";
import {
  changeRegistrationTicketType,
  downloadGuestList,
  getRegistrationSummary,
  listRegistrations,
  registerGuest,
  setRegistrationStatus,
} from "@/lib/api/registrations";
import type { Registration } from "@/lib/api/registrations";
import { formatNumber } from "@/lib/format";
import { eventQk, personQk, registrationQk } from "@/lib/query-keys";
import { BUYER_MOBILE_REQUIRED, nationalMobile } from "@/lib/checkout";
import { formatPrice, isFreePrice } from "@/lib/price";
import { useAtTime } from "@/lib/use-at-time";
import { formatMomentShort } from "@/lib/ethiopian-datetime";
import { ReturnTicketDialog } from "./return-ticket";

const PAGE_SIZE = 20;
/** `+251911…`, `0911…` or `911…` with any spaces: an Ethiopian mobile, which a capped event counts places by. */
const isEthiopianMobile = (phone: string | null | undefined) => Boolean(phone && /^(\+?251|0)?[79]\d{8}$/.test(phone.replace(/[\s()-]/g, "")));

/** A guest's name; an unnamed ticket (a Quick event's order) has no guest yet. */
const fullName = (p: { first_name: string; last_name: string | null } | null) => (p ? [p.first_name, p.last_name].filter(Boolean).join(" ") : "Unnamed ticket");
/** "Abebe Kebede" → "Abebe Kebede's", for "Return Abebe Kebede's ticket?"; an unnamed ticket reads "this unnamed". */
const possessive = (name: string) => (name === "Unnamed ticket" ? "this unnamed" : `${name}'s`);

/** "12 of 50 places taken", or "12 confirmed" when there is no limit. */
function placesLabel(confirmed: number, capacity: number | null): string {
  return capacity === null ? `${formatNumber(confirmed)} confirmed · no limit` : `${formatNumber(confirmed)} of ${formatNumber(capacity)} places taken`;
}

interface RegisterFormProps {
  event: StaffEvent;
  ticketTypes: { id: string; code: string; name: string }[];
  onDone: () => void;
}

/** Register a guest: pick someone already in the guest list, or type a new guest. Shown inline: it's a short form, not a record. */
function RegisterForm({ event, ticketTypes, onDone }: RegisterFormProps) {
  const queryClient = useQueryClient();
  const orgId = event.organization_id;
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [fields, setFields] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Person | null>(null);
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [errors, setErrors] = useState<{ firstName?: string; phone?: string; person?: string; ticket?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  // An event with a per-mobile limit counts every place against an Ethiopian mobile, so one is always needed (Phase 8).
  const capped = Boolean(event.purchase_limit_per_mobile);

  // The summary lists every active type (staff-only ones included) but not prices: those come from the ticket types.
  const ticketDetails = useQuery({ queryKey: eventQk.tickets(orgId, event.id), queryFn: ({ signal }) => listTicketTypes(orgId, event.id, signal) });
  const detailsOf = (id: string) => ticketDetails.data?.find((t) => t.id === id);
  /** Paid types are issued through checkout, not here (the API answers 409 payment_required). */
  const currentPrice = (id: string) => detailsOf(id)?.effective_price ?? detailsOf(id)?.price;
  const isPaid = (id: string) => !isFreePrice(currentPrice(id));
  // A scheduled price starts or ends while the form is open: fetch the prices again.
  useAtTime((ticketDetails.data ?? []).map((t) => t.price_valid_until), () => void ticketDetails.refetch());
  /** Phase 11: the API refused because the type costs something now: offer an order instead. */
  const [needsOrder, setNeedsOrder] = useState(false);
  const issuable = ticketTypes.filter((t) => !isPaid(t.id));
  const showTicketChoice = ticketTypes.length > 1 || issuable.length === 0;

  const q = useDebouncedValue(search.trim(), 300);
  const found = useQuery({
    queryKey: personQk.list(orgId, { page: 1, pageSize: 5, q }),
    queryFn: ({ signal }) => listPersons(orgId, { page: 1, pageSize: 5, q }, signal),
    enabled: mode === "existing" && q.length >= 2 && !picked,
  });

  const register = useMutation({
    // A new key per press: the same key would return the first submission's result for a changed form.
    mutationFn: () =>
      registerGuest(
        orgId,
        event.id,
        {
          ...(mode === "existing"
            ? { person_id: picked!.id }
            : {
                person: {
                  first_name: fields.firstName.trim(),
                  last_name: fields.lastName.trim() || null,
                  phone: fields.phone ? `+251${fields.phone.replace(/\D/g, "")}` : null,
                  email: fields.email.trim() || null,
                },
              }),
          ...(ticketTypes.length > 1 ? { ticket_type_id: ticketTypeId } : {}),
        },
        crypto.randomUUID(),
      ),
    onSuccess: ({ registration, placeTaken }) => {
      void queryClient.invalidateQueries({ queryKey: registrationQk.all(orgId, event.id) });
      void queryClient.invalidateQueries({ queryKey: personQk.all(orgId) });
      if (placeTaken) toast.success("Guest registered", { body: `Their code is ${registration.code}.` });
      else toast.info("Already registered", { body: `${fullName(registration.person)} already has this place. Nothing changed.` });
      onDone();
    },
    onError: (error) => {
      const issues = error instanceof ApiError ? ((error.details as { issues?: { code?: string }[] } | undefined)?.issues ?? []) : [];
      if (error instanceof ApiError && error.code === "payment_required") {
        void ticketDetails.refetch();
        setNeedsOrder(true);
        setFailure(paymentRequiredMessage(error, (iso) => formatMomentShort(iso, event.timezone)));
        return;
      }
      setNeedsOrder(false);
      setFailure(issues.some((i) => i.code === "buyer_mobile_required") ? BUYER_MOBILE_REQUIRED : describeApiError(error, "guest"));
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      firstName: mode === "new" && !fields.firstName.trim() ? "Enter the guest's first name." : undefined,
      phone:
        mode !== "new"
          ? undefined
          : fields.phone
            ? isValidEthiopianPhone(fields.phone)
              ? undefined
              : capped
                ? "Enter all nine digits, starting with 9 or 7."
                : "Enter all nine digits, starting with 9 or 7, or leave it empty."
            : capped
              ? BUYER_MOBILE_REQUIRED
              : undefined,
      person:
        mode === "existing" && !picked
          ? "Search for the guest and select them."
          : mode === "existing" && capped && !isEthiopianMobile(picked?.phone)
            ? "This event limits tickets per mobile number, and this guest has no Ethiopian mobile. Add one to their profile first."
            : undefined,
      ticket: issuable.length === 0 ? "Paid tickets go through checkout." : ticketTypes.length > 1 && !ticketTypeId ? "Choose a ticket type." : undefined,
    };
    setErrors(next);
    if (next.firstName || next.phone || next.person || next.ticket) return;
    setFailure(null);
    register.mutate();
  }

  return (
    <Card>
      <CardHeader title="Register a guest" subtitle="They follow the same rules as the public form: the event must be open and have a place left." />
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {failure && (
          <ErrorBanner>
            {failure}
            {needsOrder && (
              <>
                {" "}
                <button type="button" className="font-semibold underline" onClick={() => window.history.pushState(null, "", `/admin/events/${event.id}/issue`)}>
                  Create an order
                </button>
              </>
            )}
          </ErrorBanner>
        )}
        <SegmentedControl
          aria-label="Guest"
          value={mode}
          onValueChange={(v) => {
            setMode(v as "new" | "existing");
            setFailure(null);
            setErrors({});
          }}
          options={[
            { value: "new", label: "New guest" },
            { value: "existing", label: "Existing guest" },
          ]}
        />

        {mode === "new" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="First name" htmlFor="rg-first" required error={errors.firstName}>
              <Input id="rg-first" value={fields.firstName} error={!!errors.firstName} onChange={(e) => setFields((f) => ({ ...f, firstName: e.target.value }))} autoComplete="off" />
            </Field>
            <Field label="Last name" htmlFor="rg-last">
              <Input id="rg-last" value={fields.lastName} onChange={(e) => setFields((f) => ({ ...f, lastName: e.target.value }))} autoComplete="off" />
            </Field>
            <Field
              label="Mobile number"
              htmlFor="rg-phone"
              required={capped}
              error={errors.phone}
              hint={capped ? `Required: this event allows ${event.purchase_limit_per_mobile} tickets per mobile number.` : "Optional. Their confirmation SMS goes here."}
            >
              <PhoneInput id="rg-phone" value={fields.phone} error={!!errors.phone} onValueChange={(phone) => setFields((f) => ({ ...f, phone }))} autoComplete="off" />
            </Field>
            <Field label="Email" htmlFor="rg-email">
              <Input id="rg-email" type="email" value={fields.email} onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))} autoComplete="off" />
            </Field>
          </div>
        ) : picked ? (
          <Field label="Guest" error={errors.person}>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div className="flex min-w-0 flex-col">
                <span className="type-body font-medium text-text">{fullName(picked)}</span>
                <span className="type-body-sm text-text-faint">{picked.phone ?? picked.email ?? "No contact details"}</span>
              </div>
              <TextLink soft onClick={() => setPicked(null)}>
                Change
              </TextLink>
            </div>
          </Field>
        ) : (
          <Field label="Find the guest" htmlFor="rg-search" error={errors.person} hint="Search by name, phone or email. Check it's the same person before you select them.">
            <Input id="rg-search" value={search} error={!!errors.person} onChange={(e) => setSearch(e.target.value)} placeholder="Hana, 0911…, hana@…" autoComplete="off" />
            {q.length >= 2 && (
              <div className="mt-2">
                {found.isPending ? (
                  <Skeleton shape="block" />
                ) : found.isError ? (
                  <p className="type-body-sm m-0 text-danger">{describeApiError(found.error, "guest")}</p>
                ) : found.data.data.length === 0 ? (
                  <p className="type-body-sm m-0 text-text-faint">Nobody matches. Switch to &quot;New guest&quot; to add them.</p>
                ) : (
                  <RecordRows
                    rows={found.data.data.map((p) => ({
                      title: fullName(p),
                      meta: [p.phone, p.email, p.affiliation_name].filter(Boolean).join(" · ") || "No contact details",
                      trailing: (
                        <TextLink
                          onClick={() => {
                            setPicked(p);
                            setErrors({});
                          }}
                        >
                          Select
                        </TextLink>
                      ),
                    }))}
                  />
                )}
              </div>
            )}
          </Field>
        )}

        {showTicketChoice && (
          <Field label="Ticket type" required error={errors.ticket} hint={issuable.length === 0 ? "This event only has paid ticket types. Paid tickets go through checkout." : undefined}>
            <div role="radiogroup" aria-label="Ticket type" className="flex flex-col gap-2">
              {ticketTypes.map((t) => {
                const details = detailsOf(t.id);
                const paid = isPaid(t.id);
                const staffOnly = details?.audience === "STAFF_ONLY";
                return (
                  <SelectCard
                    key={t.id}
                    disabled={paid}
                    selected={ticketTypeId === t.id}
                    onClick={() => setTicketTypeId(t.id)}
                    title={t.name}
                    subtitle={paid ? "Paid tickets go through checkout" : staffOnly ? "Staff only" : undefined}
                    value={details ? formatPrice(currentPrice(t.id)!, details.currency) : undefined}
                  />
                );
              })}
            </div>
          </Field>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" loading={register.isPending} loadingLabel="Registering" disabled={issuable.length === 0}>
            Register guest
          </Button>
          <Button type="button" variant="secondary" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** An event's guest list: places left, who is registered, register a guest, change ticket type, cancel, or export CSV. */
export function RegistrationsTab({
  event,
  canCreate,
  canUpdate,
  canExport,
}: {
  event: StaffEvent;
  canCreate: boolean;
  canUpdate: boolean;
  canExport: boolean;
}) {
  const queryClient = useQueryClient();
  const orgId = event.organization_id;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  // All / Confirmed / Cancelled, or Checked in / Not in yet at the door (Phase 8).
  const [status, setStatus] = useState<"ALL" | RegistrationStatus | "IN" | "NOT_IN">("ALL");
  const [search, setSearch] = useState("");
  const [registering, setRegistering] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<Registration | null>(null);
  const [ticketTarget, setTicketTarget] = useState<Registration | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [downloading, setDownloading] = useState(false);

  const q = useDebouncedValue(search.trim(), 300);
  const params = {
    page,
    pageSize,
    status: status === "ALL" || status === "IN" || status === "NOT_IN" ? undefined : status,
    checkedIn: status === "IN" ? true : status === "NOT_IN" ? false : undefined,
    q: q || undefined,
  };

  const summary = useQuery({ queryKey: registrationQk.summary(orgId, event.id), queryFn: ({ signal }) => getRegistrationSummary(orgId, event.id, signal) });
  // The Cancelled tile: one row is asked for, only the total is read.
  const cancelledParams = { page: 1, pageSize: 1, status: "CANCELLED" as const };
  const cancelled = useQuery({ queryKey: registrationQk.list(orgId, event.id, cancelledParams), queryFn: ({ signal }) => listRegistrations(orgId, event.id, cancelledParams, signal) });
  const list = useQuery({
    queryKey: registrationQk.list(orgId, event.id, params),
    queryFn: ({ signal }) => listRegistrations(orgId, event.id, params, signal),
    placeholderData: keepPreviousData,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: registrationQk.all(orgId, event.id) });
  const refreshSummary = () => void queryClient.invalidateQueries({ queryKey: registrationQk.summary(orgId, event.id) });

  const change = useMutation({
    mutationFn: ({ registration, to }: { registration: Registration; to: RegistrationStatus }) => setRegistrationStatus(orgId, event.id, registration.id, to),
    onSuccess: (registration) => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: personQk.all(orgId) });
      toast.success(registration.status === "CANCELLED" ? "Registration cancelled" : "Guest brought back", {
        body: registration.status === "CANCELLED" ? "Their place is free again." : `Their code is still ${registration.code}.`,
      });
    },
    onError: (error, { registration, to }) => {
      if (error instanceof ApiError && error.code === "payment_required") {
        // Phase 11: a ticket that was paid for can't come back free; otherwise its type costs something right now.
        const paidBefore = to === "CONFIRMED" && !isFreePrice(registration.price.amount);
        toast.error("Couldn't bring the guest back", {
          body: paidBefore
            ? "This ticket was paid for, so it can't come back for free. Sell a new ticket through an order."
            : paymentRequiredMessage(error, (iso) => formatMomentShort(iso, event.timezone)),
          actions: [{ label: "Create an order", onClick: () => window.history.pushState(null, "", `/admin/events/${event.id}/issue`) }],
        });
        return;
      }
      toast.error("Couldn't change the registration", { body: describeApiError(error, "registration") });
    },
  });

  const changeTicket = useMutation({
    mutationFn: ({ registrationId, ticketTypeId }: { registrationId: string; ticketTypeId: string; ticketTypeName: string }) =>
      changeRegistrationTicketType(orgId, event.id, registrationId, ticketTypeId),
    onSuccess: () => {
      setTicketTarget(null);
      setSelectedTicketId("");
      toast.success("Ticket type changed");
      refresh();
    },
    onError: (error, variables) => {
      refreshSummary();
      if (error instanceof ApiError) {
        if (error.code === "payment_required") {
          setTicketTarget(null);
          setSelectedTicketId("");
          toast.error(`Couldn't move to ${variables.ticketTypeName}`, {
            body: paymentRequiredMessage(error, (iso) => formatMomentShort(iso, event.timezone)),
            actions: [{ label: "Create an order", onClick: () => window.history.pushState(null, "", `/admin/events/${event.id}/issue`) }],
          });
          return;
        }
        if (error.code === "capacity_reached" && (error.details as { scope?: string } | undefined)?.scope === "TICKET_TYPE") {
          setSelectedTicketId("");
          toast.error(`${variables.ticketTypeName} is full. Choose another one.`);
          return;
        }
        if (error.code === "ticket_type_inactive") {
          setSelectedTicketId("");
          toast.error("This ticket type is switched off. Choose another one.");
          return;
        }
        if (error.code === "registration_cancelled") {
          setTicketTarget(null);
          setSelectedTicketId("");
          refresh();
          toast.error("This guest's registration is cancelled. Bring them back first.");
          return;
        }
        if (error.code === "invalid_event_state") {
          setTicketTarget(null);
          setSelectedTicketId("");
          toast.error("Ticket types can only be changed while the event is published.");
          return;
        }
        if (error.code === "permission_denied") {
          setTicketTarget(null);
          setSelectedTicketId("");
          toast.error(describeApiError(error, "registration"));
          return;
        }
      }
      toast.error(describeApiError(error, "registration"));
    },
  });

  async function handleDownloadCsv() {
    setDownloading(true);
    try {
      const blob = await downloadGuestList(orgId, event.id, {
        status: params.status,
        q: q || undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${event.slug}-guests.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Guest list downloaded");
    } catch (error) {
      toast.error(describeApiError(error, "registration"));
    } finally {
      setDownloading(false);
    }
  }

  const activeTickets = (summary.data?.ticket_types ?? []).filter((t) => t.is_active);
  // Cancelling is allowed while the event is published or closed; bringing a guest back repeats every check.
  const canChange = canUpdate && (event.status === "PUBLISHED" || event.status === "CLOSED");
  const canChangeTicketType = canUpdate && event.status === "PUBLISHED" && activeTickets.length > 1;
  const showRegister = canCreate && event.status === "PUBLISHED";
  const issue = () => window.history.pushState(null, "", `/admin/events/${event.id}/issue`);
  const rows = list.data?.data ?? [];

  const chosenTicket = activeTickets.find((t) => t.id === selectedTicketId);

  const openOrder = (r: Registration) => window.history.pushState(null, "", `/admin/events/${event.id}/orders/${r.order.id}`);
  const initials = (r: Registration) =>
    r.person ? `${r.person.first_name[0] ?? ""}${r.person.last_name?.[0] ?? ""}`.toUpperCase() || "?" : "?";

  const columns: ColumnDef<Registration>[] = [
    {
      key: "guest",
      header: "Guest",
      primary: true,
      filterValue: (r) => fullName(r.person),
      accessor: (r) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar initials={initials(r)} size={32} />
          <div className="flex min-w-0 flex-col">
            <span className={r.person ? "type-body truncate font-medium text-text" : "type-body truncate font-medium text-text-soft"}>{fullName(r.person)}</span>
            <span className="type-body-sm truncate text-text-faint">
              {r.person ? (r.person.phone ? nationalMobile(r.person.phone) : (r.person.email ?? "No contact")) : `Bought by ${r.order.buyer_mobile ? nationalMobile(r.order.buyer_mobile) : "an unknown mobile"}`}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "ticket",
      header: "Ticket",
      filterValue: (r) => `${r.ticket_type.name} ${r.code}`,
      accessor: (r) => (
        <div className="flex flex-col">
          <span className="type-body text-text">{r.ticket_type.name}</span>
          <code className="type-body-sm font-mono text-text-soft">{r.code}</code>
        </div>
      ),
    },
    {
      key: "order",
      header: "Order",
      filterValue: (r) => r.order.reference,
      accessor: (r) => (
        <TextLink
          onClick={(e) => {
            e.stopPropagation();
            openOrder(r);
          }}
        >
          {r.order.reference}
        </TextLink>
      ),
    },
    { key: "source", header: "From", filterValue: (r) => r.source, accessor: (r) => (r.source === "PUBLIC" ? "Online" : "Staff") },
    { key: "registered", header: "Registered", filterValue: (r) => r.registered_at, accessor: (r) => formatMomentShort(r.registered_at, event.timezone) },
    {
      key: "door",
      header: "Door",
      filterValue: (r) => r.checked_in_at ?? "",
      render: (r) =>
        r.checked_in_at ? (
          <span className="inline-flex flex-col items-start gap-0.5" title={`Let in ${formatMomentShort(r.checked_in_at, event.timezone)}`}>
            <StatusPill kind="booking" status="checked-in" />
            <span className="type-body-sm text-text-faint">{formatMomentShort(r.checked_in_at, event.timezone)}</span>
          </span>
        ) : (
          <span className="type-body-sm text-text-faint">Not yet</span>
        ),
    },
    { key: "sms", header: "SMS", filterValue: (r) => r.confirmation?.status ?? "none", render: (r) => (r.confirmation ? <StatusPill kind="message" status={r.confirmation.status} /> : <span className="type-body-sm text-text-faint">None</span>) },
    { key: "status", header: "Status", filterValue: (r) => r.status, render: (r) => <StatusPill kind="registration" status={r.status} /> },
  ];

  const taken = summary.data?.confirmed ?? 0;
  const capacity = summary.data?.capacity ?? null;
  const remaining = summary.data?.remaining ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* At a glance: who's coming, room left, cancellations, orders. */}
      <CardGrid size="narrow">
        <KpiCard
          label="Confirmed"
          value={formatNumber(taken)}
          unit={capacity !== null ? `of ${formatNumber(capacity)}` : undefined}
          icon={<UserCheck />}
          iconTone="success"
          loading={summary.isPending}
        />
        <KpiCard label="Places left" value={remaining === null ? "No limit" : formatNumber(remaining)} icon={<Users />} iconTone={remaining === 0 ? "danger" : "accent"} loading={summary.isPending} />
        <KpiCard label="Cancelled" value={formatNumber(cancelled.data?.totalItems ?? 0)} icon={<UserX />} iconTone="charcoal" loading={cancelled.isPending} />
        <KpiCard
          label="Checked in"
          value={formatNumber(summary.data?.checked_in ?? 0)}
          unit={taken ? `of ${formatNumber(taken)}` : undefined}
          icon={<DoorOpen />}
          iconTone="success"
          loading={summary.isPending}
        />
      </CardGrid>

      {summary.isError && <p className="type-body-sm m-0 text-danger">{describeApiError(summary.error, "event")}</p>}

      {/* How full the event is, and each ticket type when there are several. */}
      {summary.data && (capacity !== null || summary.data.ticket_types.length > 1) && (
        <Card>
          <div className="flex flex-col gap-4">
            {capacity !== null && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="type-body m-0 font-semibold text-text">{placesLabel(taken, capacity)}</p>
                  <p className={remaining === 0 ? "type-body-sm m-0 font-semibold text-danger" : "type-body-sm m-0 text-text-soft"}>{remaining === 0 ? "The event is full" : `${formatNumber(remaining ?? 0)} left`}</p>
                </div>
                <ProgressBar value={capacity ? Math.min(100, (taken / capacity) * 100) : 0} tone={remaining === 0 ? "danger" : "success"} aria-label="Places taken" />
              </div>
            )}
            {summary.data.ticket_types.length > 1 && (
              <ul className={capacity !== null ? "m-0 flex list-none flex-col gap-3 border-t border-border p-0 pt-4" : "m-0 flex list-none flex-col gap-3 p-0"}>
                {summary.data.ticket_types.map((t) => (
                  <li key={t.id} className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className={t.is_active ? "type-body-sm font-medium text-text" : "type-body-sm text-text-faint"}>
                        {t.name}
                        {!t.is_active && " · switched off"}
                      </span>
                      <span className="type-body-sm text-text-soft">{t.capacity === null ? `${formatNumber(t.confirmed)} taken · shares the event's places` : `${formatNumber(t.confirmed)} of ${formatNumber(t.capacity)}`}</span>
                    </div>
                    {t.capacity !== null && <ProgressBar height={4} value={t.capacity ? Math.min(100, (t.confirmed / t.capacity) * 100) : 0} tone={t.remaining === 0 ? "danger" : "success"} aria-label={`${t.name} places taken`} />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {registering && <RegisterForm event={event} ticketTypes={activeTickets} onDone={() => setRegistering(false)} />}
      {canCreate && event.status === "DRAFT" && <p className="type-body-sm m-0 text-text-faint">Publish the event to start registering guests.</p>}

      {list.isError ? (
        <EmptyState size="sm" tone="danger" title="We couldn't load the guest list" description={describeApiError(list.error, "registration")} actions={<Button onClick={() => void list.refetch()}>Try again</Button>} />
      ) : (
        <Table
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          title="Guest list"
          loading={list.isPending}
          // Server-side search and status filter: the table only shows what the API returned.
          searchable
          searchPlaceholder="Name, phone or code"
          searchQuery={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchFn={() => true}
          quickFilters={[
            { label: "All", value: "ALL", predicate: () => true },
            { label: "Confirmed", value: "CONFIRMED", predicate: () => true },
            { label: "Cancelled", value: "CANCELLED", predicate: () => true },
            { label: "Checked in", value: "IN", predicate: () => true },
            { label: "Not in yet", value: "NOT_IN", predicate: () => true },
          ]}
          quickFilterValue={status}
          onQuickFilterChange={(value) => {
            setStatus(value as "ALL" | RegistrationStatus | "IN" | "NOT_IN");
            setPage(1);
          }}
          filters={false}
          page={page}
          onPageChange={setPage}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          totalRows={list.data?.totalItems ?? 0}
          onRowClick={openOrder}
          rowActions={(r) => [
            { key: "order", label: "Open order", icon: <Receipt />, onClick: openOrder },
            ...(canChange && r.status === "CONFIRMED" && canChangeTicketType
              ? [
                  {
                    key: "ticket",
                    label: "Change ticket type",
                    icon: <ArrowLeftRight />,
                    onClick: (row: Registration) => {
                      setSelectedTicketId("");
                      setTicketTarget(row);
                    },
                  },
                ]
              : []),
            // Returning replaces cancelling (the API treats both the same since Phase 8): frees the place and, for a
            // paid ticket, opens a refund. A ticket used at the door can't be returned.
            ...(canChange && r.status === "CONFIRMED"
              ? [
                  {
                    key: "return",
                    label: r.checked_in_at ? "Already used at the door" : "Return ticket",
                    icon: <Undo2 />,
                    disabled: (row: Registration) => row.checked_in_at !== null,
                    onClick: (row: Registration) => setConfirmCancel(row),
                  },
                ]
              : []),
            ...(canChange && r.status === "CANCELLED" ? [{ key: "back", label: "Bring back", icon: <RotateCcw />, onClick: (row: Registration) => change.mutate({ registration: row, to: "CONFIRMED" }) }] : []),
          ]}
          toolbarActions={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
              {canExport && (
                <Button variant="secondary" loading={downloading} loadingLabel="Downloading" disabled={!list.data || list.data.totalItems === 0} onClick={() => void handleDownloadCsv()}>
                  <DownloadIcon className="size-4" />
                  Download CSV
                </Button>
              )}
              {canUpdate && event.status === "PUBLISHED" && (
                <Button variant="secondary" onClick={() => window.history.pushState(null, "", `/admin/events/${event.id}/door`)}>
                  <DoorOpen className="size-4" />
                  Door
                </Button>
              )}
              {showRegister && !registering && (
                <>
                  <Button variant="secondary" onClick={() => setRegistering(true)}>
                    Register one guest
                  </Button>
                  <Button onClick={issue}>
                    <Ticket className="size-4" />
                    Issue tickets
                  </Button>
                </>
              )}
            </div>
          }
          emptyState={
            <EmptyState
              icon={<UserIcon />}
              title={q || status !== "ALL" ? "No guests match" : "No guests yet"}
              description={
                q || status !== "ALL"
                  ? "Try a different search or filter."
                  : showRegister
                    ? "Issue tickets, or share the event's link: guests appear here, newest first."
                    : "Registered guests appear here, newest first."
              }
            />
          }
        />
      )}

      <ReturnTicketDialog
        organizationId={orgId}
        eventId={event.id}
        target={confirmCancel ? { id: confirmCancel.id, code: confirmCancel.code, name: possessive(fullName(confirmCancel.person)), price: confirmCancel.price } : null}
        onClose={() => {
          setConfirmCancel(null);
          refreshSummary();
        }}
      />

      <Modal
        open={ticketTarget !== null}
        onOpenChange={(open) => {
          if (!open && !changeTicket.isPending) {
            setTicketTarget(null);
            setSelectedTicketId("");
          }
        }}
        size="sm"
      >
        <ModalHeader
          title={`Change ${ticketTarget ? fullName(ticketTarget.person) : "guest"}'s ticket type`}
          subtitle="They keep their existing confirmation code. No SMS is sent."
          onClose={() => {
            if (!changeTicket.isPending) {
              setTicketTarget(null);
              setSelectedTicketId("");
            }
          }}
        />
        <ModalBody>
          <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Ticket type">
            {activeTickets.map((t) => {
              const isCurrent = t.id === ticketTarget?.ticket_type.id;
              const isFull = t.remaining === 0;
              const subtitle = isCurrent
                ? "Current ticket type"
                : isFull
                  ? "Full"
                  : t.remaining === null
                    ? "No limit"
                    : `${formatNumber(t.remaining)} ${t.remaining === 1 ? "place" : "places"} left`;

              return (
                <SelectCard
                  key={t.id}
                  title={t.name}
                  subtitle={subtitle}
                  value={isFull && !isCurrent ? "Full" : undefined}
                  selected={selectedTicketId === t.id}
                  disabled={isCurrent || isFull || changeTicket.isPending}
                  onClick={() => setSelectedTicketId(t.id)}
                />
              );
            })}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            disabled={changeTicket.isPending}
            onClick={() => {
              setTicketTarget(null);
              setSelectedTicketId("");
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={!selectedTicketId || !ticketTarget}
            loading={changeTicket.isPending}
            loadingLabel="Changing"
            onClick={() => {
              if (!ticketTarget || !chosenTicket) return;
              changeTicket.mutate({
                registrationId: ticketTarget.id,
                ticketTypeId: chosenTicket.id,
                ticketTypeName: chosenTicket.name,
              });
            }}
          >
            Change ticket type
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
