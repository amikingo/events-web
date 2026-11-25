"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { DownloadIcon, UserIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { isValidEthiopianPhone, PhoneInput } from "@/components/ui/phone-input";
import { RecordHeading, RecordRows } from "@/components/ui/record-view";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { SelectCard } from "@/components/ui/select-card";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { TextLink } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toaster";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api-client";
import type { StaffEvent } from "@/lib/api/events";
import { describeApiError } from "@/lib/api/errors";
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
import { personQk, registrationQk } from "@/lib/query-keys";
import { formatMomentShort } from "@/lib/ethiopian-datetime";

const PAGE_SIZE = 20;
const fullName = (p: { first_name: string; last_name: string | null }) => [p.first_name, p.last_name].filter(Boolean).join(" ");

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
    onError: (error) => setFailure(describeApiError(error, "guest")),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      firstName: mode === "new" && !fields.firstName.trim() ? "Enter the guest's first name." : undefined,
      phone: mode === "new" && fields.phone && !isValidEthiopianPhone(fields.phone) ? "Enter all nine digits, starting with 9 or 7, or leave it empty." : undefined,
      person: mode === "existing" && !picked ? "Search for the guest and select them." : undefined,
      ticket: ticketTypes.length > 1 && !ticketTypeId ? "Choose a ticket type." : undefined,
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
        {failure && <ErrorBanner>{failure}</ErrorBanner>}
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
            <Field label="Mobile number" htmlFor="rg-phone" error={errors.phone} hint="Optional. Their confirmation SMS goes here.">
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

        {ticketTypes.length > 1 && (
          <Field label="Ticket type" htmlFor="rg-ticket" required error={errors.ticket}>
            <Select
              id="rg-ticket"
              placeholder="Choose a ticket type"
              options={ticketTypes.map((t) => ({ value: t.id, label: t.name }))}
              value={ticketTypeId}
              onValueChange={setTicketTypeId}
            />
          </Field>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" loading={register.isPending} loadingLabel="Registering">
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
  const [status, setStatus] = useState<"ALL" | RegistrationStatus>("ALL");
  const [search, setSearch] = useState("");
  const [registering, setRegistering] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<Registration | null>(null);
  const [ticketTarget, setTicketTarget] = useState<Registration | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [downloading, setDownloading] = useState(false);

  const q = useDebouncedValue(search.trim(), 300);
  const params = { page, pageSize: PAGE_SIZE, status: status === "ALL" ? undefined : status, q: q || undefined };

  const summary = useQuery({ queryKey: registrationQk.summary(orgId, event.id), queryFn: ({ signal }) => getRegistrationSummary(orgId, event.id, signal) });
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
    onError: (error) => toast.error("Couldn't change the registration", { body: describeApiError(error, "registration") }),
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
          toast.error("You don't have permission to do this.");
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
        status: status === "ALL" ? undefined : status,
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
  const rows = list.data?.data ?? [];

  const chosenTicket = activeTickets.find((t) => t.id === selectedTicketId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <RecordHeading>Places</RecordHeading>
        {summary.isPending ? (
          <Skeleton shape="block" />
        ) : summary.isError ? (
          <p className="type-body-sm m-0 text-danger">{describeApiError(summary.error, "event")}</p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="type-h3 m-0 text-text">{placesLabel(summary.data.confirmed, summary.data.capacity)}</p>
            {summary.data.remaining !== null && <p className="type-body-sm m-0 text-text-soft">{summary.data.remaining === 0 ? "The event is full." : `${formatNumber(summary.data.remaining)} left.`}</p>}
            {summary.data.ticket_types.length > 1 && (
              <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0">
                {summary.data.ticket_types.map((t) => (
                  <li key={t.id} className="type-body-sm text-text-soft">
                    {t.name}: {placesLabel(t.confirmed, t.capacity)}
                    {!t.is_active && " · switched off"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {showRegister && !registering && (
        <div>
          <Button variant="secondary" onClick={() => setRegistering(true)}>
            Register a guest
          </Button>
        </div>
      )}
      {registering && <RegisterForm event={event} ticketTypes={activeTickets} onDone={() => setRegistering(false)} />}
      {canCreate && event.status === "DRAFT" && <p className="type-body-sm m-0 text-text-faint">Publish the event to start registering guests.</p>}

      <div className="flex flex-col gap-3">
        <RecordHeading>Guest list</RecordHeading>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <SegmentedControl
            aria-label="Show"
            value={status}
            onValueChange={(v) => {
              setStatus(v as "ALL" | RegistrationStatus);
              setPage(1);
            }}
            options={[
              { value: "ALL", label: "All" },
              { value: "CONFIRMED", label: "Confirmed" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="sm:w-64">
              <Input
                aria-label="Search the guest list"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, phone or email"
                autoComplete="off"
              />
            </div>
            {canExport && (
              <Button variant="secondary" loading={downloading} loadingLabel="Downloading" onClick={() => void handleDownloadCsv()}>
                <DownloadIcon className="size-4" />
                Download CSV
              </Button>
            )}
          </div>
        </div>

        {list.isPending ? (
          <SkeletonStack>
            <Skeleton shape="block" />
            <Skeleton shape="block" />
          </SkeletonStack>
        ) : list.isError ? (
          <EmptyState size="sm" tone="danger" title="We couldn't load the guest list" description={describeApiError(list.error, "registration")} actions={<Button onClick={() => void list.refetch()}>Try again</Button>} />
        ) : rows.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<UserIcon />}
            title={q || status !== "ALL" ? "No guests match" : "No guests yet"}
            description={q || status !== "ALL" ? "Try a different search or filter." : "Registered guests appear here, newest first."}
          />
        ) : (
          <>
            <RecordRows
              rows={rows.map((r) => ({
                title: fullName(r.person),
                meta: (
                  <>
                    <code>{r.code}</code> · {r.ticket_type.name} · {r.person.phone ?? r.person.email ?? "No contact"} · {r.source === "PUBLIC" ? "Signed up online" : "Added by staff"} ·{" "}
                    {formatMomentShort(r.registered_at, event.timezone)}
                  </>
                ),
                trailing: (
                  <span className="flex flex-wrap items-center justify-end gap-2">
                    {r.confirmation && <StatusPill kind="message" status={r.confirmation.status} />}
                    <StatusPill kind="registration" status={r.status} />
                    {canChange &&
                      (r.status === "CONFIRMED" ? (
                        <>
                          {canChangeTicketType && (
                            <TextLink
                              soft
                              onClick={() => {
                                setSelectedTicketId("");
                                setTicketTarget(r);
                              }}
                            >
                              Change ticket type
                            </TextLink>
                          )}
                          <TextLink soft onClick={() => setConfirmCancel(r)}>
                            Cancel
                          </TextLink>
                        </>
                      ) : (
                        <TextLink onClick={() => change.mutate({ registration: r, to: "CONFIRMED" })}>Bring back</TextLink>
                      ))}
                  </span>
                ),
              }))}
            />
            <div className="flex items-center justify-between type-body-sm text-text-soft">
              <span>
                Page {list.data!.currentPage} of {list.data!.totalPages} · {formatNumber(list.data!.totalItems)} {list.data!.totalItems === 1 ? "guest" : "guests"}
              </span>
              <span className="flex gap-2">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" disabled={page >= list.data!.totalPages} onClick={() => setPage((n) => n + 1)}>
                  Next
                </Button>
              </span>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel !== null}
        onOpenChange={(o) => !o && setConfirmCancel(null)}
        title={`Cancel ${confirmCancel ? fullName(confirmCancel.person) : "this"} registration?`}
        description="Their place is freed. They keep their code, and you can bring them back while there is room. No message is sent."
        confirmLabel="Cancel registration"
        cancelLabel="Keep registration"
        onConfirm={() => {
          const target = confirmCancel;
          setConfirmCancel(null);
          if (target) change.mutate({ registration: target, to: "CANCELLED" });
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
