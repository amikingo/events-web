"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Note } from "@/components/ui/note";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { cancelEvent, rescheduleEvent } from "@/lib/api/events";
import type { StaffEvent } from "@/lib/api/events";
import { getRegistrationSummary } from "@/lib/api/registrations";
import { formatMomentFull } from "@/lib/ethiopian-datetime";
import { formatNumber } from "@/lib/format";
import { eventQk, paymentCaseQk, registrationQk } from "@/lib/query-keys";
import { isoToZonedLocal, zonedLocalToIso } from "@/lib/timezone";

/** Room for the "Hour" placeholder in each time box (as on the event form). Placement only. */
const TIME_FIT = "[&_[role=group]>*]:w-[92px]";

/** How many guests were let in: the cancel and reschedule rules turn on it. Null while unknown. */
function useCheckedIn(event: StaffEvent, enabled: boolean): number | null {
  const orgId = event.organization_id;
  const summary = useQuery({
    queryKey: registrationQk.summary(orgId, event.id),
    queryFn: ({ signal }) => getRegistrationSummary(orgId, event.id, signal),
    enabled,
  });
  return summary.data?.checked_in ?? null;
}

/** The issue codes a refusal carries, e.g. `doors_open_at_reconfirm`. */
function issueCodes(error: unknown): Set<string> {
  if (!(error instanceof ApiError)) return new Set();
  const issues = (error.details as { issues?: { code?: string }[] } | undefined)?.issues ?? [];
  return new Set(issues.map((i) => i.code ?? ""));
}

/**
 * Reschedule (Phase 9): start, end and doors together, prefilled. A published event only, and only before the first
 * guest is let in; tickets and codes stay valid and buyers get an SMS with the new time.
 */
export function RescheduleDialog({ event, open, onClose }: { event: StaffEvent; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const tz = event.timezone;
  const checkedIn = useCheckedIn(event, open);
  const [startsAt, setStartsAt] = useState(() => isoToZonedLocal(event.starts_at, tz));
  const [endsAt, setEndsAt] = useState(() => isoToZonedLocal(event.ends_at, tz));
  const [doorsAt, setDoorsAt] = useState(() => isoToZonedLocal(event.doors_open_at, tz));
  const [errors, setErrors] = useState<{ startsAt?: string; endsAt?: string; doorsAt?: string }>({});

  const run = useMutation({
    mutationFn: () =>
      rescheduleEvent(event.organization_id, event.id, {
        starts_at: zonedLocalToIso(startsAt, tz)!,
        ends_at: zonedLocalToIso(endsAt, tz)!,
        // The API asks for the door time again whenever the event has one; sending it always is just as right.
        doors_open_at: zonedLocalToIso(doorsAt, tz),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventQk.all(event.organization_id) });
      toast.success("Event rescheduled", { body: "Tickets and codes stay valid. Buyers are sent an SMS with the new time." });
      onClose();
    },
    onError: (error) => {
      const codes = issueCodes(error);
      setErrors({
        doorsAt: codes.has("doors_open_at_reconfirm") ? "Confirm the door time." : undefined,
        endsAt: codes.has("schedule_pair_required") ? "Change the start and end together." : undefined,
      });
    },
  });

  function submit() {
    const next: typeof errors = {};
    if (!startsAt) next.startsAt = "Pick the new start.";
    if (!endsAt) next.endsAt = "Pick the new end.";
    else if (startsAt && startsAt >= endsAt) next.endsAt = "The end must be after the start.";
    if (doorsAt && endsAt && doorsAt >= endsAt) next.doorsAt = "The doors must open before the end.";
    setErrors(next);
    if (Object.keys(next).length === 0) run.mutate();
  }

  // An explicit sales cutoff stays where it is: say so when it now falls before the new start.
  const newStart = zonedLocalToIso(startsAt, tz);
  const cutoffEarly = event.registration_closes_at && newStart && Date.parse(event.registration_closes_at) < Date.parse(newStart);
  const locked = (checkedIn ?? 0) > 0;
  const close = () => !run.isPending && onClose();
  const fieldErrors = Object.values(errors).some(Boolean);

  return (
    <Modal open={open} onOpenChange={(o) => !o && close()} size="sm">
      <ModalHeader title={`Reschedule ${event.name}`} subtitle="Tickets and codes stay valid. Buyers are sent an SMS with the new time." onClose={close} />
      <ModalBody>
        {locked ? (
          <Note icon={<CalendarClock />} className="mt-0">
            The schedule can&apos;t change after the first guest is admitted. {formatNumber(checkedIn ?? 0)} already came in.
          </Note>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="Starts" htmlFor="rs-starts" required error={errors.startsAt}>
              <DateTimePicker className={TIME_FIT} id="rs-starts" value={startsAt} onValueChange={setStartsAt} />
            </Field>
            <Field label="Ends" htmlFor="rs-ends" required error={errors.endsAt}>
              <DateTimePicker className={TIME_FIT} id="rs-ends" value={endsAt} onValueChange={setEndsAt} min={startsAt || undefined} />
            </Field>
            <Field label="Doors open" htmlFor="rs-doors" error={errors.doorsAt} hint="Leave empty to open at the start time.">
              <DateTimePicker className={TIME_FIT} id="rs-doors" value={doorsAt} onValueChange={setDoorsAt} max={endsAt || undefined} />
            </Field>
            {cutoffEarly && (
              <Note icon={<CalendarClock />} className="mt-0">
                Ticket sales still close at {formatMomentFull(event.registration_closes_at!, tz)}. Change it under Registration if you need to.
              </Note>
            )}
            {run.isError && !fieldErrors && <ErrorBanner>{describeApiError(run.error, "event")}</ErrorBanner>}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" disabled={run.isPending} onClick={close}>
          {locked ? "Close" : "Keep the date"}
        </Button>
        {!locked && (
          <Button loading={run.isPending} loadingLabel="Rescheduling" onClick={submit}>
            Reschedule event
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

/**
 * Cancel event (Phase 9): says what happens, and asks whether used tickets are refunded once a guest was let in.
 * After it, a toast opens the event's refunds under Payments.
 */
export function CancelEventDialog({ event, open, onClose }: { event: StaffEvent; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const checkedIn = useCheckedIn(event, open && event.status === "PUBLISHED");
  const askRefund = (checkedIn ?? 0) > 0;
  const [refund, setRefund] = useState<"" | "yes" | "no">("");
  const [choiceError, setChoiceError] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: () => cancelEvent(event.organization_id, event.id, askRefund ? refund === "yes" : undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventQk.all(event.organization_id) });
      void queryClient.invalidateQueries({ queryKey: ["registrations", event.organization_id] });
      void queryClient.invalidateQueries({ queryKey: paymentCaseQk.all(event.organization_id) });
      onClose();
      toast.success("Event cancelled", {
        body: "Buyers are being texted. Refunds for paid orders are waiting under Payments.",
        actions: [{ label: "Open refunds", onClick: () => router.push(`/admin/payments?event_id=${event.id}&kind=EVENT_CANCELLATION`) }],
      });
    },
    onError: (error) => {
      if (issueCodes(error).has("refund_decision_required")) setChoiceError("Choose whether used tickets are refunded.");
    },
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          run.reset();
          setChoiceError(null);
          onClose();
        }
      }}
      tone="warning"
      icon={<Ban />}
      title={`Cancel ${event.name}?`}
      description="Sales and the door stop, unused tickets are cancelled and buyers are texted. Refunds for paid orders are recorded under Payments. This can't be undone."
      confirmLabel="Cancel event"
      cancelLabel="Keep event"
      loading={run.isPending}
      loadingLabel="Cancelling"
      error={run.isError && !choiceError ? describeApiError(run.error, "event") : undefined}
      onConfirm={() => {
        if (askRefund && !refund) {
          setChoiceError("Choose whether used tickets are refunded.");
          return;
        }
        run.mutate();
      }}
    >
      {askRefund && (
        <Field label="Refund guests who already used their ticket?" required error={choiceError ?? undefined} hint={`${formatNumber(checkedIn ?? 0)} guests were already let in.`} className="mt-3 text-left">
          <SegmentedControl
            aria-label="Refund used tickets"
            block
            options={[
              { value: "yes", label: "Yes, refund them" },
              { value: "no", label: "No" },
            ]}
            value={refund}
            onValueChange={(v) => {
              setRefund(v as "yes" | "no");
              setChoiceError(null);
            }}
          />
        </Field>
      )}
    </ConfirmDialog>
  );
}
