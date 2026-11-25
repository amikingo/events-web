"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Client, ClientInput, ClientKind } from "@/lib/api/clients";

interface Values {
  name: string;
  kind: ClientKind;
  type: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}
type Errors = Partial<Record<keyof Values, string>>;

const startValues = (c?: Client): Values => ({
  name: c?.name ?? "",
  kind: c?.kind ?? "ORGANIZATION",
  type: c?.type ?? "",
  contactName: c?.primary_contact_name ?? "",
  contactEmail: c?.primary_contact_email ?? "",
  contactPhone: c?.primary_contact_phone ?? "",
});

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Enter the client's name.";
  if (v.kind === "INDIVIDUAL" && v.type.trim()) e.type = "An individual has no sector. Clear this field.";
  if (v.contactEmail.trim() && !/^\S+@\S+\.\S+$/.test(v.contactEmail.trim())) e.contactEmail = "Enter a valid email, like name@company.com.";
  if (v.contactPhone.trim() && !/^\+?[0-9][0-9 ()-]{5,30}$/.test(v.contactPhone.trim())) e.contactPhone = "Use digits, spaces and + - ( ) only.";
  return e;
}

/** The API takes `null` to clear a field; an individual never carries a sector. */
function toInput(v: Values): ClientInput {
  const text = (s: string) => s.trim() || null;
  return {
    name: v.name.trim(),
    kind: v.kind,
    type: v.kind === "INDIVIDUAL" ? null : text(v.type),
    primary_contact_name: text(v.contactName),
    primary_contact_email: text(v.contactEmail),
    primary_contact_phone: text(v.contactPhone),
  };
}

interface ClientFormProps {
  /** The client being edited. Leave out to create one. */
  client?: Client;
  /** Persist. Throw an Error with a message to keep the form open and show it. */
  onSubmit: (input: ClientInput) => Promise<void>;
  onCancel: () => void;
}

/** Create and edit page for a client: cards of fields, buttons in the header so they stay in view. */
export function ClientForm({ client, onSubmit, onCancel }: ClientFormProps) {
  const editing = Boolean(client);
  const [start] = useState(() => startValues(client));
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
      setFailure(err instanceof Error ? err.message : "We couldn't save the client. Try again.");
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
        <Breadcrumb items={[{ label: "Clients", onClick: cancel }, ...(editing ? [{ label: client!.name, onClick: cancel }] : []), { label: editing ? "Edit" : "New client" }]} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${client!.name}` : "New client"}</h1>
            <p className="type-body m-0 text-text-soft">{editing ? "Change their details." : "The company or person commissioning your events. Not an attendee."}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="client-form" loading={saving} loadingLabel="Saving" disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create client"}
            </Button>
          </div>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}

      <form id="client-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Client" subtitle="Who they are." />
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor="cl-name" required error={errors.name}>
              <Input id="cl-name" value={values.name} error={!!errors.name} onChange={(e) => set("name", e.target.value)} placeholder="ABC Bank" autoComplete="off" />
            </Field>
            <Field label="Kind">
              <SegmentedControl
                aria-label="Kind"
                value={values.kind}
                onValueChange={(v) => set("kind", v as ClientKind)}
                options={[
                  { value: "ORGANIZATION", label: "Organization" },
                  { value: "INDIVIDUAL", label: "Individual" },
                ]}
              />
            </Field>
            <Field label="Sector" htmlFor="cl-type" error={errors.type} hint="Organizations only. Leave empty for an individual.">
              <Input id="cl-type" value={values.type} error={!!errors.type} disabled={values.kind === "INDIVIDUAL"} onChange={(e) => set("type", e.target.value)} placeholder="Corporate, NGO, Government…" autoComplete="off" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Contact person" subtitle="Optional. Who you talk to about their events." />
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor="cl-contact">
              <Input id="cl-contact" value={values.contactName} onChange={(e) => set("contactName", e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Email" htmlFor="cl-email" error={errors.contactEmail}>
              <Input id="cl-email" type="email" value={values.contactEmail} error={!!errors.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Phone" htmlFor="cl-phone" error={errors.contactPhone} hint="Ethiopian or international.">
              <Input id="cl-phone" inputMode="tel" value={values.contactPhone} error={!!errors.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="0911 204 412" autoComplete="off" />
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
