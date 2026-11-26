"use client";

import { Building2, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
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

const NO_COUNTRY = "none";

/** The countries guests most often come from first, then the rest; names come from the browser, in English. */
const COUNTRY_CODES = ["ET", "KE", "DJ", "ER", "SO", "SD", "SS", "UG", "TZ", "RW", "NG", "GH", "ZA", "EG", "AE", "SA", "TR", "IN", "CN", "GB", "DE", "FR", "IT", "NL", "SE", "US", "CA", "AU"];
const regionName = (() => {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return (code: string) => names.of(code) ?? code;
  } catch {
    return (code: string) => code;
  }
})();

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

/** An Ethiopian mobile (09…, 07…, +2519…, +2517…) is the only kind that gets the confirmation SMS. */
function isEthiopianMobile(phone: string): boolean {
  const digits = phone.replace(/[^\d+]/g, "");
  return /^(\+?251|0)?[79]\d{8}$/.test(digits);
}

const initialsOf = (first: string, last: string) => ((first.trim()[0] ?? "") + (last.trim()[0] ?? "")).toUpperCase() || "?";

/** A line of the preview card: an icon and a value, or a faint placeholder when it's empty. */
function PreviewLine({ icon, value, empty }: { icon: ReactNode; value: string; empty: string }) {
  return (
    <p className={value ? "type-body-sm m-0 flex min-w-0 items-center gap-2 text-text-soft" : "type-body-sm m-0 flex items-center gap-2 text-text-faint"}>
      <span className="flex-none [&_svg]:size-4">{icon}</span>
      <span className="truncate">{value || empty}</span>
    </p>
  );
}

interface GuestFormProps {
  /** The guest being edited. Leave out to create one. */
  person?: Person;
  /** Persist. Throw an Error with a message to keep the form open and show it. */
  onSubmit: (input: PersonInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Create and edit page for a guest profile, laid out like the event and client forms: a live preview of the guest on the
 * left (and whether they'll get the SMS), who they are and how to reach them on the right.
 */
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
  const previewName = [values.firstName.trim(), values.lastName.trim()].filter(Boolean).join(" ");
  const phone = values.phone.trim();
  const getsSms = phone !== "" && isEthiopianMobile(phone);
  const country = values.country.trim().toUpperCase();
  // A stored code outside the short list still shows and stays selected.
  const countryOptions = [
    { value: NO_COUNTRY, label: "Not set" },
    ...[...COUNTRY_CODES, ...(country && !COUNTRY_CODES.includes(country) ? [country] : [])].map((code) => ({ value: code, label: regionName(code), right: code })),
  ];

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${fullName}` : "New guest"}</h1>
            <p className="type-body m-0 text-text-soft">{editing ? "Change their details." : "A guest profile you can register for any of your events."}</p>
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

      {(failure || errorCount > 0) && (
        <div className="flex flex-col gap-2">
          {failure && <ErrorBanner>{failure}</ErrorBanner>}
          {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}
        </div>
      )}

      <form id="guest-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-8">
        {/* Left: how the guest will look in your lists. Stays in view while the form scrolls. */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar initials={initialsOf(values.firstName, values.lastName)} size={48} />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className={previewName ? "type-h3 m-0 break-words text-text" : "type-h3 m-0 text-text-faint"}>{previewName || "Guest name"}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {phone ? (
                      <Pill tone={getsSms ? "success" : "neutral"} size="sm">
                        {getsSms ? "Gets the SMS" : "No SMS"}
                      </Pill>
                    ) : (
                      <Pill tone="neutral" size="sm">
                        No phone yet
                      </Pill>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <PreviewLine icon={<Phone />} value={phone} empty="No phone" />
                <PreviewLine icon={<Mail />} value={values.email.trim()} empty="No email" />
                <PreviewLine icon={<Building2 />} value={values.affiliation.trim()} empty="No organization" />
                <PreviewLine icon={<MapPin />} value={country ? regionName(country) : ""} empty="No country" />
              </div>
            </div>
          </Card>
          <p className="type-body-sm m-0 px-1 text-text-faint">Each guest is their own profile. A matching name or phone never merges two of them.</p>
        </aside>

        {/* Right: who they are, then how to reach them. */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="type-h3 m-0 px-1 text-text">Who they are</h2>
            <Card>
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="First name" htmlFor="gs-first" required error={errors.firstName}>
                    <Input id="gs-first" value={values.firstName} error={!!errors.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="e.g. Hana" autoComplete="off" autoFocus={!editing} />
                  </Field>
                  <Field label="Last name" htmlFor="gs-last">
                    <Input id="gs-last" value={values.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="e.g. Bekele" autoComplete="off" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Organization" htmlFor="gs-affiliation" hint="Optional. Where they work, if it matters.">
                    <Input id="gs-affiliation" value={values.affiliation} onChange={(e) => set("affiliation", e.target.value)} placeholder="e.g. ABC Bank" autoComplete="off" />
                  </Field>
                  <Field label="Country" htmlFor="gs-country" hint="Optional. Type to search.">
                    <Combobox id="gs-country" options={countryOptions} value={country || NO_COUNTRY} onValueChange={(v) => set("country", v === NO_COUNTRY ? "" : v)} placeholder="Search countries" emptyText="No country by that name" />
                  </Field>
                </div>
              </div>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 px-1">
              <h2 className="type-h3 m-0 text-text">How to reach them</h2>
              <p className="type-body-sm m-0 text-text-soft">An Ethiopian mobile gets the confirmation SMS with their code.</p>
            </div>
            <Card>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                  label="Phone"
                  htmlFor="gs-phone"
                  error={errors.phone}
                  hint={
                    phone ? (
                      getsSms ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="size-3.5" />
                          They&apos;ll get the SMS.
                        </span>
                      ) : (
                        "Not an Ethiopian mobile, so no SMS. They'll still be registered."
                      )
                    ) : (
                      "Optional. Ethiopian or international."
                    )
                  }
                >
                  <Input id="gs-phone" type="tel" inputMode="tel" value={values.phone} error={!!errors.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0911 204 412" autoComplete="off" />
                </Field>
                <Field label="Email" htmlFor="gs-email" error={errors.email} hint="Optional.">
                  <Input id="gs-email" type="email" value={values.email} error={!!errors.email} onChange={(e) => set("email", e.target.value)} placeholder="name@company.com" autoComplete="off" />
                </Field>
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
