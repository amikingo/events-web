"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Venue, VenueInput } from "@/lib/api/venues";

interface Values {
  name: string;
  address: string;
  city: string;
  country: string;
  capacity: string;
}
type Errors = Partial<Record<keyof Values, string>>;

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
  if (v.country.trim() && !/^[A-Za-z]{2}$/.test(v.country.trim())) e.country = "Use the two-letter code, like ET.";
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

interface VenueFormProps {
  /** The venue being edited. Leave out to create one. */
  venue?: Venue;
  /** Persist. Throw an Error with a message to keep the form open and show it. */
  onSubmit: (input: VenueInput) => Promise<void>;
  onCancel: () => void;
}

/** Create and edit page for a venue: cards of fields, buttons in the header so they stay in view. */
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb items={[{ label: "Venues", onClick: cancel }, ...(editing ? [{ label: venue!.name, onClick: cancel }] : []), { label: editing ? "Edit" : "New venue" }]} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}

      <form id="venue-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Venue" subtitle="What it's called and where it is." />
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor="vn-name" required error={errors.name}>
              <Input id="vn-name" value={values.name} error={!!errors.name} onChange={(e) => set("name", e.target.value)} placeholder="Skylight Hotel, Grand Ballroom" autoComplete="off" />
            </Field>
            <Field label="Address" htmlFor="vn-address">
              <Input id="vn-address" value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="Bole Road" autoComplete="off" />
            </Field>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="City" htmlFor="vn-city">
                <Input id="vn-city" value={values.city} onChange={(e) => set("city", e.target.value)} placeholder="Addis Ababa" autoComplete="off" />
              </Field>
              <Field label="Country code" htmlFor="vn-country" error={errors.country} hint="Two letters, like ET.">
                <Input id="vn-country" value={values.country} error={!!errors.country} onChange={(e) => set("country", e.target.value)} placeholder="ET" autoComplete="off" />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Size" subtitle="Optional." />
          <Field label="Capacity" htmlFor="vn-capacity" error={errors.capacity} hint="How many people the place holds. Each event sets its own limit.">
            <Input id="vn-capacity" inputMode="numeric" value={values.capacity} error={!!errors.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="500" autoComplete="off" />
          </Field>
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
