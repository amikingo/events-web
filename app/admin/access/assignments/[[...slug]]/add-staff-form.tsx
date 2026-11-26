"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Copy, KeyRound, Phone, Search, ShieldCheck, UserPlus, Wand2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { InfoIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { SelectCard } from "@/components/ui/select-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { listAllBranches } from "@/lib/api/branches";
import { describeApiError } from "@/lib/api/errors";
import { listRoles } from "@/lib/api/roles";
import type { Role } from "@/lib/api/roles";
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

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/** "6 areas": how many parts of the app a role opens, so roles can be told apart at a glance. */
function reachOf(role: Role): string {
  const areas = role.grants.filter((g) => g.view).length;
  return areas === 1 ? "1 area" : `${areas} areas`;
}

/** A line of the summary card: an icon and a value, or a faint placeholder when it's empty. */
function PreviewLine({ icon, value, empty }: { icon: ReactNode; value: string; empty: string }) {
  return (
    <p className={value ? "type-body-sm m-0 flex min-w-0 items-center gap-2 text-text-soft" : "type-body-sm m-0 flex items-center gap-2 text-text-faint"}>
      <span className="flex-none [&_svg]:size-4">{icon}</span>
      <span className="truncate">{value || empty}</span>
    </p>
  );
}

/** A numbered step heading: the number turns into a tick once the step is done. */
function StepHeading({ step, done, title, description }: { step: number; done: boolean; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 px-1">
      <span className={done ? "flex size-6 flex-none items-center justify-center rounded-full bg-success-fill text-white" : "type-label flex size-6 flex-none items-center justify-center rounded-full bg-surface-2 text-text-soft"}>
        {done ? <CheckCircle2 className="size-4" /> : step}
      </span>
      <div className="flex flex-col gap-0.5">
        <h2 className="type-h3 m-0 text-text">{title}</h2>
        <p className="type-body-sm m-0 text-text-soft">{description}</p>
      </div>
    </div>
  );
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
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">Cheche account created</h1>
          <p className="type-body m-0 text-text-soft">Share these one-time sign-in details with {handover.name}.</p>
        </div>

        <Card className="max-w-xl">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Avatar initials={initialsOf(handover.name)} size={48} />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="type-h3 m-0 break-words text-text">{handover.name}</p>
                <div>
                  <Pill tone="success" size="sm">
                    Role given
                  </Pill>
                </div>
              </div>
            </div>
            <dl className="m-0 flex flex-col divide-y divide-border rounded-md border border-border">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="type-body-sm flex items-center gap-2 text-text-soft">
                  <Phone className="size-4" />
                  Mobile
                </dt>
                <dd className="type-body m-0 font-semibold text-text">{handover.mobileDisplay}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="type-body-sm flex items-center gap-2 text-text-soft">
                  <KeyRound className="size-4" />
                  Password
                </dt>
                <dd className="m-0">
                  <code className="type-body rounded-sm bg-surface-2 px-2 py-1 font-mono text-text">{handover.password}</code>
                </dd>
              </div>
            </dl>
            <Note icon={<InfoIcon />} className="mt-0">
              You won&apos;t see this password again. Copy it now and give it to them in person or by a private message.
            </Note>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => void copyHandover()}>
                {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy details"}
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
  const role = activeRoles.find((r) => r.id === roleId);
  const branchOptions = [{ value: ORGANIZATION_WIDE, label: "Whole organization" }, ...(branches.data ?? []).filter((b) => b.is_active).map((b) => ({ value: b.id, label: b.name }))];
  const whereLabel = branchOptions.find((o) => o.value === branchId)?.label ?? "Whole organization";
  const newName = [firstname.trim(), middlename.trim(), lastname.trim()].filter(Boolean).join(" ");
  const personName = found ? nameOf(found) : missingAccount ? newName : "";

  return (
    <div className="flex w-full mx-auto max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">Add staff</h1>
          <p className="type-body m-0 text-text-soft">Give someone a role in this organization, or create a Cheche account if they don&apos;t have one yet.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" type="button" onClick={() => onDone()}>
            Cancel
          </Button>
          <Button type="button" disabled={!readyForRole} loading={assign.isPending} loadingLabel={missingAccount ? "Creating the account" : "Giving the role"} onClick={give}>
            {missingAccount ? "Create account and give role" : "Give role"}
          </Button>
        </div>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-8">
        {/* Left: what will happen, filled in as the steps are done. Stays in view while the page scrolls. */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar initials={initialsOf(personName)} size={48} />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className={personName ? "type-h3 m-0 break-words text-text" : "type-h3 m-0 text-text-faint"}>{personName || (missingAccount ? "Their name" : "Find the person")}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone={found ? "success" : missingAccount ? "warning" : "neutral"} size="sm">
                      {found ? "Cheche account found" : missingAccount ? "New Cheche account" : "Not looked up yet"}
                    </Pill>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <PreviewLine icon={<Phone />} value={readyForRole ? (found?.mobile ?? nationalMobile(e164)) : ""} empty="No mobile yet" />
                <PreviewLine icon={<ShieldCheck />} value={role ? role.name : ""} empty="No role chosen" />
                {hasBranches && <PreviewLine icon={<Building2 />} value={whereLabel} empty="Whole organization" />}
              </div>
            </div>
          </Card>
          <p className="type-body-sm m-0 px-1 text-text-faint">You can change the role or switch it off later.</p>
        </aside>

        {/* Right: the two steps. */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <StepHeading step={1} done={readyForRole} title="Find the person" description="Look up their mobile number in Cheche accounts." />
            <Card>
              <form onSubmit={find} noValidate className="flex flex-col gap-4">
                <Field label="Mobile number" htmlFor="st-mobile" required error={errors.mobile} hint="The Ethiopian mobile they sign in with.">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="min-w-0 flex-1">
                      <PhoneInput
                        id="st-mobile"
                        value={mobile}
                        error={!!errors.mobile}
                        autoFocus
                        onValueChange={(v) => {
                          setMobile(v);
                          setFound(null);
                          setMissingAccount(false);
                          setPassword("");
                          setErrors({});
                        }}
                      />
                    </div>
                    <Button type="submit" variant="secondary" loading={lookup.isPending} loadingLabel="Looking up">
                      <Search className="size-4" />
                      Look up
                    </Button>
                  </div>
                </Field>

                {found && (
                  <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-3" role="status">
                    <Avatar initials={initialsOf(nameOf(found))} size={36} />
                    <div className="flex min-w-0 flex-col">
                      <p className="type-body m-0 font-semibold text-text">{nameOf(found)}</p>
                      <p className="type-body-sm m-0 text-text-soft">{found.mobile ?? e164} · Check this is the right person.</p>
                    </div>
                  </div>
                )}

                {missingAccount && (
                  <div className="flex flex-col gap-4 rounded-md border border-border bg-surface-2 p-4">
                    <div className="flex items-start gap-3">
                      <UserPlus className="mt-0.5 size-4 flex-none text-text-soft" />
                      <div className="flex flex-col gap-0.5">
                        <p className="type-body m-0 font-semibold text-text">No Cheche account uses this number yet</p>
                        <p className="type-body-sm m-0 text-text-soft">Create one for them. They sign in with this mobile and the password below.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field label="First name" htmlFor="na-first" required error={errors.firstname}>
                        <Input
                          id="na-first"
                          value={firstname}
                          error={!!errors.firstname}
                          maxLength={100}
                          autoComplete="off"
                          autoFocus
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
                    </div>
                    <Field label="Password" htmlFor="na-password" required error={errors.password} hint="At least 8 characters. You'll see it once more after saving, to hand it over.">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
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
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setPassword(generatePassword());
                            setErrors((prev) => ({ ...prev, password: undefined }));
                          }}
                        >
                          <Wand2 className="size-4" />
                          Generate
                        </Button>
                      </div>
                    </Field>
                  </div>
                )}
              </form>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <StepHeading step={2} done={Boolean(role)} title="Choose their role" description={readyForRole ? "What they can see and do here." : "Look up the person first."} />
            <Card disabled={!readyForRole}>
              <div className="flex flex-col gap-5">
                <Field label="Role" required error={errors.role}>
                  {roles.isPending ? (
                    <div className="flex flex-col gap-2">
                      <Skeleton shape="block" height={56} />
                      <Skeleton shape="block" height={56} />
                    </div>
                  ) : activeRoles.length === 0 ? (
                    <EmptyState size="sm" title="No roles yet" description="Add a role under Roles first." />
                  ) : (
                    <div role="radiogroup" aria-label="Role" className="flex flex-col gap-2">
                      {activeRoles.map((r) => (
                        <SelectCard
                          key={r.id}
                          disabled={!readyForRole}
                          selected={roleId === r.id}
                          onClick={() => {
                            setRoleId(r.id);
                            setErrors((prev) => ({ ...prev, role: undefined }));
                          }}
                          title={r.name}
                          subtitle={r.description || `Opens ${reachOf(r)} of the app.`}
                          value={reachOf(r)}
                        />
                      ))}
                    </div>
                  )}
                </Field>
                {hasBranches && (
                  <Field label="Where" htmlFor="st-branch" error={errors.branch} hint="One branch only, or the whole organization.">
                    <Select
                      id="st-branch"
                      disabled={!readyForRole}
                      loading={branches.isPending}
                      options={branchOptions}
                      value={branchId}
                      onValueChange={(v) => {
                        setBranchId(v);
                        setErrors((prev) => ({ ...prev, branch: undefined }));
                      }}
                    />
                  </Field>
                )}
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
