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
import { listAllBranches } from "@/lib/api/branches";
import { describeApiError } from "@/lib/api/errors";
import { listRoles } from "@/lib/api/roles";
import { assignStaff, lookUpStaff } from "@/lib/api/staff";
import type { StaffLookup } from "@/lib/api/staff";
import { groupPhone, phoneDigits, validatePhone } from "@/lib/marketplace/validation";
import { branchQk, roleQk, staffQk } from "@/lib/query-keys";

const ORGANIZATION_WIDE = "all";
const nameOf = (p: Pick<StaffLookup, "firstname" | "middlename" | "lastname">) =>
  [p.firstname, p.middlename, p.lastname].filter(Boolean).join(" ") || "Unnamed account";

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
  // Fisher-Yates shuffle using crypto random bytes so required classes don't stay at fixed indices.
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

type Errors = {
  mobile?: string;
  firstname?: string;
  middlename?: string;
  lastname?: string;
  password?: string;
  role?: string;
  branch?: string;
};

interface HandoverState {
  assignmentId: string;
  name: string;
  mobileDisplay: string;
  password: string;
}

/**
 * Give someone a role: look up their mobile; if no Cheche account uses that number, optionally create one with
 * name + password and show the one-time hand-over credentials once. Never stores or logs passwords.
 */
export function AddStaffForm({ organizationId, hasBranches, onDone }: { organizationId: string; hasBranches: boolean; onDone: (assignmentId?: string) => void }) {
  const queryClient = useQueryClient();
  const [mobile, setMobile] = useState("");
  const [found, setFound] = useState<StaffLookup | null>(null);
  const [missingAccount, setMissingAccount] = useState(false);
  const [firstname, setFirstname] = useState("");
  const [middlename, setMiddlename] = useState("");
  const [lastname, setLastname] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [branchId, setBranchId] = useState(ORGANIZATION_WIDE);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [handover, setHandover] = useState<HandoverState | null>(null);
  const [copied, setCopied] = useState(false);

  const roles = useQuery({ queryKey: roleQk.list(organizationId), queryFn: ({ signal }) => listRoles(organizationId, signal) });
  const branches = useQuery({ queryKey: branchQk.everyone(organizationId), queryFn: ({ signal }) => listAllBranches(organizationId, signal), enabled: hasBranches });
  const e164 = `+251${phoneDigits(mobile)}`;
  const readyForRole = Boolean(found || missingAccount);

  const lookup = useMutation({
    mutationFn: () => lookUpStaff(organizationId, e164),
    onSuccess: (account) => {
      setFound(account);
      setMissingAccount(false);
      setPassword("");
      setFailure(null);
    },
    onError: (error) => {
      setFound(null);
      if (error instanceof ApiError && error.code === "central_account_not_found") {
        setMissingAccount(true);
        setFailure(null);
        return;
      }
      setMissingAccount(false);
      setFailure(describeApiError(error, "person"));
    },
  });

  const assign = useMutation({
    mutationFn: () =>
      assignStaff(organizationId, {
        mobile: e164,
        role_id: roleId,
        ...(hasBranches && branchId !== ORGANIZATION_WIDE ? { branch_id: branchId } : {}),
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
      void queryClient.invalidateQueries({ queryKey: staffQk.all(organizationId) });
      void queryClient.invalidateQueries({ queryKey: roleQk.all(organizationId) });

      if (accountCreated) {
        const displayName = [firstname.trim(), middlename.trim(), lastname.trim()].filter(Boolean).join(" ");
        setHandover({
          assignmentId: assignment.id,
          name: displayName || nameOf(assignment.profile ?? { firstname: firstname.trim(), middlename: null, lastname: lastname.trim() }),
          mobileDisplay: nationalMobile(e164),
          password,
        });
        setPassword("");
        return;
      }

      setPassword("");
      if (roleGiven) {
        toast.success("Staff assignment created", {
          body: `${found ? `${nameOf(found)} now has` : "They now have"} the ${assignment.role.name} role.`,
        });
      } else {
        toast.info("Already has this role", { body: "Nothing changed." });
      }
      onDone(assignment.id);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === "assignment_scope_conflict") {
          const msg = describeApiError(error, "person");
          setErrors(hasBranches ? { branch: msg } : { role: msg });
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
              else if (path === "body.branch_id") nextErrors.branch = msg;
              else unmatched.push(msg);
            }
            setErrors(nextErrors);
            if (unmatched.length > 0) setFailure(unmatched[0]!);
            return;
          }
        }
      }
      setFailure(describeApiError(error, "person"));
    },
  });

  function find(e: React.FormEvent) {
    e.preventDefault();
    const error = validatePhone(mobile);
    setErrors({ mobile: error });
    if (error) return;
    setFailure(null);
    setFound(null);
    setMissingAccount(false);
    setPassword("");
    lookup.mutate();
  }

  function give() {
    const nextErrors: Errors = {};
    if (missingAccount) {
      if (!firstname.trim()) nextErrors.firstname = "Enter their first name.";
      else if (firstname.trim().length > 100) nextErrors.firstname = "Use 100 characters or fewer.";
      if (middlename.trim().length > 100) nextErrors.middlename = "Use 100 characters or fewer.";
      if (!lastname.trim()) nextErrors.lastname = "Enter their last name.";
      else if (lastname.trim().length > 100) nextErrors.lastname = "Use 100 characters or fewer.";
      if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
      else if (password.length > 128) nextErrors.password = "Use 128 characters or fewer.";
    }
    if (!roleId) nextErrors.role = "Choose a role.";

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
          <Breadcrumb items={[{ label: "Staff assignments", onClick: closeHandover }, { label: "Sign-in details" }]} />
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
        <Breadcrumb items={[{ label: "Staff assignments", onClick: () => onDone() }, { label: "Add staff" }]} />
        <div className="flex flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">Add staff</h1>
          <p className="type-body m-0 text-text-soft">Give someone a role in this organization, or create a Cheche account if they don&apos;t have one yet.</p>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="1. Find the person" subtitle="Look up their mobile number in Cheche accounts." />
          <form onSubmit={find} noValidate className="flex flex-col gap-4">
            <Field label="Mobile number" htmlFor="st-mobile" required error={errors.mobile} hint="The Ethiopian mobile they sign in with.">
              <PhoneInput
                id="st-mobile"
                value={mobile}
                error={!!errors.mobile}
                onValueChange={(v) => {
                  setMobile(v);
                  setFound(null);
                  setMissingAccount(false);
                  setPassword("");
                  setErrors({});
                }}
              />
            </Field>
            <div>
              <Button type="submit" variant="secondary" loading={lookup.isPending} loadingLabel="Looking up">
                Look up
              </Button>
            </div>

            {found && (
              <div className="rounded-md border border-border bg-surface-2 px-4 py-3" role="status">
                <p className="type-label m-0 text-text-faint">Is this the right person?</p>
                <p className="type-body m-0 mt-0.5 font-medium text-text">{nameOf(found)}</p>
                <p className="type-body-sm m-0 text-text-soft">{found.mobile ?? e164}</p>
              </div>
            )}

            {missingAccount && (
              <div className="flex flex-col gap-4 rounded-md border border-border bg-surface-2 p-4">
                <p className="m-0 type-body-sm font-medium text-text">This number has no Cheche account yet. Create one for them:</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="First name" htmlFor="na-first" required error={errors.firstname}>
                    <Input
                      id="na-first"
                      value={firstname}
                      error={!!errors.firstname}
                      maxLength={100}
                      autoComplete="off"
                      onChange={(e) => {
                        setFirstname(e.target.value);
                        setErrors((prev) => ({ ...prev, firstname: undefined }));
                      }}
                    />
                  </Field>
                  <Field label="Middle name" htmlFor="na-middle" error={errors.middlename} hint="Optional.">
                    <Input
                      id="na-middle"
                      value={middlename}
                      error={!!errors.middlename}
                      maxLength={100}
                      autoComplete="off"
                      onChange={(e) => {
                        setMiddlename(e.target.value);
                        setErrors((prev) => ({ ...prev, middlename: undefined }));
                      }}
                    />
                  </Field>
                </div>
                <Field label="Last name" htmlFor="na-last" required error={errors.lastname}>
                  <Input
                    id="na-last"
                    value={lastname}
                    error={!!errors.lastname}
                    maxLength={100}
                    autoComplete="off"
                    onChange={(e) => {
                      setLastname(e.target.value);
                      setErrors((prev) => ({ ...prev, lastname: undefined }));
                    }}
                  />
                </Field>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="na-password" className="type-body-sm font-medium text-text">
                      Password <span className="text-danger-text">*</span>
                    </label>
                    <button
                      type="button"
                      className="type-body-sm font-medium text-accent-text hover:underline"
                      onClick={() => {
                        setPassword(generatePassword());
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                    >
                      Generate
                    </button>
                  </div>
                  <PasswordInput
                    id="na-password"
                    autoComplete="new-password"
                    value={password}
                    strengthMeter
                    error={!!errors.password}
                    onValueChange={(v) => {
                      setPassword(v);
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                  />
                  {errors.password ? (
                    <p role="alert" className="m-0 text-[12px] text-danger-text">
                      {errors.password}
                    </p>
                  ) : (
                    <p className="m-0 text-[12px] text-text-faint">At least 8 characters. Give this password to them once finished.</p>
                  )}
                </div>
              </div>
            )}
          </form>
        </Card>

        <Card disabled={!readyForRole}>
          <CardHeader title="2. Choose their role" subtitle={readyForRole ? "What they can see and do here." : "Look up the person first."} />
          <div className="flex flex-col gap-4">
            <Field label="Role" htmlFor="st-role" required error={errors.role}>
              <Select
                id="st-role"
                disabled={!readyForRole}
                loading={roles.isPending}
                placeholder="Choose a role"
                options={activeRoles.map((r) => ({ value: r.id, label: r.name }))}
                value={roleId}
                onValueChange={(v) => {
                  setRoleId(v);
                  setErrors((prev) => ({ ...prev, role: undefined }));
                }}
              />
            </Field>
            {hasBranches && (
              <Field label="Where" htmlFor="st-branch" error={errors.branch} hint="One branch only, or the whole organization.">
                <Select
                  id="st-branch"
                  disabled={!readyForRole}
                  loading={branches.isPending}
                  options={[{ value: ORGANIZATION_WIDE, label: "Whole organization" }, ...(branches.data ?? []).filter((b) => b.is_active).map((b) => ({ value: b.id, label: b.name }))]}
                  value={branchId}
                  onValueChange={(v) => {
                    setBranchId(v);
                    setErrors((prev) => ({ ...prev, branch: undefined }));
                  }}
                />
              </Field>
            )}
            <div className="flex items-center gap-2">
              <Button disabled={!readyForRole} loading={assign.isPending} loadingLabel="Giving the role" onClick={give}>
                Give role
              </Button>
              <Button variant="secondary" onClick={() => onDone()}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
