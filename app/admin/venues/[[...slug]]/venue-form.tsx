"use client";

import { Building, MapPin, Navigation, Users } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { Input, InputAddon, InputGroup } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import type { Venue, VenueInput } from "@/lib/api/venues";

interface Values {
  name: string;
  address: string;
  city: string;
  country: string;
  capacity: string;
}
type Errors = Partial<Record<keyof Values, string>>;

const NO_COUNTRY = "none";
/** Countries venues are most likely in first; names come from the browser, in English. */
const COUNTRY_CODES = ["ET", "KE", "DJ", "ER", "SO", "SD", "SS", "UG", "TZ", "RW", "NG", "GH", "ZA", "EG", "AE", "SA", "TR", "IN", "CN", "GB", "DE", "FR", "IT", "NL", "SE", "US", "CA", "AU"];
const regionName = (() => {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return (code: string) => names.of(code) ?? code;
  } catch {
    return (code: string) => code;
  }
})();

const startValues = (v?: Venue): Values => ({
  name: v?.name ?? "",
  address: v?.address ?? "",
  city: v?.city ?? "",
  country: v?.country ?? "",
  capacity: v?.capacity ? String(v.capacity) : "",
});

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Enter the venue's name.";
  if (v.capacity.trim() && !/^[1-9]\d{0,6}$/.test(v.capacity.trim())) e.capacity = "Enter a whole number above 0.";
  return e;
}

function toInput(v: Values): VenueInput {
  const text = (s: string) => s.trim() || null;
  return {
    name: v.name.trim(),
    address: text(v.address),
    city: text(v.city),
    country: text(v.country)?.toUpperCase() ?? null,
    capacity: v.capacity.trim() ? Number(v.capacity.trim()) : null,
  };
}

/** A line of the preview card: an icon and a value, or a faint placeholder when it's empty. */
function PreviewLine({ icon, value, empty }: { icon: ReactNode; value: string; empty: string }) {
  return (
    <p className={value ? "type-body-sm m-0 flex min-w-0 items-center gap-2 text-text-soft" : "type-body-sm m-0 flex items-center gap-2 text-text-faint"}>
      <span className="flex-none [&_svg]:size-4">{icon}</span>
      <span className="truncate">{value || empty}</span>
    </p>
  );
}

interface VenueFormProps {
  /** The venue being edited. Leave out to create one. */
  venue?: Venue;
  /** Persist. Throw an Error with a message to keep the form open and show it. */
  onSubmit: (input: VenueInput) => Promise<void>;
  onCancel: () => void;
}

/** Create and edit page for a venue, laid out like the other forms: a live preview on the left, the fields on the right. */
export function VenueForm({ venue, onSubmit, onCancel }: VenueFormProps) {
  const editing = Boolean(venue);
  const [start] = useState(() => startValues(venue));
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
    const next = validate(values);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setFailure(null);
    setSaving(true);
    try {
      await onSubmit(toInput(values));
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "We couldn't save the venue. Try again.");
      setSaving(false);
    }
  }

  function cancel() {
    if (dirty) setDiscardOpen(true);
    else onCancel();
  }

  const errorCount = Object.values(errors).filter(Boolean).length;
  const name = values.name.trim();
  const country = values.country.trim().toUpperCase();
  const place = [values.city.trim(), country ? regionName(country) : ""].filter(Boolean).join(", ");
  const capacity = values.capacity.trim() ? Number(values.capacity.trim()) : 0;
  const countryOptions = [
    { value: NO_COUNTRY, label: "Not set" },
    ...[...COUNTRY_CODES, ...(country && !COUNTRY_CODES.includes(country) ? [country] : [])].map((code) => ({ value: code, label: regionName(code), right: code })),
  ];

  return (
    <div className="flex w-full mx-auto max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${venue!.name}` : "New venue"}</h1>
            <p className="type-body m-0 text-text-soft">{editing ? "Change where it is." : "A place you hold events. Use it for as many events as you like."}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="venue-form" loading={saving} loadingLabel="Saving" disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create venue"}
            </Button>
          </div>
        </div>
      </div>

      {(failure || errorCount > 0) && (
        <div className="flex flex-col gap-2">
          {failure && <ErrorBanner>{failure}</ErrorBanner>}
          {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}
        </div>
      )}

      <form id="venue-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-8">
        {/* Left: how the venue shows when someone picks it for an event. Stays in view while the form scrolls. */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <IconTile tone="charcoal" size="lg">
                  <MapPin />
                </IconTile>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className={name ? "type-h3 m-0 break-words text-text" : "type-h3 m-0 text-text-faint"}>{name || "Venue name"}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone="neutral" size="sm">
                      {capacity ? `Holds ${capacity.toLocaleString("en-US")}` : "Size not set"}
                    </Pill>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <PreviewLine icon={<Navigation />} value={values.address.trim()} empty="No street address" />
                <PreviewLine icon={<Building />} value={place} empty="No city or country" />
              </div>
            </div>
          </Card>
          <p className="type-body-sm m-0 px-1 text-text-faint">Events show the name and city. Pick it on any event under Venue.</p>
        </aside>

        {/* Right: what it's called, where it is, how big it is. */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="type-h3 m-0 px-1 text-text">About the venue</h2>
            <Card>
              <div className="flex flex-col gap-5">
                <Field label="Name" htmlFor="vn-name" required error={errors.name} hint="The building and the room, if it has several.">
                  <Input id="vn-name" value={values.name} error={!!errors.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Skylight Hotel, Grand Ballroom" autoComplete="off" autoFocus={!editing} />
                </Field>
                <Field label="Capacity" htmlFor="vn-capacity" error={errors.capacity} hint="Optional. How many people the place holds. Each event sets its own limit.">
                  <InputGroup
                    id="vn-capacity"
                    inputMode="numeric"
                    groupClassName="sm:max-w-[240px]"
                    suffix={
                      <InputAddon variant="suffix">
                        <Users className="size-4" />
                        people
                      </InputAddon>
                    }
                    value={values.capacity}
                    error={!!errors.capacity}
                    onChange={(e) => set("capacity", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="e.g. 500"
                    autoComplete="off"
                  />
                </Field>
              </div>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 px-1">
              <h2 className="type-h3 m-0 text-text">Where it is</h2>
              <p className="type-body-sm m-0 text-text-soft">Optional. Guests see the city on the event page.</p>
            </div>
            <Card>
              <div className="flex flex-col gap-5">
                <Field label="Street address" htmlFor="vn-address">
                  <Input id="vn-address" value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="e.g. Bole Road, near Edna Mall" autoComplete="off" />
                </Field>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="City" htmlFor="vn-city">
                    <Input id="vn-city" value={values.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Addis Ababa" autoComplete="off" />
                  </Field>
                  <Field label="Country" htmlFor="vn-country" hint="Type to search.">
                    <Combobox id="vn-country" options={countryOptions} value={country || NO_COUNTRY} onValueChange={(v) => set("country", v === NO_COUNTRY ? "" : v)} placeholder="Search countries" emptyText="No country by that name" />
                  </Field>
                </div>
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
