"use client";

import { Building2, Clock, Coins, GitBranch, Link2, MapPin, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { Input, InputAddon, InputGroup } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import type { Organization, OrganizationInput, OrganizationUpdateInput } from "@/lib/api/organizations";
import { isValidPhone, phoneDigits } from "@/lib/marketplace/validation";

interface Values {
  name: string;
  slug: string;
  description: string;
  branches: "off" | "on";
  branchName: string;
  branchCode: string;
  ownerMobile: string;
  country: string;
  currency: string;
  timezone: string;
}
type Errors = Partial<Record<keyof Values, string>>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Countries an organizer is most likely in first; names come from the browser, in English. */
const COUNTRY_CODES = ["ET", "KE", "DJ", "ER", "SO", "SD", "SS", "UG", "TZ", "RW", "NG", "GH", "ZA", "EG", "AE", "SA", "TR", "IN", "CN", "GB", "DE", "FR", "IT", "NL", "SE", "US", "CA", "AU"];
const CURRENCY_CODES = ["ETB", "USD", "EUR", "GBP", "KES", "AED", "SAR", "CNY"];
const COMMON_ZONES = ["Africa/Addis_Ababa", "Africa/Nairobi", "Africa/Djibouti", "Africa/Cairo", "Africa/Lagos", "Africa/Johannesburg", "Asia/Dubai", "Europe/London", "Europe/Berlin", "America/New_York", "UTC"];

function displayName(type: "region" | "currency", code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Every zone the browser knows, the common ones first; falls back to the short list on old browsers. */
function allTimeZones(): string[] {
  const supported = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  return [...COMMON_ZONES, ...supported.filter((z) => !COMMON_ZONES.includes(z))];
}

/** "Africa/Addis_Ababa" → "GMT+3", for the right side of the timezone list. */
function zoneOffset(zone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

const startValues = (o?: Organization): Values => ({
  name: o?.name ?? "",
  slug: o?.slug ?? "",
  description: o?.description ?? "",
  branches: "off",
  branchName: "",
  branchCode: "",
  ownerMobile: "",
  country: o?.country ?? "ET",
  currency: o?.default_currency ?? "ETB",
  timezone: o?.timezone ?? "Africa/Addis_Ababa",
});

/** "Selam Events!" → "selam-events": a preview of the address the API makes from the name. */
const slugFrom = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

function validate(v: Values, editing: boolean): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Enter the organization's name.";
  else if (v.name.trim().length > 255) e.name = "Use 255 characters or fewer.";
  if (v.description.trim().length > 4000) e.description = "Use 4,000 characters or fewer.";
  if (editing) return e;

  if (v.slug.trim() && !(v.slug.trim().length >= 2 && SLUG.test(v.slug.trim()))) {
    e.slug = "Use at least 2 lower-case letters, numbers or hyphens, like selam-events.";
  } else if (!v.slug.trim() && v.name.trim() && slugFrom(v.name).length < 2) {
    e.slug = "This name has no Latin letters, so we can't make an address from it. Type one, like selam-events.";
  }
  const hasName = Boolean(v.branchName.trim());
  const hasCode = Boolean(v.branchCode.trim());
  if (hasName && !hasCode) e.branchCode = "Enter the branch code, or clear the name.";
  if (hasCode && !hasName) e.branchName = "Enter the branch name, or clear the code.";
  if (hasCode && !/^[A-Za-z0-9_]+$/.test(v.branchCode.trim())) e.branchCode = "Use letters, numbers and underscores only.";
  if (phoneDigits(v.ownerMobile) && !isValidPhone(v.ownerMobile)) {
    e.ownerMobile = "Enter a 9-digit number starting with 9 or 7.";
  }
  return e;
}

/** One line of a settings list: an icon, what it is, and its control on the right. Stacks on a phone. */
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
        {children && <div className="flex w-full flex-none sm:w-auto sm:justify-end">{children}</div>}
      </div>
      {below}
    </div>
  );
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

interface OrganizationFormProps {
  organization?: Organization;
  onCreate: (input: OrganizationInput) => Promise<void>;
  onSave: (changes: OrganizationUpdateInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Create page (name, web address, optional first Owner, branches) and edit page (name, description, and defaults for new
 * events), laid out like the event form: a live preview on the left, the fields on the right. The address never changes
 * once created.
 */
export function OrganizationForm({ organization, onCreate, onSave, onCancel }: OrganizationFormProps) {
  const editing = Boolean(organization);
  const [start] = useState(() => startValues(organization));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [zones] = useState(allTimeZones);
  const dirty = (Object.keys(start) as (keyof Values)[]).some((k) => values[k] !== start[k]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function toggleBranches(on: boolean) {
    setValues((v) => ({ ...v, branches: on ? "on" : "off", ...(on ? {} : { branchName: "", branchCode: "" }) }));
    if (!on) setErrors((e) => ({ ...e, branchName: undefined, branchCode: undefined }));
  }

  function applyApiError(err: unknown): boolean {
    if (!(err instanceof ApiError)) return false;

    if (err.code === "central_account_not_found") {
      setErrors((prev) => ({ ...prev, ownerMobile: "This number has no Cheche account yet. Ask them to sign up first, then try again." }));
      return true;
    }
    if (err.code === "central_auth_unavailable") {
      toast.error("Cheche accounts can't be reached right now. Try again.");
      return true;
    }
    if (err.code === "conflict") {
      const field = (err.details as { field?: string } | undefined)?.field;
      if (field === "user_id") {
        setErrors((prev) => ({ ...prev, ownerMobile: "This person is already staff of another organization." }));
        return true;
      }
      if (field === "slug") {
        setErrors((prev) => ({ ...prev, slug: "Another organization already uses this web address. Use a different one." }));
        return true;
      }
    }
    if (err.code === "validation_error") {
      const issues = (err.details as { issues?: Array<{ path?: string; message?: string }> } | undefined)?.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        const next: Errors = {};
        const unmatched: string[] = [];
        for (const issue of issues) {
          const path = issue.path ?? "";
          const msg = issue.message ?? "Check this value.";
          if (path === "body.name" || path === "body.organization.name") next.name = msg;
          else if (path === "body.organization.slug") next.slug = msg;
          else if (path === "body.description" || path === "body.organization.description") next.description = msg;
          else if (path === "body.country") next.country = msg;
          else if (path === "body.timezone") next.timezone = msg;
          else if (path === "body.default_currency") next.currency = msg;
          else if (path === "body.owner_mobile") next.ownerMobile = msg;
          else if (path === "body.default_branch.name") next.branchName = msg;
          else if (path === "body.default_branch.code") next.branchCode = msg;
          else unmatched.push(msg);
        }
        setErrors(next);
        if (unmatched.length > 0) setFailure(unmatched[0]!);
        return true;
      }
    }
    return false;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate(values, editing);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setFailure(null);
    setSaving(true);
    try {
      if (organization) {
        // Only what changed. Changing the timezone never moves existing events.
        const wanted: Required<OrganizationUpdateInput> = {
          name: values.name.trim(),
          description: values.description.trim() || null,
          country: values.country.trim().toUpperCase(),
          timezone: values.timezone.trim(),
          default_currency: values.currency.trim().toUpperCase(),
        };
        const changes = Object.fromEntries(Object.entries(wanted).filter(([k, v]) => v !== organization[k as keyof Organization])) as OrganizationUpdateInput;
        await onSave(changes);
      } else {
        const hasBranch = values.branchName.trim() && values.branchCode.trim();
        const digits = phoneDigits(values.ownerMobile);
        await onCreate({
          name: values.name.trim(),
          slug: values.slug.trim() || undefined,
          description: values.description.trim() || null,
          hasBranches: values.branches === "on",
          defaultBranch: hasBranch ? { name: values.branchName.trim(), code: values.branchCode.trim() } : undefined,
          ...(digits ? { ownerMobile: `+251${digits}` } : {}),
        });
      }
    } catch (err) {
      if (!applyApiError(err)) setFailure(describeApiError(err, "organization"));
      setSaving(false);
    }
  }

  function cancel() {
    if (dirty) setDiscardOpen(true);
    else onCancel();
  }

  const errorCount = Object.values(errors).filter(Boolean).length;
  const name = values.name.trim();
  const suggestedSlug = slugFrom(values.name);
  const address = values.slug.trim() || suggestedSlug;
  const branchesOn = values.branches === "on";
  const ownerDigits = phoneDigits(values.ownerMobile);

  const countryOptions = [...COUNTRY_CODES, ...(COUNTRY_CODES.includes(values.country) ? [] : [values.country])].map((code) => ({ value: code, label: displayName("region", code), right: code }));
  const currencyOptions = [...CURRENCY_CODES, ...(CURRENCY_CODES.includes(values.currency) ? [] : [values.currency])].map((code) => ({ value: code, label: `${code} · ${displayName("currency", code)}` }));
  const zoneOptions = [...zones, ...(zones.includes(values.timezone) ? [] : [values.timezone])].map((zone) => ({
    value: zone,
    label: zone.replace(/_/g, " "),
    group: COMMON_ZONES.includes(zone) ? "Common" : "All timezones",
    right: zoneOffset(zone),
  }));

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${organization!.name}` : "New organization"}</h1>
            <p className="type-body m-0 text-text-soft">{editing ? "Update the organization's details and defaults for new events." : "The company or team that runs events."}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="organization-form" loading={saving} loadingLabel={editing ? "Saving" : "Creating"} disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create organization"}
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

      <form id="organization-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-8">
        {/* Left: a live preview of the organization. Stays in view while the form scrolls. */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar initials={initialsOf(name)} size={48} />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className={name ? "type-h3 m-0 break-words text-text" : "type-h3 m-0 text-text-faint"}>{name || "Organization name"}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone="neutral" size="sm">
                      {editing ? (organization!.has_branches ? "Branches on" : "No branches") : branchesOn ? "Branches on" : "No branches"}
                    </Pill>
                    {!editing && ownerDigits && (
                      <Pill tone="neutral" size="sm">
                        Owner added
                      </Pill>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <PreviewLine icon={<Link2 />} value={address ? `events/${address}` : ""} empty="Web address from the name" />
                {editing ? (
                  <>
                    <PreviewLine icon={<MapPin />} value={displayName("region", values.country)} empty="No country" />
                    <PreviewLine icon={<Coins />} value={values.currency} empty="No currency" />
                    <PreviewLine icon={<Clock />} value={`${values.timezone.replace(/_/g, " ")} ${zoneOffset(values.timezone)}`.trim()} empty="No timezone" />
                  </>
                ) : (
                  <PreviewLine icon={<ShieldCheck />} value={ownerDigits ? `Owner: +251 ${values.ownerMobile}` : ""} empty="No Owner yet" />
                )}
              </div>
            </div>
          </Card>
          <p className="type-body-sm m-0 px-1 text-text-faint">
            {editing ? "The web address never changes, so event links keep working." : "The web address is fixed once it's created, so event links keep working."}
          </p>
        </aside>

        {/* Right: who they are, then the settings most people leave as they are. */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="type-h3 m-0 px-1 text-text">About the organization</h2>
            <Card>
              <div className="flex flex-col gap-5">
                <Field label="Name" htmlFor="og-name" required error={errors.name}>
                  <Input id="og-name" value={values.name} error={!!errors.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Selam Events" maxLength={255} autoComplete="off" autoFocus={!editing} />
                </Field>
                <Field
                  label="Web address"
                  htmlFor="og-slug"
                  error={errors.slug}
                  hint={
                    editing
                      ? "It can't change, so event links keep working."
                      : values.slug.trim()
                        ? "Lower-case letters, numbers and hyphens."
                        : suggestedSlug.length >= 2
                          ? `Left empty, it will be ${suggestedSlug}.`
                          : "Made from the name if left empty. A name with no Latin letters, like Amharic, needs one typed."
                  }
                >
                  <InputGroup
                    id="og-slug"
                    leading={<InputAddon>events/</InputAddon>}
                    value={values.slug}
                    disabled={editing}
                    error={!!errors.slug}
                    onChange={(e) => set("slug", e.target.value.toLowerCase())}
                    placeholder={suggestedSlug || "selam-events"}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>
                <Field label="Description" htmlFor="og-description" error={errors.description} hint="Optional. What they do, in a sentence or two.">
                  <Textarea id="og-description" rows={4} value={values.description} error={!!errors.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} placeholder="e.g. Conferences and launches for banks in Addis Ababa." />
                </Field>
              </div>
            </Card>
          </section>

          {editing ? (
            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5 px-1">
                <h2 className="type-h3 m-0 text-text">Defaults for new events</h2>
                <p className="type-body-sm m-0 text-text-soft">Changing them never changes existing events.</p>
              </div>
              <Card>
                <div className="flex flex-col">
                  <OptionRow icon={<MapPin />} title="Country" hint="Where the organization is based." error={errors.country}>
                    <div className="w-full sm:w-[260px]">
                      <Combobox id="og-country" options={countryOptions} value={values.country} onValueChange={(v) => set("country", v)} placeholder="Search countries" emptyText="No country by that name" error={!!errors.country} />
                    </div>
                  </OptionRow>
                  <OptionRow icon={<Coins />} title="Currency" hint="For ticket prices." error={errors.currency}>
                    <div className="w-full sm:w-[260px]">
                      <Select id="og-currency" options={currencyOptions} value={values.currency} onValueChange={(v) => set("currency", v)} />
                    </div>
                  </OptionRow>
                  <OptionRow icon={<Clock />} title="Timezone" hint="New events' times are typed in it." error={errors.timezone}>
                    <div className="w-full sm:w-[260px]">
                      <Combobox id="og-timezone" options={zoneOptions} value={values.timezone} onValueChange={(v) => set("timezone", v)} placeholder="Search timezones" emptyText="No timezone by that name" error={!!errors.timezone} />
                    </div>
                  </OptionRow>
                </div>
              </Card>
            </section>
          ) : (
            <section className="flex flex-col gap-3">
              <h2 className="type-h3 m-0 px-1 text-text">Setup</h2>
              <Card>
                <div className="flex flex-col">
                  <OptionRow
                    icon={<ShieldCheck />}
                    title="First Owner"
                    hint="Optional. They need a Cheche account. You can also add one later in Staff Assignments."
                    error={errors.ownerMobile}
                    below={
                      <div className="sm:pl-11">
                        <PhoneInput id="og-owner-mobile" aria-label="Owner's mobile" value={values.ownerMobile} error={!!errors.ownerMobile} onValueChange={(v) => set("ownerMobile", v)} />
                      </div>
                    }
                  />
                  <OptionRow
                    icon={branchesOn ? <GitBranch /> : <Building2 />}
                    title="Several offices"
                    hint={branchesOn ? "Branch screens are on. Name the first branch, or leave it empty for MAIN." : "Most organizers have one office. Turn on to manage branches."}
                    error={errors.branchName ?? errors.branchCode}
                    below={
                      branchesOn && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:pl-11">
                          <Field label="First branch name" htmlFor="og-branch-name" error={errors.branchName}>
                            <Input id="og-branch-name" value={values.branchName} error={!!errors.branchName} onChange={(e) => set("branchName", e.target.value)} placeholder="e.g. Addis Office" autoComplete="off" />
                          </Field>
                          <Field label="Branch code" htmlFor="og-branch-code" error={errors.branchCode} hint="Letters, numbers and underscores.">
                            <Input
                              id="og-branch-code"
                              value={values.branchCode}
                              error={!!errors.branchCode}
                              onChange={(e) => set("branchCode", e.target.value.toUpperCase())}
                              placeholder="e.g. ADDIS"
                              autoComplete="off"
                              spellCheck={false}
                            />
                          </Field>
                        </div>
                      )
                    }
                  >
                    <Switch checked={branchesOn} onCheckedChange={toggleBranches} aria-label="Several offices" />
                  </OptionRow>
                </div>
              </Card>
            </section>
          )}
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
