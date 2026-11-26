"use client";

import { Building2, Mail, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { SelectCard } from "@/components/ui/select-card";
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
  if (!v.name.trim()) e.name = v.kind === "INDIVIDUAL" ? "Enter the person's name." : "Enter the organization's name.";
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

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/** A line of the preview card: an icon and a value, or a faint placeholder when it's empty. */
function PreviewLine({ icon, value, empty }: { icon: ReactNode; value: string; empty: string }) {
  return (
    <p className={value ? "type-body-sm m-0 flex min-w-0 items-center gap-2 text-text-soft" : "type-body-sm m-0 flex items-center gap-2 text-text-faint"}>
      <span className="flex-none [&_svg]:size-4">{icon}</span>
      <span className="truncate">{value || empty}</span>
    </p>
  );
}

interface ClientFormProps {
  /** The client being edited. Leave out to create one. */
  client?: Client;
  /** Persist. Throw an Error with a message to keep the form open and show it. */
  onSubmit: (input: ClientInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Create and edit page for a client, laid out like the event form: a live preview of the client on the left, who they
 * are and who to talk to on the right. The kind comes first, because it changes the rest (an individual has no sector).
 */
export function ClientForm({ client, onSubmit, onCancel }: ClientFormProps) {
  const editing = Boolean(client);
  const [start] = useState(() => startValues(client));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const dirty = (Object.keys(start) as (keyof Values)[]).some((k) => values[k] !== start[k]);
  const isPerson = values.kind === "INDIVIDUAL";

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
  const name = values.name.trim();

  return (
    <div className="flex w-full mx-auto max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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

      {(failure || errorCount > 0) && (
        <div className="flex flex-col gap-2">
          {failure && <ErrorBanner>{failure}</ErrorBanner>}
          {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}
        </div>
      )}

      <form id="client-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-8">
        {/* Left: how the client will look in your lists. Stays in view while the form scrolls. */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar initials={initialsOf(name)} size={48} />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className={name ? "type-h3 m-0 break-words text-text" : "type-h3 m-0 text-text-faint"}>{name || (isPerson ? "Their name" : "Organization name")}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone="neutral" size="sm">
                      {isPerson ? "Individual" : "Organization"}
                    </Pill>
                    {!isPerson && values.type.trim() && (
                      <Pill tone="neutral" size="sm">
                        {values.type.trim()}
                      </Pill>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <PreviewLine icon={<UserRound />} value={values.contactName.trim()} empty="No contact person yet" />
                <PreviewLine icon={<Mail />} value={values.contactEmail.trim()} empty="No email" />
                <PreviewLine icon={<Phone />} value={values.contactPhone.trim()} empty="No phone" />
              </div>
            </div>
          </Card>
          <p className="type-body-sm m-0 px-1 text-text-faint">This is how the client shows in your list. Pick them on an event to say who it&apos;s for.</p>
        </aside>

        {/* Right: who they are first, then who to talk to. */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="type-h3 m-0 px-1 text-text">Who they are</h2>
            <Card>
              <div className="flex flex-col gap-5">
                <div role="radiogroup" aria-label="Kind of client" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SelectCard
                    selected={!isPerson}
                    onClick={() => set("kind", "ORGANIZATION")}
                    leading={
                      <IconTile tone="charcoal" size="sm">
                        <Building2 />
                      </IconTile>
                    }
                    title="Organization"
                    subtitle="A company, NGO or office."
                  />
                  <SelectCard
                    selected={isPerson}
                    onClick={() => set("kind", "INDIVIDUAL")}
                    leading={
                      <IconTile tone="charcoal" size="sm">
                        <UserRound />
                      </IconTile>
                    }
                    title="Individual"
                    subtitle="One person, like a wedding host."
                  />
                </div>

                <Field label={isPerson ? "Full name" : "Organization name"} htmlFor="cl-name" required error={errors.name}>
                  <Input
                    id="cl-name"
                    value={values.name}
                    error={!!errors.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder={isPerson ? "e.g. Hana Tesfaye" : "e.g. ABC Bank"}
                    autoComplete="off"
                    autoFocus={!editing}
                  />
                </Field>

                {!isPerson && (
                  <Field label="Sector" htmlFor="cl-type" error={errors.type} hint="Optional. Helps you group clients.">
                    <Input id="cl-type" value={values.type} error={!!errors.type} onChange={(e) => set("type", e.target.value)} placeholder="e.g. Corporate, NGO, Government" autoComplete="off" />
                  </Field>
                )}
              </div>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 px-1">
              <h2 className="type-h3 m-0 text-text">Contact person</h2>
              <p className="type-body-sm m-0 text-text-soft">Optional. Who you talk to about their events.</p>
            </div>
            <Card>
              <div className="flex flex-col gap-5">
                <Field label="Name" htmlFor="cl-contact">
                  <Input id="cl-contact" value={values.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="e.g. Dawit Alemu" autoComplete="off" />
                </Field>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Email" htmlFor="cl-email" error={errors.contactEmail}>
                    <Input id="cl-email" type="email" value={values.contactEmail} error={!!errors.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="name@company.com" autoComplete="off" />
                  </Field>
                  <Field label="Phone" htmlFor="cl-phone" error={errors.contactPhone} hint="Ethiopian or international.">
                    <Input id="cl-phone" type="tel" inputMode="tel" value={values.contactPhone} error={!!errors.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="0911 204 412" autoComplete="off" />
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
