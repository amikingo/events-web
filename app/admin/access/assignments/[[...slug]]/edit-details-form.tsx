"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Mail, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { getStaffAccountDetails } from "@/lib/api/staff";
import type { StaffAccountDetails, StaffAssignment, StaffProfileUpdateInput } from "@/lib/api/staff";
import { nationalMobile } from "@/lib/checkout";
import { formatDateShort } from "@/lib/ethiopian-datetime";
import { staffQk } from "@/lib/query-keys";

const NOT_SET = "none";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Values = { firstname: string; middlename: string; lastname: string; email: string; sex: string; dateOfBirth: string };

const valuesOf = (d: StaffAccountDetails): Values => ({
  firstname: d.firstname ?? "",
  middlename: d.middlename ?? "",
  lastname: d.lastname ?? "",
  email: d.email ?? "",
  sex: d.sex ?? NOT_SET,
  dateOfBirth: d.date_of_birth ?? "",
});

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/** Today as `YYYY-MM-DD` in Addis Ababa: a date of birth can't be later. */
const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());

interface EditDetailsFormProps {
  organizationId: string;
  assignment: StaffAssignment;
  /** Persist only the changed fields. Throw to keep the form open and show it. */
  onSubmit: (changes: StaffProfileUpdateInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Edit details for a staff member (Phase 10): names, email, sex and date of birth, from their Cheche account. The mobile
 * is the sign-in and stays read-only. Only changed fields are sent; clearing an optional field sends "".
 */
export function EditDetailsForm({ organizationId, assignment, onSubmit, onCancel }: EditDetailsFormProps) {
  const details = useQuery({
    queryKey: staffQk.account(organizationId, assignment.id),
    queryFn: ({ signal }) => getStaffAccountDetails(organizationId, assignment.id, signal),
  });

  if (details.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton shape="title" />
        <Skeleton shape="block" height={320} />
      </div>
    );
  }
  if (details.isError) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load their details"
        description={describeApiError(details.error, "person")}
        actions={<Button onClick={onCancel}>Back</Button>}
      />
    );
  }
  return <DetailsForm details={details.data} assignment={assignment} onSubmit={onSubmit} onCancel={onCancel} />;
}

function DetailsForm({ details, assignment, onSubmit, onCancel }: { details: StaffAccountDetails; assignment: StaffAssignment; onSubmit: EditDetailsFormProps["onSubmit"]; onCancel: () => void }) {
  const [start] = useState(() => valuesOf(details));
  const [values, setValues] = useState<Values>(start);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  /** Only what changed: names trimmed, an emptied optional field sent as "". */
  function changes(): StaffProfileUpdateInput {
    const c: StaffProfileUpdateInput = {};
    if (values.firstname.trim() !== start.firstname) c.firstname = values.firstname.trim();
    if (values.middlename.trim() !== start.middlename) c.middlename = values.middlename.trim();
    if (values.lastname.trim() !== start.lastname) c.lastname = values.lastname.trim();
    if (values.email.trim() !== start.email) c.email = values.email.trim();
    if (values.sex !== start.sex) c.sex = values.sex === NOT_SET ? null : (values.sex as "MALE" | "FEMALE");
    if (values.dateOfBirth !== start.dateOfBirth) c.date_of_birth = values.dateOfBirth || "";
    return c;
  }
  const dirty = Object.keys(changes()).length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Partial<Record<keyof Values, string>> = {};
    if (!values.firstname.trim()) next.firstname = "Enter a first name.";
    if (!values.lastname.trim()) next.lastname = "Enter a last name.";
    for (const key of ["firstname", "middlename", "lastname"] as const) if (values[key].trim().length > 100) next[key] = "Use 100 characters or fewer.";
    if (values.email.trim() && !EMAIL.test(values.email.trim())) next.email = "Enter an email like name@example.com, or leave it empty.";
    if (values.dateOfBirth && values.dateOfBirth >= todayIso()) next.dateOfBirth = "Pick a date in the past.";
    setErrors(next);
    setFailure(null);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSubmit(changes());
    } catch (err) {
      const issues = err instanceof ApiError ? ((err.details as { issues?: { path?: string; message?: string }[] } | undefined)?.issues ?? []) : [];
      const fieldOf: Record<string, keyof Values> = { firstname: "firstname", middlename: "middlename", lastname: "lastname", email: "email", sex: "sex", date_of_birth: "dateOfBirth" };
      const mapped = Object.fromEntries(issues.map((i) => [fieldOf[(i.path ?? "").replace(/^body\./, "")], i.message ?? "Check this field."]).filter(([k]) => k));
      if (Object.keys(mapped).length) setErrors(mapped);
      else setFailure(err instanceof ApiError ? describeApiError(err, "person") : err instanceof Error ? err.message : "We couldn't save the details. Try again.");
      setSaving(false);
    }
  }

  function cancel() {
    if (dirty) setDiscardOpen(true);
    else onCancel();
  }

  const previewName = [values.firstname, values.middlename, values.lastname].map((s) => s.trim()).filter(Boolean).join(" ") || "Their name";
  const sexLabel = values.sex === "MALE" ? "Male" : values.sex === "FEMALE" ? "Female" : null;

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">Edit details</h1>
          <p className="type-body m-0 text-text-soft">Their Cheche account. Changes show everywhere they sign in.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" type="button" onClick={cancel}>
            Cancel
          </Button>
          <Button type="submit" form="details-form" loading={saving} loadingLabel="Saving" disabled={!dirty}>
            Save details
          </Button>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-8">
        {/* Left: the person as they'll look, updating as you type. */}
        <aside className="lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar initials={initialsOf(previewName)} size={48} />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="type-h3 m-0 break-words text-text">{previewName}</p>
                  <div>
                    <Pill tone="neutral" size="sm">
                      {assignment.role.name}
                    </Pill>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="type-body-sm m-0 flex items-center gap-2 text-text-soft">
                  <Phone className="size-4 flex-none" />
                  {details.mobile ? nationalMobile(details.mobile) : "No mobile"}
                </p>
                <p className="type-body-sm m-0 flex items-center gap-2 text-text-soft">
                  <Mail className="size-4 flex-none" />
                  {values.email.trim() || "No email"}
                </p>
                <p className="type-body-sm m-0 flex items-center gap-2 text-text-soft">
                  <UserRound className="size-4 flex-none" />
                  {sexLabel ?? "Sex not set"}
                </p>
                <p className="type-body-sm m-0 flex items-center gap-2 text-text-soft">
                  <CalendarDays className="size-4 flex-none" />
                  {values.dateOfBirth ? `Born ${formatDateShort(`${values.dateOfBirth}T12:00:00Z`, "Africa/Addis_Ababa")}` : "Date of birth not set"}
                </p>
              </div>
            </div>
          </Card>
        </aside>

        {/* Right: the fields. */}
        <form id="details-form" onSubmit={submit} noValidate className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Name" subtitle="As it shows to everyone." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="First name" htmlFor="sd-first" required error={errors.firstname}>
                <Input id="sd-first" value={values.firstname} error={!!errors.firstname} onChange={(e) => set("firstname", e.target.value)} autoComplete="off" />
              </Field>
              <Field label="Middle name" htmlFor="sd-middle" hint="Optional." error={errors.middlename}>
                <Input id="sd-middle" value={values.middlename} error={!!errors.middlename} onChange={(e) => set("middlename", e.target.value)} autoComplete="off" />
              </Field>
              <Field label="Last name" htmlFor="sd-last" required error={errors.lastname}>
                <Input id="sd-last" value={values.lastname} error={!!errors.lastname} onChange={(e) => set("lastname", e.target.value)} autoComplete="off" />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Contact and personal" subtitle="Optional. Empty a field to clear it." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Mobile" htmlFor="sd-mobile" hint="Their sign-in. It can't be changed here.">
                <Input id="sd-mobile" value={details.mobile ? nationalMobile(details.mobile) : "None"} readOnly disabled />
              </Field>
              <Field label="Email" htmlFor="sd-email" error={errors.email}>
                <Input id="sd-email" type="email" value={values.email} error={!!errors.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" autoComplete="off" />
              </Field>
              <Field label="Sex" htmlFor="sd-sex" error={errors.sex}>
                <Select
                  id="sd-sex"
                  options={[
                    { value: NOT_SET, label: "Not set" },
                    { value: "MALE", label: "Male" },
                    { value: "FEMALE", label: "Female" },
                  ]}
                  value={values.sex}
                  onValueChange={(v) => set("sex", v)}
                />
              </Field>
              <Field label="Date of birth" htmlFor="sd-dob" error={errors.dateOfBirth} hint="Ethiopian or Gregorian calendar.">
                <DatePicker id="sd-dob" calendars={["ec", "gc"]} value={values.dateOfBirth} onValueChange={(v) => set("dateOfBirth", v)} max={todayIso()} placeholder="Not set" />
              </Field>
            </div>
          </Card>
        </form>
      </div>

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
