"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TextLink } from "@/components/ui/text-link";
import type { HolderFields } from "@/lib/api/events";
import { settingFor } from "@/lib/checkout";
import type { HolderDraft, HolderErrors, HolderKey } from "@/lib/checkout";

/** Countries guests most often come from first; names from the browser, in English. Saved as the two-letter code. */
const COUNTRY_CODES = ["ET", "KE", "DJ", "ER", "SO", "SD", "SS", "UG", "TZ", "RW", "NG", "GH", "ZA", "EG", "AE", "SA", "TR", "IN", "CN", "GB", "DE", "FR", "IT", "NL", "SE", "US", "CA", "AU"];
const regionName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

interface HolderCardProps {
  /** 0-based; shown as "Ticket 1". */
  index: number;
  ticketTypeName: string;
  fields: HolderFields;
  value: HolderDraft;
  errors?: HolderErrors;
  onChange: (key: HolderKey, value: string) => void;
  /** One field per row: for a narrow column (the public event page's side panel). */
  stacked?: boolean;
  /** Optional details (mobile, email, organization, country) fold behind one "Add …" link, to keep the form short. */
  collapseOptional?: boolean;
  /** The buyer's mobile, already typed above: an empty Mobile here uses it (ticket 1 is usually the buyer). */
  phoneFallback?: string;
  /** Ticket 1 on a public Detailed event: the buyer's own mobile field takes the place of the guest's Mobile. */
  buyerPhone?: ReactNode;
}

/** How the folded details read in the "Add …" link. */
const MORE_WORDS: Partial<Record<HolderKey, string>> = { phone: "mobile", email: "email", affiliation: "organization", country: "country" };

/**
 * One ticket's guest on a Detailed event: "Ticket 1 · General Admission", then the details the event asks for.
 * Required ones are marked, optional ones say so, hidden ones aren't shown. Used by the public checkout and staff
 * "Issue tickets".
 */
export function HolderCard({ index, ticketTypeName, fields, value, errors = {}, onChange, stacked = false, collapseOptional = false, phoneFallback, buyerPhone }: HolderCardProps) {
  const [more, setMore] = useState(false);
  // Folded: an optional detail nobody has typed into and that has no error. Required ones always show.
  const folded = (key: HolderKey) => collapseOptional && !more && settingFor(fields, key) === "OPTIONAL" && !value[key] && !errors[key];
  const foldedKeys = (Object.keys(MORE_WORDS) as HolderKey[]).filter((key) => settingFor(fields, key) !== "HIDDEN" && folded(key));
  const join = (words: string[]) => (words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} or ${words[words.length - 1]}`);
  const pair = stacked ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-4 sm:grid-cols-2";
  const id = (key: HolderKey) => `holder-${index}-${key}`;
  const shown = (key: HolderKey) => settingFor(fields, key) !== "HIDDEN" && !folded(key);
  const required = (key: HolderKey) => settingFor(fields, key) === "REQUIRED";
  const hint = (key: HolderKey) => (required(key) ? undefined : "Optional.");

  if (fields.name === "HIDDEN") {
    return (
      <section aria-label={`Ticket ${index + 1}`} className="rounded-md border border-border bg-surface-2 px-4 py-3">
        <p className="type-body m-0 font-semibold text-text">
          Ticket {index + 1} · {ticketTypeName}
        </p>
        <p className="type-body-sm m-0 text-text-soft">This event doesn&apos;t ask for guests&apos; names: the ticket is unnamed.</p>
      </section>
    );
  }

  return (
    <section aria-label={`Ticket ${index + 1}`} className="flex flex-col gap-4 rounded-md border border-border p-4">
      <p className="type-body m-0 font-semibold text-text">
        Ticket {index + 1} · {ticketTypeName}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" htmlFor={id("firstName")} required={required("firstName")} error={errors.firstName} hint={hint("firstName")}>
          <Input id={id("firstName")} autoComplete="off" value={value.firstName} error={!!errors.firstName} onChange={(e) => onChange("firstName", e.target.value)} />
        </Field>
        <Field label="Last name" htmlFor={id("lastName")} error={errors.lastName}>
          <Input id={id("lastName")} autoComplete="off" value={value.lastName} error={!!errors.lastName} onChange={(e) => onChange("lastName", e.target.value)} />
        </Field>
      </div>
      {(buyerPhone || shown("phone") || shown("email")) && (
        <div className={pair}>
          {buyerPhone ?? (shown("phone") && (
            <Field
              label="Mobile"
              htmlFor={id("phone")}
              required={required("phone") && !phoneFallback}
              error={errors.phone}
              hint={phoneFallback ? `Leave it empty to use ${phoneFallback}.` : hint("phone")}
            >
              <Input id={id("phone")} type="tel" inputMode="tel" autoComplete="off" placeholder="0911 234 567" value={value.phone} error={!!errors.phone} onChange={(e) => onChange("phone", e.target.value)} />
            </Field>
          ))}
          {shown("email") && (
            <Field label="Email" htmlFor={id("email")} required={required("email")} error={errors.email} hint={hint("email")}>
              <Input id={id("email")} type="email" autoComplete="off" placeholder="name@company.com" value={value.email} error={!!errors.email} onChange={(e) => onChange("email", e.target.value)} />
            </Field>
          )}
        </div>
      )}
      {(shown("affiliation") || shown("country")) && (
        <div className={pair}>
          {shown("affiliation") && (
            <Field label="Organization or affiliation" htmlFor={id("affiliation")} required={required("affiliation")} error={errors.affiliation} hint={hint("affiliation")}>
              <Input id={id("affiliation")} autoComplete="off" value={value.affiliation} error={!!errors.affiliation} onChange={(e) => onChange("affiliation", e.target.value)} />
            </Field>
          )}
          {shown("country") && (
            <Field label="Country" htmlFor={id("country")} required={required("country")} error={errors.country} hint={required("country") ? "Type to search." : "Optional. Type to search."}>
              <Combobox
                id={id("country")}
                options={COUNTRY_CODES.map((code) => ({ value: code, label: regionName(code) }))}
                value={value.country}
                onValueChange={(v) => onChange("country", v)}
                placeholder="Search countries"
                emptyText="No country by that name"
                error={!!errors.country}
              />
            </Field>
          )}
        </div>
      )}
      {foldedKeys.length > 0 && (
        <div>
          <TextLink onClick={() => setMore(true)}>+ Add {join(foldedKeys.map((k) => MORE_WORDS[k]!))}</TextLink>
        </div>
      )}
    </section>
  );
}
