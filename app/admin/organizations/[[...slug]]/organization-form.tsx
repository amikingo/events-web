"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
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
  if (!v.name.trim()) e.name = "Enter the organization's name.";
  else if (v.name.trim().length > 255) e.name = "Use 255 characters or fewer.";
  if (v.description.trim().length > 4000) e.description = "Use 4,000 characters or fewer.";

  if (editing) {
    if (!/^[A-Za-z]{2}$/.test(v.country.trim())) e.country = "Use the two-letter code, like ET.";
    if (!/^[A-Za-z]{3}$/.test(v.currency.trim())) e.currency = "Use the three-letter code, like ETB.";
    if (!isTimeZone(v.timezone.trim())) e.timezone = "Enter a real timezone name, like Africa/Addis_Ababa.";
    return e;
  }

  if (v.slug.trim() && !(v.slug.trim().length >= 2 && SLUG.test(v.slug.trim()))) {
    e.slug = "Use at least 2 lower-case letters, numbers or hyphens, like selam-events.";
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

interface OrganizationFormProps {
  organization?: Organization;
  onCreate: (input: OrganizationInput) => Promise<void>;
  onSave: (changes: OrganizationUpdateInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Create page (name, slug, optional first Owner, branches) and edit page (name, description, and defaults for new
 * events). The slug never changes once created.
 */
export function OrganizationForm({ organization, onCreate, onSave, onCancel }: OrganizationFormProps) {
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
        const changes = Object.fromEntries(
          Object.entries(wanted).filter(([k, v]) => v !== organization[k as keyof Organization]),
        ) as OrganizationUpdateInput;
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
      if (!applyApiError(err)) {
        setFailure(describeApiError(err, "organization"));
      }
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
        <Breadcrumb
          items={[
            { label: "Organizations", onClick: cancel },
            ...(organization ? [{ label: organization.name, onClick: cancel }] : []),
            { label: editing ? "Edit organization" : "New organization" },
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${organization!.name}` : "New organization"}</h1>
            <p className="type-body m-0 text-text-soft">
              {editing ? "Update the organization's details and defaults for new events." : "The company or team that runs events."}
            </p>
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

      {failure && <ErrorBanner>{failure}</ErrorBanner>}
      {errorCount > 0 && <ErrorBanner>{errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}</ErrorBanner>}

      <form id="organization-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {editing ? (
          <>
            <Card>
              <CardHeader title="Organization" subtitle="What it's called." />
              <div className="flex flex-col gap-4">
                <Field label="Name" htmlFor="og-name" required error={errors.name}>
                  <Input
                    id="og-name"
                    value={values.name}
                    error={!!errors.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Selam Events"
                    maxLength={255}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Slug" htmlFor="og-slug" hint="The web address can't be changed, so event links keep working.">
                  <Input id="og-slug" value={values.slug} disabled autoComplete="off" />
                </Field>
                <Field label="Description" htmlFor="og-description" error={errors.description} hint="Optional.">
                  <Textarea
                    id="og-description"
                    value={values.description}
                    error={!!errors.description}
                    onChange={(e) => set("description", e.target.value)}
                    maxLength={4000}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <CardHeader title="Defaults for new events" subtitle="Changing them never changes existing events." />
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
          </>
        ) : (
          <>
            <Card>
              <CardHeader title="Organization" subtitle="What it's called." />
              <div className="flex flex-col gap-4">
                <Field label="Name" htmlFor="og-name" required error={errors.name}>
                  <Input id="og-name" value={values.name} error={!!errors.name} onChange={(e) => set("name", e.target.value)} placeholder="Selam Events" autoComplete="off" />
                </Field>
                <Field
                  label="Slug"
                  htmlFor="og-slug"
                  error={errors.slug}
                  hint="Lower-case letters, numbers and hyphens. Left empty, we make one from the name. A name with no Latin letters, like Amharic, needs one."
                >
                  <Input id="og-slug" value={values.slug} error={!!errors.slug} onChange={(e) => set("slug", e.target.value)} placeholder="selam-events" autoComplete="off" />
                </Field>
                <Field label="Description" htmlFor="og-description" error={errors.description} hint="Optional.">
                  <Textarea
                    id="og-description"
                    value={values.description}
                    error={!!errors.description}
                    onChange={(e) => set("description", e.target.value)}
                    maxLength={4000}
                  />
                </Field>
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader title="First Owner" subtitle="Optional. Give someone the Owner role right away." />
                <Field
                  label="Owner's mobile"
                  htmlFor="og-owner-mobile"
                  error={errors.ownerMobile}
                  hint="They need a Cheche account. You can also add the Owner later in Staff Assignments."
                >
                  <PhoneInput
                    id="og-owner-mobile"
                    value={values.ownerMobile}
                    error={!!errors.ownerMobile}
                    onValueChange={(v) => set("ownerMobile", v)}
                  />
                </Field>
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
            </div>
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
