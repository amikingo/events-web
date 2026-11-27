"use client";

import { CalendarClock, Globe, ImagePlus, Link2, ListChecks, MapPin, Ticket, UserRound, Users, Zap } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { EventCover } from "@/components/marketplace/event-cover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { Input, InputAddon, InputGroup } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { SelectCard } from "@/components/ui/select-card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { assetUrl } from "@/lib/api-client";
import type { Client } from "@/lib/api/clients";
import { DEFAULT_HOLDER_FIELDS } from "@/lib/api/events";
import type { EventInput, EventVisibility, HolderFieldSetting, HolderFields, RegistrationMode, StaffEvent } from "@/lib/api/events";
import type { Venue } from "@/lib/api/venues";
import { formatInZone, isoToZonedLocal, zonedLocalToIso } from "@/lib/timezone";
import { VenueField } from "./venue-field";

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
  registrationMode: RegistrationMode;
  /** One value per guest detail, so "Save changes" only turns on when a setting really changed. */
  holderName: HolderFieldSetting;
  holderMobile: HolderFieldSetting;
  holderEmail: HolderFieldSetting;
  holderAffiliation: HolderFieldSetting;
  holderCountry: HolderFieldSetting;
  purchaseLimit: string;
  /** Phase 9: when the doors open; empty = at the start. */
  doorsAt: string;
}

/** The guest details a Detailed event can ask for, in the order the form shows them. */
const HOLDER_ROWS = [
  { key: "holderName", field: "name", label: "Name" },
  { key: "holderMobile", field: "mobile", label: "Mobile" },
  { key: "holderEmail", field: "email", label: "Email" },
  { key: "holderAffiliation", field: "affiliation", label: "Organization or affiliation" },
  { key: "holderCountry", field: "country", label: "Country" },
] as const satisfies readonly { key: keyof Values; field: keyof HolderFields; label: string }[];

type Errors = Partial<Record<keyof Values | "cover", string>>;

const NONE = "none";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Room for the empty "Hour" placeholder in each time box, so it isn't cut to "Ho…". Placement only, set on this form. */
const TIME_FIT = "[&_[role=group]>*]:w-[92px]";
/** A new event's end is filled in this long after its start, so most people never touch it. */
const DEFAULT_LENGTH_HOURS = 2;
/** What the API takes for a cover (it checks again). */
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const COVER_MAX_BYTES = 5 * 1024 * 1024;

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
    registrationMode: event?.registration_mode ?? "DETAILED",
    holderName: (event?.holder_fields ?? DEFAULT_HOLDER_FIELDS).name,
    holderMobile: (event?.holder_fields ?? DEFAULT_HOLDER_FIELDS).mobile,
    holderEmail: (event?.holder_fields ?? DEFAULT_HOLDER_FIELDS).email,
    holderAffiliation: (event?.holder_fields ?? DEFAULT_HOLDER_FIELDS).affiliation,
    holderCountry: (event?.holder_fields ?? DEFAULT_HOLDER_FIELDS).country,
    purchaseLimit: event?.purchase_limit_per_mobile ? String(event.purchase_limit_per_mobile) : "",
    doorsAt: isoToZonedLocal(event?.doors_open_at ?? null, timeZone),
  };
}

function validate(v: Values, editingSlug: boolean): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Enter the event's name.";
  if (editingSlug && v.slug.trim() && !SLUG.test(v.slug.trim())) e.slug = "Use lower-case letters, numbers and hyphens, like banking-forum.";
  if (v.startsAt && v.endsAt && v.startsAt >= v.endsAt) e.endsAt = "The end must be after the start.";
  if (v.doorsAt && v.endsAt && v.doorsAt >= v.endsAt) e.doorsAt = "The doors must open before the end.";
  if (v.opensAt && v.closesAt && v.opensAt >= v.closesAt) e.closesAt = "Sign-ups must close after they open.";
  if (v.capacity.trim() && !/^[1-9]\d{0,6}$/.test(v.capacity.trim())) e.capacity = "Enter a whole number above 0, or leave it empty.";
  if (v.purchaseLimit.trim() && !(/^[1-9]\d{0,4}$/.test(v.purchaseLimit.trim()) && Number(v.purchaseLimit.trim()) <= 10_000)) {
    e.purchaseLimit = "Enter a whole number from 1 to 10,000, or leave it empty for no limit.";
  }
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
    registration_mode: v.registrationMode,
    // All five together, as the API asks, in either mode.
    holder_fields: { name: v.holderName, mobile: v.holderMobile, email: v.holderEmail, affiliation: v.holderAffiliation, country: v.holderCountry },
    purchase_limit_per_mobile: v.purchaseLimit.trim() ? Number(v.purchaseLimit.trim()) : null,
    doors_open_at: zonedLocalToIso(v.doorsAt, timeZone),
  };
}

/** "Banking Forum 2027!" → "banking-forum-2027": a preview of the address the API makes from the name. */
const slugFrom = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Wall-clock `YYYY-MM-DDTHH:mm` plus some hours, done on the digits so no timezone gets in the way. */
function addHours(local: string, hours: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) return "";
  const [, y, mo, d, h, mi] = match.map(Number);
  return new Date(Date.UTC(y!, mo! - 1, d!, h! + hours, mi!)).toISOString().slice(0, 16);
}

/** "3 hours" / "2 days", or nothing when the times are missing or out of order. */
function lengthOf(startsAt: string, endsAt: string): string | undefined {
  if (!startsAt || !endsAt || endsAt <= startsAt) return undefined;
  const minutes = (Date.parse(`${endsAt}:00Z`) - Date.parse(`${startsAt}:00Z`)) / 60000;
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 24 * 60) {
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  // Calendar days it touches: Friday evening to Sunday noon is 3 days.
  const days = (Date.parse(`${endsAt.slice(0, 10)}T00:00Z`) - Date.parse(`${startsAt.slice(0, 10)}T00:00Z`)) / 86_400_000 + 1;
  return `${days} days`;
}

/** One line of "Event options": an icon, what it is, and its control on the right. Stacks on a phone. */
function OptionRow({ icon, title, hint, error, children, below }: { icon: ReactNode; title: string; hint: string; error?: string; children?: ReactNode; below?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <IconTile tone="charcoal" size="sm">
            {icon}
          </IconTile>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="type-body font-semibold text-text">{title}</span>
            <span className={error ? "type-body-sm text-danger" : "type-body-sm text-text-soft"}>{error ?? hint}</span>
          </div>
        </div>
        {children && <div className="flex flex-none sm:justify-end">{children}</div>}
      </div>
      {below}
    </div>
  );
}

interface EventFormProps {
  /** The event being edited. Leave out to create one. */
  event?: StaffEvent;
  /** The timezone times are typed in: the event's own, or the organization's for a new event. */
  timeZone: string;
  /** Whose venues a new one is added to. */
  organizationId: string;
  /** For the web address preview: `events/<organization>/<event>`. */
  organizationSlug?: string;
  venues: Venue[];
  clients: Client[];
  /** Persist, then upload `cover` when one was picked. Throw an Error with a message to keep the form open and show it. */
  onSubmit: (input: EventInput, cover: File | null) => Promise<void>;
  onCancel: () => void;
  /** Phase 9: a published event with guests already let in keeps its schedule (start, end, doors). */
  scheduleLocked?: boolean;
}

/**
 * Create and edit page for an event, after the best event sites (Luma): the cover and a live preview on the left, the
 * essentials (name, when, where, about) on the right, then the less common settings as a list of options. The form
 * fills in what it can (the end time, the web address) and hides what most people don't need (a sign-up window).
 */
export function EventForm({ event, timeZone, organizationId, organizationSlug, venues, clients, onSubmit, onCancel, scheduleLocked = false }: EventFormProps) {
  const editing = Boolean(event);
  const slugEditable = !event || event.status === "DRAFT";
  const [start] = useState(() => startValues(event, timeZone));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  // The "New venue" section under the venue field is open.
  const [addingVenue, setAddingVenue] = useState(false);
  const [signupWindow, setSignupWindow] = useState(() => Boolean(start.opensAt || start.closesAt));
  const [cover, setCover] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const coverInputId = useId();

  // A picked photo shows straight away; the URL is let go when it changes or the page closes.
  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  useEffect(() => () => void (coverPreview && URL.revokeObjectURL(coverPreview)), [coverPreview]);
  const coverSrc = coverPreview ?? (event?.cover ? assetUrl(event.cover.url) : undefined);

  const dirty = cover !== null || (Object.keys(start) as (keyof Values)[]).some((k) => values[k] !== start[k]);

  /** A hidden name means nothing else can be kept (a guest profile needs a name), so the others follow it. */
  function setHolder(key: (typeof HOLDER_ROWS)[number]["key"], value: HolderFieldSetting) {
    if (key === "holderName" && value === "HIDDEN") {
      setValues((v) => ({ ...v, holderName: "HIDDEN", holderMobile: "HIDDEN", holderEmail: "HIDDEN", holderAffiliation: "HIDDEN", holderCountry: "HIDDEN" }));
    } else {
      setValues((v) => ({ ...v, [key]: value }));
    }
  }

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function setStart(startsAt: string) {
    // Picking the start fills in an end two hours later, unless the person already chose one.
    setValues((v) => ({ ...v, startsAt, endsAt: v.endsAt || !startsAt ? v.endsAt : addHours(startsAt, DEFAULT_LENGTH_HOURS) }));
    if (errors.endsAt) setErrors((e) => ({ ...e, endsAt: undefined }));
  }

  function toggleSignupWindow(on: boolean) {
    setSignupWindow(on);
    if (!on) {
      setValues((v) => ({ ...v, opensAt: "", closesAt: "" }));
      setErrors((e) => ({ ...e, closesAt: undefined }));
    }
  }

  function pickCover(file: File | undefined) {
    if (!file) return;
    if (!COVER_TYPES.includes(file.type)) return setErrors((e) => ({ ...e, cover: "Use a JPEG, PNG or WebP image." }));
    if (file.size > COVER_MAX_BYTES) return setErrors((e) => ({ ...e, cover: "Use an image up to 5 MB." }));
    setErrors((e) => ({ ...e, cover: undefined }));
    setCover(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate(values, slugEditable);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    // A half-filled new venue would be lost without a word.
    if (addingVenue) return setFailure("Finish the new venue first: add it, or cancel it.");
    setFailure(null);
    setSaving(true);
    try {
      await onSubmit(toInput(values, timeZone, slugEditable), cover);
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
    { value: NONE, label: "Our own event" },
    ...clients.filter((c) => c.is_active || c.id === event?.customer_account_id).map((c) => ({ value: c.id, label: c.name })),
  ];
  const errorCount = Object.values(errors).filter(Boolean).length;
  const suggestedSlug = slugFrom(values.name);
  const zoneName = timeZone.replace(/_/g, " ");
  const venue = venues.find((v) => v.id === values.venueId);
  const startIso = zonedLocalToIso(values.startsAt, timeZone);
  const length = lengthOf(values.startsAt, values.endsAt);

  const actions = (
    <>
      <Button variant="secondary" type="button" onClick={cancel}>
        Cancel
      </Button>
      <Button type="submit" form="event-form" loading={saving} loadingLabel="Saving" disabled={editing && !dirty}>
        {editing ? "Save changes" : "Create event"}
      </Button>
    </>
  );

  return (
    <div className="flex w-full mx-auto max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${event!.name}` : "New event"}</h1>
            <p className="type-body m-0 text-text-soft">
              {editing ? "Change the details people see." : "It starts as a draft with a General Admission ticket. Publish it when it's ready."}
            </p>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </div>

      {(failure || errorCount > 0) && (
        <div className="flex flex-col gap-2">
          {failure && <ErrorBanner>{failure}</ErrorBanner>}
          {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}
        </div>
      )}

      <form id="event-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-8">
        {/* Left: the cover and how the event will look to visitors. Stays in view while the form scrolls. */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Card compact>
            <div className="flex flex-col gap-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-border">
                <EventCover seed={values.name || "new-event"} pattern="rings" category={values.category.toLowerCase()} src={coverSrc} />
                <div className="absolute bottom-3 right-3">
                  <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
                    <ImagePlus className="size-4" />
                    {coverSrc ? "Change photo" : "Add photo"}
                  </Button>
                </div>
                <input
                  ref={fileInput}
                  id={coverInputId}
                  type="file"
                  accept={COVER_TYPES.join(",")}
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Cover photo"
                  onChange={(e) => {
                    pickCover(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
              {errors.cover && <p className="type-body-sm m-0 text-danger">{errors.cover}</p>}

              <div className="flex flex-col gap-1.5 px-1 pb-1">
                <div className="flex items-center gap-2">
                  <Pill tone="neutral" size="sm">
                    {values.visibility === "PUBLIC" ? "Public" : "Link only"}
                  </Pill>
                  {values.category.trim() && (
                    <Pill tone="neutral" size="sm">
                      {values.category.trim()}
                    </Pill>
                  )}
                </div>
                <p className={values.name.trim() ? "type-h3 m-0 break-words text-text" : "type-h3 m-0 text-text-faint"}>{values.name.trim() || "Event name"}</p>
                <p className="type-body-sm m-0 flex items-center gap-1.5 text-text-soft">
                  <CalendarClock className="size-4 flex-none" />
                  {startIso ? formatInZone(startIso, timeZone) : "Date and time to come"}
                </p>
                <p className="type-body-sm m-0 flex items-center gap-1.5 text-text-soft">
                  <MapPin className="size-4 flex-none" />
                  {venue ? (venue.city ? `${venue.name}, ${venue.city}` : venue.name) : "Venue to come"}
                </p>
              </div>
            </div>
          </Card>
          <p className="type-body-sm m-0 px-1 text-text-faint">
            {cover ? "The new photo is uploaded when you save. JPEG, PNG or WebP, up to 5 MB." : "This is how the event shows on the events site. A photo is optional: JPEG, PNG or WebP, up to 5 MB."}
          </p>
        </aside>

        {/* Right: the essentials first, then the options most people leave as they are. */}
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex flex-col gap-5">
              <Field label="Event name" htmlFor="ev-name" required error={errors.name}>
                <Input id="ev-name" value={values.name} error={!!errors.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Banking Forum 2027" autoComplete="off" autoFocus={!editing} />
              </Field>

              <div className="flex flex-col gap-4 rounded-md border border-border bg-surface-2 p-4">
                {/* A disabled fieldset locks every control inside (the picker has no disabled prop of its own). */}
                <fieldset disabled={scheduleLocked} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0 disabled:opacity-60">
                  <Field label="Starts" htmlFor="ev-starts">
                    <DateTimePicker className={TIME_FIT} id="ev-starts" value={values.startsAt} onValueChange={setStart} />
                  </Field>
                  <Field label="Ends" htmlFor="ev-ends" error={errors.endsAt}>
                    <DateTimePicker className={TIME_FIT} id="ev-ends" value={values.endsAt} onValueChange={(v) => set("endsAt", v)} min={values.startsAt || undefined} />
                  </Field>
                  <Field label="Doors open" htmlFor="ev-doors" error={errors.doorsAt} hint="Leave empty to open at the start time.">
                    <DateTimePicker className={TIME_FIT} id="ev-doors" value={values.doorsAt} onValueChange={(v) => set("doorsAt", v)} max={values.endsAt || undefined} />
                  </Field>
                </fieldset>
                {scheduleLocked && <p className="type-body-sm m-0 text-text-soft">The schedule can&apos;t change after the first guest is admitted.</p>}
                <p className="type-body-sm m-0 flex flex-wrap items-center gap-x-1.5 text-text-soft">
                  <Globe className="size-4 flex-none" />
                  <span>{zoneName}</span>
                  {length ? <span>· Runs {length}</span> : <span>· Pick the start and we fill in the end.</span>}
                </p>
              </div>

              <VenueField
                organizationId={organizationId}
                venues={venues}
                options={venueOptions}
                value={values.venueId}
                onChange={(v) => set("venueId", v)}
                adding={addingVenue}
                onAddingChange={(adding) => {
                  setAddingVenue(adding);
                  setFailure(null);
                }}
              />

              <Field label="About the event" htmlFor="ev-description" hint="Optional. Shown on the event's public page.">
                <Textarea id="ev-description" rows={5} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="What happens, who it's for and what to bring." />
              </Field>

              <Field label="Category" htmlFor="ev-category" hint="Optional. Visitors can filter by it.">
                <Input id="ev-category" value={values.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Conference, Music" autoComplete="off" />
              </Field>
            </div>
          </Card>

          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 px-1">
              <h2 className="type-h3 m-0 text-text">Registration</h2>
              <p className="type-body-sm m-0 text-text-soft">How people get tickets, and what you ask each guest.</p>
            </div>
            <Card>
              <div className="flex flex-col gap-5">
                <Field label="Registration mode">
                  <div role="radiogroup" aria-label="Registration mode" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SelectCard
                      selected={values.registrationMode === "QUICK"}
                      onClick={() => set("registrationMode", "QUICK")}
                      leading={
                        <IconTile tone="charcoal" size="sm">
                          <Zap />
                        </IconTile>
                      }
                      title="Quick"
                      subtitle="Buyers give one mobile number; tickets can be unnamed."
                    />
                    <SelectCard
                      selected={values.registrationMode === "DETAILED"}
                      onClick={() => set("registrationMode", "DETAILED")}
                      leading={
                        <IconTile tone="charcoal" size="sm">
                          <ListChecks />
                        </IconTile>
                      }
                      title="Detailed"
                      subtitle="Collect each guest's details."
                    />
                  </div>
                </Field>

                {values.registrationMode === "DETAILED" && (
                  <Field label="Guest details" hint={values.holderName === "HIDDEN" ? "With the name hidden, nothing else is collected: tickets are unnamed." : "What each guest is asked for."}>
                    <div className="flex flex-col rounded-md border border-border">
                      {HOLDER_ROWS.map((row) => {
                        const locked = row.key !== "holderName" && values.holderName === "HIDDEN";
                        return (
                          <div key={row.key} className="flex flex-col gap-2 border-t border-border px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <span className={locked ? "type-body text-text-faint" : "type-body text-text"}>{row.label}</span>
                            <SegmentedControl
                              size="sm"
                              aria-label={`${row.label}: required, optional or hidden`}
                              value={values[row.key]}
                              onValueChange={(v) => !locked && setHolder(row.key, v as HolderFieldSetting)}
                              options={[
                                { value: "REQUIRED", label: "Required", disabled: locked },
                                { value: "OPTIONAL", label: "Optional", disabled: locked },
                                { value: "HIDDEN", label: "Hidden", disabled: locked },
                              ]}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </Field>
                )}

                <Field
                  label="Purchase limit"
                  htmlFor="ev-purchase-limit"
                  error={errors.purchaseLimit}
                  hint="The most tickets one mobile number can get for this event, across all orders. Leave empty for no limit."
                >
                  <InputGroup
                    id="ev-purchase-limit"
                    inputMode="numeric"
                    groupClassName="sm:max-w-[240px]"
                    suffix={
                      <InputAddon variant="suffix">
                        <Ticket className="size-4" />
                        per mobile
                      </InputAddon>
                    }
                    value={values.purchaseLimit}
                    error={!!errors.purchaseLimit}
                    onChange={(e) => set("purchaseLimit", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="No limit"
                    autoComplete="off"
                  />
                </Field>
              </div>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="type-h3 m-0 px-1 text-text">Event options</h2>
            <Card>
              <div className="flex flex-col">
                <OptionRow icon={values.visibility === "PUBLIC" ? <Globe /> : <Link2 />} title="Who can find it" hint={values.visibility === "PUBLIC" ? "Listed on the events site once published." : "Only people you send the link to."}>
                  <SegmentedControl
                    aria-label="Who can find it"
                    value={values.visibility}
                    onValueChange={(v) => set("visibility", v as EventVisibility)}
                    options={[
                      { value: "UNLISTED", label: "Link only" },
                      { value: "PUBLIC", label: "Public" },
                    ]}
                  />
                </OptionRow>

                <OptionRow icon={<Users />} title="Capacity" hint="Leave it empty for no limit. Ticket limits must fit within it." error={errors.capacity}>
                  <InputGroup
                    id="ev-capacity"
                    aria-label="Capacity"
                    inputMode="numeric"
                    groupClassName="w-full sm:w-[180px]"
                    suffix={<InputAddon variant="suffix">people</InputAddon>}
                    value={values.capacity}
                    error={!!errors.capacity}
                    onChange={(e) => set("capacity", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="No limit"
                    autoComplete="off"
                  />
                </OptionRow>

                <OptionRow
                  icon={<CalendarClock />}
                  title="Sign-up dates"
                  hint={signupWindow ? "Pick when sign-ups open and close." : "Open from publishing until the event starts."}
                  error={errors.closesAt}
                  below={
                    signupWindow && (
                      <div className="flex flex-col gap-4 sm:pl-11">
                        <Field label="Sign-ups open" htmlFor="ev-opens" hint="Optional. Empty means as soon as it's published.">
                          <DateTimePicker className={TIME_FIT} id="ev-opens" value={values.opensAt} onValueChange={(v) => set("opensAt", v)} />
                        </Field>
                        <Field label="Sign-ups close" htmlFor="ev-closes" hint="Optional. Set it to stop sign-ups early.">
                          <DateTimePicker className={TIME_FIT} id="ev-closes" value={values.closesAt} onValueChange={(v) => set("closesAt", v)} min={values.opensAt || undefined} />
                        </Field>
                      </div>
                    )
                  }
                >
                  <Switch checked={signupWindow} onCheckedChange={toggleSignupWindow} aria-label="Set sign-up dates" />
                </OptionRow>

                <OptionRow icon={<UserRound />} title="Client" hint="Who commissioned the event, if anyone.">
                  <div className="w-full sm:w-[240px]">
                    <Select id="ev-client" options={clientOptions} value={values.clientId} onValueChange={(v) => set("clientId", v)} />
                  </div>
                </OptionRow>

                {slugEditable && (
                  <OptionRow
                    icon={<Link2 />}
                    title="Web address"
                    hint={values.slug.trim() ? "Fixed once you publish." : suggestedSlug ? `Left empty, it will be ${suggestedSlug}. Fixed once you publish.` : "Made from the name if left empty. Fixed once you publish."}
                    error={errors.slug}
                    below={
                      <div className="sm:pl-11">
                        <InputGroup
                          id="ev-slug"
                          aria-label="Web address"
                          leading={<InputAddon>{organizationSlug ? `events/${organizationSlug}/` : "events/"}</InputAddon>}
                          value={values.slug}
                          error={!!errors.slug}
                          onChange={(e) => set("slug", e.target.value.toLowerCase())}
                          placeholder={suggestedSlug || "banking-forum-2027"}
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>
                    }
                  />
                )}
              </div>
            </Card>
          </section>
        </div>
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
