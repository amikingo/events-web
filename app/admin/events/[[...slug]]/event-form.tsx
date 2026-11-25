"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/lib/api/clients";
import type { EventInput, EventVisibility, StaffEvent } from "@/lib/api/events";
import type { Venue } from "@/lib/api/venues";
import { isoToZonedLocal, zonedLocalToIso } from "@/lib/timezone";

/** What the form holds: times as wall-clock `YYYY-MM-DDTHH:mm` in the event's timezone, numbers as typed. */
interface Values {
  name: string;
  slug: string;
  category: string;
  description: string;
  startsAt: string;
  endsAt: string;
  opensAt: string;
  closesAt: string;
  capacity: string;
  visibility: EventVisibility;
  venueId: string;
  clientId: string;
}

type Errors = Partial<Record<keyof Values, string>>;

const NONE = "none";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function startValues(event: StaffEvent | undefined, timeZone: string): Values {
  return {
    name: event?.name ?? "",
    slug: event?.slug ?? "",
    category: event?.category ?? "",
    description: event?.description ?? "",
    startsAt: isoToZonedLocal(event?.starts_at ?? null, timeZone),
    endsAt: isoToZonedLocal(event?.ends_at ?? null, timeZone),
    opensAt: isoToZonedLocal(event?.registration_opens_at ?? null, timeZone),
    closesAt: isoToZonedLocal(event?.registration_closes_at ?? null, timeZone),
    capacity: event?.capacity ? String(event.capacity) : "",
    visibility: event?.visibility ?? "UNLISTED",
    venueId: event?.venue_id ?? NONE,
    clientId: event?.customer_account_id ?? NONE,
  };
}

function validate(v: Values, editingSlug: boolean): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Enter the event's name.";
  if (editingSlug && v.slug.trim() && !SLUG.test(v.slug.trim())) e.slug = "Use lower-case letters, numbers and hyphens, like banking-forum.";
  if (v.startsAt && v.endsAt && v.startsAt >= v.endsAt) e.endsAt = "The end must be after the start.";
  if (v.opensAt && v.closesAt && v.opensAt >= v.closesAt) e.closesAt = "Sign-ups must close after they open.";
  if (v.capacity.trim() && !/^[1-9]\d{0,6}$/.test(v.capacity.trim())) e.capacity = "Enter a whole number above 0, or leave it empty.";
  return e;
}

/** The body the API takes. Times become UTC instants; empty fields become null. */
function toInput(v: Values, timeZone: string, sendSlug: boolean): EventInput {
  const text = (s: string) => s.trim() || null;
  return {
    name: v.name.trim(),
    ...(sendSlug && v.slug.trim() ? { slug: v.slug.trim() } : {}),
    description: text(v.description),
    category: text(v.category),
    starts_at: zonedLocalToIso(v.startsAt, timeZone),
    ends_at: zonedLocalToIso(v.endsAt, timeZone),
    registration_opens_at: zonedLocalToIso(v.opensAt, timeZone),
    registration_closes_at: zonedLocalToIso(v.closesAt, timeZone),
    capacity: v.capacity.trim() ? Number(v.capacity.trim()) : null,
    visibility: v.visibility,
    venue_id: v.venueId === NONE ? null : v.venueId,
    customer_account_id: v.clientId === NONE ? null : v.clientId,
  };
}

interface EventFormProps {
  /** The event being edited. Leave out to create one. */
  event?: StaffEvent;
  /** The timezone times are typed in: the event's own, or the organization's for a new event. */
  timeZone: string;
  venues: Venue[];
  clients: Client[];
  /** Persist. Throw an Error with a message to keep the form open and show it. */
  onSubmit: (input: EventInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Create and edit page for an event. A full page with cards of fields, buttons in the header so they stay in view.
 * The slug can only change while the event is a draft; after the first publication its address is fixed.
 */
export function EventForm({ event, timeZone, venues, clients, onSubmit, onCancel }: EventFormProps) {
  const editing = Boolean(event);
  const slugEditable = !event || event.status === "DRAFT";
  const [start] = useState(() => startValues(event, timeZone));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const dirty = (Object.keys(start) as (keyof Values)[]).some((k) => values[k] !== start[k]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate(values, slugEditable);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setFailure(null);
    setSaving(true);
    try {
      await onSubmit(toInput(values, timeZone, slugEditable));
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "We couldn't save the event. Try again.");
      setSaving(false);
    }
  }

  function cancel() {
    if (dirty) setDiscardOpen(true);
    else onCancel();
  }

  // Inactive venues and clients can't be picked, but an event that already uses one keeps showing it.
  const venueOptions = [
    { value: NONE, label: "No venue yet" },
    ...venues.filter((v) => v.is_active || v.id === event?.venue_id).map((v) => ({ value: v.id, label: v.city ? `${v.name}, ${v.city}` : v.name })),
  ];
  const clientOptions = [
    { value: NONE, label: "Our own event (no client)" },
    ...clients.filter((c) => c.is_active || c.id === event?.customer_account_id).map((c) => ({ value: c.id, label: c.name })),
  ];
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb
          items={[
            { label: "Events", onClick: cancel },
            ...(editing ? [{ label: event!.name, onClick: cancel }] : []),
            { label: editing ? "Edit" : "New event" },
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${event!.name}` : "New event"}</h1>
            <p className="type-body m-0 text-text-soft">
              {editing ? "Change the details people see." : "It starts as a draft with a General Admission ticket. Publish it when it's ready."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="event-form" loading={saving} loadingLabel="Saving" disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create event"}
            </Button>
          </div>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}

      <form id="event-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="About the event" subtitle="What it is and who it's for." />
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor="ev-name" required error={errors.name}>
              <Input id="ev-name" value={values.name} error={!!errors.name} onChange={(e) => set("name", e.target.value)} placeholder="Banking Forum 2027" autoComplete="off" />
            </Field>
            <Field label="Category" htmlFor="ev-category" hint="Optional. Visitors can filter by it, like Conference or Music.">
              <Input id="ev-category" value={values.category} onChange={(e) => set("category", e.target.value)} placeholder="Conference" autoComplete="off" />
            </Field>
            <Field label="Description" htmlFor="ev-description" hint="Optional. Shown on the event's public page.">
              <Textarea id="ev-description" value={values.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            {slugEditable && (
              <Field
                label="Web address"
                htmlFor="ev-slug"
                error={errors.slug}
                hint={editing ? "The last part of the event's link. It's fixed once you publish." : "Optional. Left empty, we make one from the name. It's fixed once you publish."}
              >
                <Input id="ev-slug" value={values.slug} error={!!errors.slug} onChange={(e) => set("slug", e.target.value)} placeholder="banking-forum-2027" autoComplete="off" />
              </Field>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="When" subtitle={`Times are in ${timeZone.replace(/_/g, " ")}. You need both to publish.`} />
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Starts" htmlFor="ev-starts">
                <DateTimePicker id="ev-starts" value={values.startsAt} onValueChange={(v) => set("startsAt", v)} />
              </Field>
              <Field label="Ends" htmlFor="ev-ends" error={errors.endsAt}>
                <DateTimePicker id="ev-ends" value={values.endsAt} onValueChange={(v) => set("endsAt", v)} min={values.startsAt || undefined} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Sign-ups open" htmlFor="ev-opens" hint="Optional. Empty means open as soon as it's published.">
                <DateTimePicker id="ev-opens" value={values.opensAt} onValueChange={(v) => set("opensAt", v)} />
              </Field>
              <Field label="Sign-ups close" htmlFor="ev-closes" error={errors.closesAt} hint="Optional. Set it to stop sign-ups early.">
                <DateTimePicker id="ev-closes" value={values.closesAt} onValueChange={(v) => set("closesAt", v)} min={values.opensAt || undefined} />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Where and for whom" subtitle="Both optional." />
          <div className="flex flex-col gap-4">
            <Field label="Venue" htmlFor="ev-venue" hint="Add new places on the Venues page.">
              <Select id="ev-venue" options={venueOptions} value={values.venueId} onValueChange={(v) => set("venueId", v)} />
            </Field>
            <Field label="Client" htmlFor="ev-client" hint="Who commissioned the event, if anyone.">
              <Select id="ev-client" options={clientOptions} value={values.clientId} onValueChange={(v) => set("clientId", v)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Audience" subtitle="Who can find it and how many can come." />
          <div className="flex flex-col gap-4">
            <Field label="Visibility" hint={values.visibility === "PUBLIC" ? "Listed on the public site once published." : "Only people with the link can open it."}>
              <SegmentedControl
                aria-label="Visibility"
                value={values.visibility}
                onValueChange={(v) => set("visibility", v as EventVisibility)}
                options={[
                  { value: "UNLISTED", label: "Link only" },
                  { value: "PUBLIC", label: "Public" },
                ]}
              />
            </Field>
            <Field label="Capacity" htmlFor="ev-capacity" error={errors.capacity} hint="Optional. Every ticket type's limit must fit within it.">
              <Input id="ev-capacity" inputMode="numeric" value={values.capacity} error={!!errors.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="500" autoComplete="off" />
            </Field>
          </div>
        </Card>
      </form>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard changes?"
        description="You have changes that are not saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setDiscardOpen(false);
          onCancel();
        }}
      />
    </div>
  );
}
