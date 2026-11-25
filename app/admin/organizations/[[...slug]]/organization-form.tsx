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
import { Textarea } from "@/components/ui/textarea";
import type { Organization, OrganizationDefaults, OrganizationInput } from "@/lib/api/organizations";

interface Values {
  name: string;
  slug: string;
  description: string;
  branches: "off" | "on";
  branchName: string;
  branchCode: string;
  country: string;
  currency: string;
  timezone: string;
}
type Errors = Partial<Record<keyof Values, string>>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const startValues = (o?: Organization): Values => ({
  name: o?.name ?? "",
  slug: o?.slug ?? "",
  description: o?.description ?? "",
  branches: "off",
  branchName: "",
  branchCode: "",
  country: o?.country ?? "ET",
  currency: o?.default_currency ?? "ETB",
  timezone: o?.timezone ?? "Africa/Addis_Ababa",
});

/** A real IANA zone, as the API requires (`Africa/Addis_Ababa`). */
function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function validate(v: Values, editing: boolean): Errors {
  const e: Errors = {};
  if (editing) {
    if (!/^[A-Za-z]{2}$/.test(v.country.trim())) e.country = "Use the two-letter code, like ET.";
    if (!/^[A-Za-z]{3}$/.test(v.currency.trim())) e.currency = "Use the three-letter code, like ETB.";
    if (!isTimeZone(v.timezone.trim())) e.timezone = "Enter a real timezone name, like Africa/Addis_Ababa.";
    return e;
  }
  if (!v.name.trim()) e.name = "Enter the organization's name.";
  if (v.slug.trim() && !(v.slug.trim().length >= 2 && SLUG.test(v.slug.trim()))) e.slug = "Use at least 2 lower-case letters, numbers or hyphens, like selam-events.";
  const hasName = Boolean(v.branchName.trim());
  const hasCode = Boolean(v.branchCode.trim());
  if (hasName && !hasCode) e.branchCode = "Enter the branch code, or clear the name.";
  if (hasCode && !hasName) e.branchName = "Enter the branch name, or clear the code.";
  if (hasCode && !/^[A-Za-z0-9_]+$/.test(v.branchCode.trim())) e.branchCode = "Use letters, numbers and underscores only.";
  return e;
}

interface OrganizationFormProps {
  /** The organization being edited (only its defaults change). Leave out to create one. */
  organization?: Organization;
  onCreate: (input: OrganizationInput) => Promise<void>;
  onSaveDefaults: (changes: OrganizationDefaults) => Promise<void>;
  onCancel: () => void;
}

/**
 * Create page (name, slug, branches, first branch) and edit page (the organization's defaults for new events). The API
 * can't rename an organization or switch it off yet, so editing changes the defaults only.
 */
export function OrganizationForm({ organization, onCreate, onSaveDefaults, onCancel }: OrganizationFormProps) {
  const editing = Boolean(organization);
  const [start] = useState(() => startValues(organization));
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
    const next = validate(values, editing);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setFailure(null);
    setSaving(true);
    try {
      if (organization) {
        // Only what changed. Changing the timezone never moves existing events.
        const wanted = { country: values.country.trim().toUpperCase(), timezone: values.timezone.trim(), default_currency: values.currency.trim().toUpperCase() };
        const changes = Object.fromEntries(Object.entries(wanted).filter(([k, v]) => v !== organization[k as keyof Organization])) as OrganizationDefaults;
        await onSaveDefaults(changes);
      } else {
        const hasBranch = values.branchName.trim() && values.branchCode.trim();
        await onCreate({
          name: values.name.trim(),
          slug: values.slug.trim() || undefined,
          description: values.description.trim() || null,
          hasBranches: values.branches === "on",
          defaultBranch: hasBranch ? { name: values.branchName.trim(), code: values.branchCode.trim() } : undefined,
        });
      }
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "We couldn't save the organization. Try again.");
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
        <Breadcrumb items={[{ label: "Organizations", onClick: cancel }, ...(organization ? [{ label: organization.name, onClick: cancel }] : []), { label: editing ? "Edit defaults" : "New organization" }]} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Defaults for ${organization!.name}` : "New organization"}</h1>
            <p className="type-body m-0 text-text-soft">{editing ? "New events start with these. Changing them never changes existing events." : "The company or team that runs events."}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="organization-form" loading={saving} loadingLabel="Saving" disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create organization"}
            </Button>
          </div>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}

      <form id="organization-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {editing ? (
          <Card>
            <CardHeader title="Defaults for new events" subtitle="Where and in what money they happen." />
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Country code" htmlFor="og-country" required error={errors.country}>
                  <Input id="og-country" value={values.country} error={!!errors.country} onChange={(e) => set("country", e.target.value)} placeholder="ET" autoComplete="off" />
                </Field>
                <Field label="Currency" htmlFor="og-currency" required error={errors.currency}>
                  <Input id="og-currency" value={values.currency} error={!!errors.currency} onChange={(e) => set("currency", e.target.value)} placeholder="ETB" autoComplete="off" />
                </Field>
              </div>
              <Field label="Timezone" htmlFor="og-timezone" required error={errors.timezone} hint="The name of the zone, like Africa/Addis_Ababa.">
                <Input id="og-timezone" value={values.timezone} error={!!errors.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="Africa/Addis_Ababa" autoComplete="off" />
              </Field>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader title="Organization" subtitle="What it's called." />
              <div className="flex flex-col gap-4">
                <Field label="Name" htmlFor="og-name" required error={errors.name}>
                  <Input id="og-name" value={values.name} error={!!errors.name} onChange={(e) => set("name", e.target.value)} placeholder="Selam Events" autoComplete="off" />
                </Field>
                <Field label="Slug" htmlFor="og-slug" error={errors.slug} hint="Lower-case letters, numbers and hyphens. Left empty, we make one from the name. A name with no Latin letters, like Amharic, needs one.">
                  <Input id="og-slug" value={values.slug} error={!!errors.slug} onChange={(e) => set("slug", e.target.value)} placeholder="selam-events" autoComplete="off" />
                </Field>
                <Field label="Description" htmlFor="og-description" hint="Optional.">
                  <Textarea id="og-description" value={values.description} onChange={(e) => set("description", e.target.value)} />
                </Field>
              </div>
            </Card>

            <Card>
              <CardHeader title="Branches" subtitle="Most organizers have none. Leave the name and code empty and we'll make a hidden branch called MAIN." />
              <div className="flex flex-col gap-4">
                <Field label="Branch screens" hint="Turn on if this organization runs events from several offices. It also turns on when someone adds a branch.">
                  <SegmentedControl
                    aria-label="Branch screens"
                    value={values.branches}
                    onValueChange={(v) => set("branches", v as "off" | "on")}
                    options={[
                      { value: "off", label: "Off" },
                      { value: "on", label: "On" },
                    ]}
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Branch name" htmlFor="og-branch-name" error={errors.branchName}>
                    <Input id="og-branch-name" value={values.branchName} error={!!errors.branchName} onChange={(e) => set("branchName", e.target.value)} placeholder="Addis Office" autoComplete="off" />
                  </Field>
                  <Field label="Branch code" htmlFor="og-branch-code" error={errors.branchCode} hint="Letters, numbers and underscores.">
                    <Input id="og-branch-code" value={values.branchCode} error={!!errors.branchCode} onChange={(e) => set("branchCode", e.target.value)} placeholder="ADDIS" autoComplete="off" />
                  </Field>
                </div>
              </div>
            </Card>
          </>
        )}
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
