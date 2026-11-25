"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Person, PersonInput } from "@/lib/api/persons";

interface Values {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  affiliation: string;
  country: string;
}
type Errors = Partial<Record<keyof Values, string>>;

const startValues = (p?: Person): Values => ({
  firstName: p?.first_name ?? "",
  lastName: p?.last_name ?? "",
  phone: p?.phone ?? "",
  email: p?.email ?? "",
  affiliation: p?.affiliation_name ?? "",
  country: p?.country ?? "",
});

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.firstName.trim()) e.firstName = "Enter the guest's first name.";
  if (v.phone.trim() && !/^\+?[0-9][0-9 ()-]{5,30}$/.test(v.phone.trim())) e.phone = "Use digits, spaces and + - ( ) only.";
  if (v.email.trim() && !/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Enter a valid email, like name@company.com.";
  if (v.country.trim() && !/^[A-Za-z]{2}$/.test(v.country.trim())) e.country = "Use the two-letter code, like ET.";
  return e;
}

function toInput(v: Values): PersonInput {
  const text = (s: string) => s.trim() || null;
  return {
    first_name: v.firstName.trim(),
    last_name: text(v.lastName),
    phone: text(v.phone),
    email: text(v.email),
    affiliation_name: text(v.affiliation),
    country: text(v.country)?.toUpperCase() ?? null,
  };
}

interface GuestFormProps {
  /** The guest being edited. Leave out to create one. */
  person?: Person;
  /** Persist. Throw an Error with a message to keep the form open and show it. */
  onSubmit: (input: PersonInput) => Promise<void>;
  onCancel: () => void;
}

/** Create and edit page for a guest profile: cards of fields, buttons in the header so they stay in view. */
export function GuestForm({ person, onSubmit, onCancel }: GuestFormProps) {
  const editing = Boolean(person);
  const fullName = person ? [person.first_name, person.last_name].filter(Boolean).join(" ") : "";
  const [start] = useState(() => startValues(person));
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
      setFailure(err instanceof Error ? err.message : "We couldn't save the guest. Try again.");
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
        <Breadcrumb items={[{ label: "Guests", onClick: cancel }, ...(editing ? [{ label: fullName, onClick: cancel }] : []), { label: editing ? "Edit" : "New guest" }]} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${fullName}` : "New guest"}</h1>
            <p className="type-body m-0 text-text-soft">{editing ? "Change their details." : "An attendee profile you can register for any of your events. A matching name or phone never merges two profiles."}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="guest-form" loading={saving} loadingLabel="Saving" disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create guest"}
            </Button>
          </div>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}

      <form id="guest-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Guest" subtitle="Who they are." />
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="First name" htmlFor="gs-first" required error={errors.firstName}>
                <Input id="gs-first" value={values.firstName} error={!!errors.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Hana" autoComplete="off" />
              </Field>
              <Field label="Last name" htmlFor="gs-last">
                <Input id="gs-last" value={values.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Bekele" autoComplete="off" />
              </Field>
            </div>
            <Field label="Organization" htmlFor="gs-affiliation" hint="Where they work, if it matters.">
              <Input id="gs-affiliation" value={values.affiliation} onChange={(e) => set("affiliation", e.target.value)} placeholder="ABC Bank" autoComplete="off" />
            </Field>
            <Field label="Country code" htmlFor="gs-country" error={errors.country} hint="Two letters, like ET.">
              <Input id="gs-country" value={values.country} error={!!errors.country} onChange={(e) => set("country", e.target.value)} placeholder="ET" autoComplete="off" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Contact" subtitle="An Ethiopian mobile gets the confirmation SMS." />
          <div className="flex flex-col gap-4">
            <Field label="Phone" htmlFor="gs-phone" error={errors.phone}>
              <Input id="gs-phone" inputMode="tel" value={values.phone} error={!!errors.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0911 204 412" autoComplete="off" />
            </Field>
            <Field label="Email" htmlFor="gs-email" error={errors.email}>
              <Input id="gs-email" type="email" value={values.email} error={!!errors.email} onChange={(e) => set("email", e.target.value)} autoComplete="off" />
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
