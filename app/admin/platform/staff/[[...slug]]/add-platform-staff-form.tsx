"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { CheckIcon, InfoIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { assignPlatformStaff, listPlatformRoles } from "@/lib/api/platform";
import type { StaffAssignment } from "@/lib/api/staff";
import { groupPhone, phoneDigits, validatePhone } from "@/lib/marketplace/validation";
import { platformRoleQk, platformStaffQk } from "@/lib/query-keys";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALL_CHARS = `${UPPER}${LOWER}${DIGITS}${SYMBOLS}`;

function generatePassword(length = 12): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  const picks = [
    UPPER[bytes[0]! % UPPER.length]!,
    LOWER[bytes[1]! % LOWER.length]!,
    DIGITS[bytes[2]! % DIGITS.length]!,
    SYMBOLS[bytes[3]! % SYMBOLS.length]!,
  ];
  for (let i = 4; i < length; i++) {
    picks.push(ALL_CHARS[bytes[i]! % ALL_CHARS.length]!);
  }
  const shuffleBytes = new Uint32Array(picks.length);
  crypto.getRandomValues(shuffleBytes);
  for (let i = picks.length - 1; i > 0; i--) {
    const j = shuffleBytes[i]! % (i + 1);
    const tmp = picks[i]!;
    picks[i] = picks[j]!;
    picks[j] = tmp;
  }
  return picks.join("");
}

function nationalMobile(raw: string): string {
  const grouped = groupPhone(raw);
  return grouped ? `0${grouped}` : raw;
}

const nameOf = (p: StaffAssignment["profile"]) =>
  (p ? [p.firstname, p.middlename, p.lastname].filter(Boolean).join(" ") : "") || "New platform staff";

type Errors = {
  mobile?: string;
  firstname?: string;
  middlename?: string;
  lastname?: string;
  password?: string;
  role?: string;
};

interface HandoverState {
  assignmentId: string;
  name: string;
  mobileDisplay: string;
  password: string;
}

/** Add platform staff by mobile number and platform role, creating a Cheche account when `central_account_not_found` arrives. */
export function AddPlatformStaffForm({ onDone }: { onDone: (assignmentId?: string) => void }) {
  const queryClient = useQueryClient();
  const [mobile, setMobile] = useState("");
  const [missingAccount, setMissingAccount] = useState(false);
  const [firstname, setFirstname] = useState("");
  const [middlename, setMiddlename] = useState("");
  const [lastname, setLastname] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [handover, setHandover] = useState<HandoverState | null>(null);
  const [copied, setCopied] = useState(false);

  const roles = useQuery({ queryKey: platformRoleQk.list(), queryFn: ({ signal }) => listPlatformRoles(signal) });
  const e164 = `+251${phoneDigits(mobile)}`;

  const assign = useMutation({
    mutationFn: () =>
      assignPlatformStaff({
        mobile: e164,
        role_id: roleId,
        ...(missingAccount
          ? {
              new_account: {
                firstname: firstname.trim(),
                ...(middlename.trim() ? { middlename: middlename.trim() } : {}),
                lastname: lastname.trim(),
                password,
              },
            }
          : {}),
      }),
    onSuccess: ({ assignment, roleGiven, accountCreated }) => {
      void queryClient.invalidateQueries({ queryKey: platformStaffQk.all() });
      void queryClient.invalidateQueries({ queryKey: platformRoleQk.all() });

      if (accountCreated) {
        const typedName = [firstname.trim(), middlename.trim(), lastname.trim()].filter(Boolean).join(" ");
        setHandover({
          assignmentId: assignment.id,
          name: typedName || nameOf(assignment.profile),
          mobileDisplay: nationalMobile(e164),
          password,
        });
        setPassword("");
        return;
      }

      setPassword("");
      if (roleGiven) {
        toast.success("Platform staff assignment created", {
          body: `${nameOf(assignment.profile)} now has the ${assignment.role.name} role.`,
        });
      } else {
        toast.info("Already has this platform role", { body: "Nothing changed." });
      }
      onDone(assignment.id);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === "central_account_not_found") {
          setMissingAccount(true);
          setFailure(null);
          return;
        }
        if (error.code === "conflict" && (error.details as { field?: string } | undefined)?.field === "user_id") {
          setErrors((prev) => ({ ...prev, mobile: describeApiError(error, "platform person") }));
          return;
        }
        if (error.code === "validation_error") {
          const issues = (error.details as { issues?: Array<{ path?: string; message?: string }> } | undefined)?.issues;
          if (Array.isArray(issues) && issues.length > 0) {
            const nextErrors: Errors = {};
            const unmatched: string[] = [];
            for (const issue of issues) {
              const path = issue.path ?? "";
              const msg = issue.message ?? "Check this value.";
              if (path === "body.new_account.firstname") nextErrors.firstname = msg;
              else if (path === "body.new_account.middlename") nextErrors.middlename = msg;
              else if (path === "body.new_account.lastname") nextErrors.lastname = msg;
              else if (path === "body.new_account.password") nextErrors.password = msg;
              else if (path === "body.mobile") nextErrors.mobile = msg;
              else if (path === "body.role_id") nextErrors.role = msg;
              else unmatched.push(msg);
            }
            setErrors(nextErrors);
            if (unmatched.length > 0) setFailure(unmatched[0]!);
            return;
          }
        }
      }
      setFailure(describeApiError(error, "platform person"));
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Errors = {};
    const phoneError = validatePhone(mobile);
    if (phoneError) nextErrors.mobile = phoneError;
    if (!roleId) nextErrors.role = "Choose a platform role.";

    if (missingAccount) {
      if (!firstname.trim()) nextErrors.firstname = "Enter their first name.";
      else if (firstname.trim().length > 100) nextErrors.firstname = "Use 100 characters or fewer.";
      if (middlename.trim().length > 100) nextErrors.middlename = "Use 100 characters or fewer.";
      if (!lastname.trim()) nextErrors.lastname = "Enter their last name.";
      else if (lastname.trim().length > 100) nextErrors.lastname = "Use 100 characters or fewer.";
      if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
      else if (password.length > 128) nextErrors.password = "Use 128 characters or fewer.";
    }

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setFailure(null);
    assign.mutate();
  }

  function closeHandover() {
    if (!handover) return;
    const id = handover.assignmentId;
    setHandover(null);
    setPassword("");
    setCopied(false);
    onDone(id);
  }

  async function copyHandover() {
    if (!handover) return;
    try {
      await navigator.clipboard.writeText(`Mobile: ${handover.mobileDisplay}\nPassword: ${handover.password}`);
      setCopied(true);
      toast.info("Sign-in details copied");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  if (handover) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Breadcrumb items={[{ label: "Platform staff", onClick: closeHandover }, { label: "Sign-in details" }]} />
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">Cheche account created</h1>
            <p className="type-body m-0 text-text-soft">Share these one-time details with {handover.name}.</p>
          </div>
        </div>

        <Card className="max-w-xl">
          <CardHeader title="Hand-over details" />
          <div className="flex flex-col gap-4">
            <Note icon={<InfoIcon />}>
              Give {handover.name} these sign-in details: mobile <b className="text-text">{handover.mobileDisplay}</b>, password{" "}
              <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-text">{handover.password}</code>. You won&apos;t see the password again.
            </Note>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" type="button" onClick={() => void copyHandover()}>
                {copied && <CheckIcon className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button type="button" onClick={closeHandover}>
                Done
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const activeRoles = (roles.data ?? []).filter((r) => r.is_active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb items={[{ label: "Platform staff", onClick: () => onDone() }, { label: "Add platform staff" }]} />
        <div className="flex flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">Add platform staff</h1>
          <p className="type-body m-0 text-text-soft">Give someone a platform role, or create a Cheche account if they don&apos;t have one yet.</p>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}

      <form onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Person & platform role" subtitle="Platform staff don't belong to any organization." />
          <div className="flex flex-col gap-4">
            <Field label="Mobile number" htmlFor="ps-mobile" required error={errors.mobile} hint="The Ethiopian mobile they sign in with.">
              <PhoneInput
                id="ps-mobile"
                value={mobile}
                error={!!errors.mobile}
                onValueChange={(value) => {
                  setMobile(value);
                  setMissingAccount(false);
                  setPassword("");
                  setFailure(null);
                  setErrors((prev) => ({ ...prev, mobile: undefined }));
                }}
              />
            </Field>

            <Field label="Platform role" htmlFor="ps-role" required error={errors.role}>
              <Select
                id="ps-role"
                placeholder={roles.isPending ? "Loading roles…" : "Choose an active platform role"}
                options={activeRoles.map((r) => ({ value: r.id, label: r.name }))}
                value={roleId}
                onValueChange={(value) => {
                  setRoleId(value);
                  setErrors((prev) => ({ ...prev, role: undefined }));
                }}
              />
            </Field>

            <Note icon={<InfoIcon />}>
              A person who is staff of an organization can&apos;t be platform staff.
            </Note>

            {!missingAccount && (
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" loading={assign.isPending} loadingLabel="Giving role">
                  Give platform role
                </Button>
                <Button variant="secondary" type="button" onClick={() => onDone()}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Card>

        {missingAccount && (
          <Card>
            <CardHeader title="New Cheche account" subtitle="This number has no Cheche account yet. Create one for them:" />
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First name" htmlFor="ps-first" required error={errors.firstname}>
                  <Input
                    id="ps-first"
                    value={firstname}
                    error={!!errors.firstname}
                    onChange={(e) => {
                      setFirstname(e.target.value);
                      setErrors((prev) => ({ ...prev, firstname: undefined }));
                    }}
                    maxLength={100}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Middle name" htmlFor="ps-middle" error={errors.middlename} hint="Optional">
                  <Input
                    id="ps-middle"
                    value={middlename}
                    error={!!errors.middlename}
                    onChange={(e) => {
                      setMiddlename(e.target.value);
                      setErrors((prev) => ({ ...prev, middlename: undefined }));
                    }}
                    maxLength={100}
                    autoComplete="off"
                  />
                </Field>
              </div>

              <Field label="Last name" htmlFor="ps-last" required error={errors.lastname}>
                <Input
                  id="ps-last"
                  value={lastname}
                  error={!!errors.lastname}
                  onChange={(e) => {
                    setLastname(e.target.value);
                    setErrors((prev) => ({ ...prev, lastname: undefined }));
                  }}
                  maxLength={100}
                  autoComplete="off"
                />
              </Field>

              <Field
                label="Password"
                htmlFor="ps-password"
                required
                error={errors.password}
                hint="At least 8 characters. Shown once after you save."
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <PasswordInput
                      id="ps-password"
                      value={password}
                      error={!!errors.password}
                      strengthMeter
                      autoComplete="new-password"
                      onValueChange={(value) => {
                        setPassword(value);
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setPassword(generatePassword());
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                  >
                    Generate
                  </Button>
                </div>
              </Field>

              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" loading={assign.isPending} loadingLabel="Creating">
                  Create account &amp; add staff
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setPassword("");
                    onDone();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
}
