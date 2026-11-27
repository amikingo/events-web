"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Building2, KeyRound, LogOut, Palette, Phone, Repeat, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { useModuleAccess } from "@/components/ability-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { toast } from "@/components/ui/toaster";
import { authService } from "@/app/auth/staff/auth-service";
import { ApiError, currentSession } from "@/lib/api-client";
import { changeStaffPassword, updateOwnStaffProfile } from "@/lib/api/auth";
import { describeApiError } from "@/lib/api/errors";
import { getOrganization } from "@/lib/api/organizations";
import { describeAssignment, useAuth } from "@/lib/auth-context";
import { nationalMobile } from "@/lib/checkout";
import { MODULE_CODES } from "@/lib/constants/modules";
import { organizationQk } from "@/lib/query-keys";

/** Which field each API issue belongs to: `body.old_password` → `old_password`. */
function fieldIssues(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const issues = (error.details as { issues?: { path?: string; code?: string; message?: string }[] } | undefined)?.issues ?? [];
  return Object.fromEntries(
    issues.map((i) => [(i.path ?? "").replace(/^body\./, ""), i.code === "wrong_password" ? "The current password is wrong." : (i.message ?? "Check this field.")]),
  );
}

const fullName = (p: { firstname: string | null; middlename: string | null; lastname: string | null } | null) =>
  (p ? [p.firstname, p.middlename, p.lastname].filter(Boolean).join(" ") : "") || "Your name";
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/** One label-and-value row. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:gap-4">
      <dt className="type-body-sm text-text-soft">{label}</dt>
      <dd className="type-body m-0 min-w-0 break-words text-text">{children}</dd>
    </div>
  );
}

/**
 * One settings block, as modern account pages lay them out: what it is on the left, the controls on the right, and an
 * optional footer bar for the hint and the save button.
 */
function SettingsBlock({
  icon,
  title,
  description,
  footer,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:gap-8">
        <div className="flex items-start gap-3">
          <IconTile tone="charcoal" size="sm">
            {icon}
          </IconTile>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="type-h3 m-0 text-text">{title}</h2>
            <p className="type-body-sm m-0 text-text-soft">{description}</p>
          </div>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
      {footer && <div className="flex flex-col gap-3 border-t border-border bg-surface-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">{footer}</div>}
    </Card>
  );
}

/**
 * My profile and settings, from the real session and API only: your names and password (Phase 10, on your own Cheche
 * account), the roles you hold and which one is in use, your organization, how the app looks, and signing out. The
 * mobile is the sign-in and can't change here.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { user, assignment, assignments, switchRole, logout } = useAuth();
  const { can } = useModuleAccess();
  const organizationId = assignment?.organizationId ?? null;

  const [names, setNames] = useState(() => ({ firstname: user?.firstname ?? "", middlename: user?.middlename ?? "", lastname: user?.lastname ?? "" }));
  const [nameErrors, setNameErrors] = useState<{ firstname?: string; lastname?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [tab, setTab] = useState("profile");
  const namesChanged =
    names.firstname.trim() !== (user?.firstname ?? "") || (names.middlename.trim() || null) !== (user?.middlename ?? null) || names.lastname.trim() !== (user?.lastname ?? "");

  const organization = useQuery({
    queryKey: organizationQk.detail(organizationId ?? ""),
    queryFn: ({ signal }) => getOrganization(organizationId!, signal),
    enabled: Boolean(organizationId),
  });

  // Your own names: the API returns a new token, so the header shows the new name at once.
  const saveName = useMutation({
    mutationFn: () => updateOwnStaffProfile({ firstname: names.firstname.trim(), middlename: names.middlename.trim(), lastname: names.lastname.trim() }),
    onSuccess: ({ changed }) => {
      authService.rememberProfileFrom(currentSession());
      if (changed) toast.success("Name saved");
      else toast.info("Nothing changed");
    },
    onError: (error) => {
      const issues = fieldIssues(error);
      if (issues.firstname || issues.lastname) setNameErrors({ firstname: issues.firstname, lastname: issues.lastname });
      else setFailure(describeApiError(error, "person"));
    },
  });

  // Change password: the confirmation is checked here only; a wrong current password stays on its field.
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [pwFailure, setPwFailure] = useState<string | null>(null);
  const changePassword = useMutation({
    mutationFn: () => changeStaffPassword(pw.current, pw.next),
    onSuccess: () => {
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password changed");
    },
    onError: (error) => {
      const issues = fieldIssues(error);
      if (issues.old_password || issues.new_password) setPwErrors({ current: issues.old_password, next: issues.new_password });
      else setPwFailure(error instanceof ApiError && error.code === "rate_limited" ? "Too many tries. Wait a minute and try again." : describeApiError(error));
    },
  });

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      current: pw.current ? undefined : "Enter your current password.",
      next: pw.next.length < 8 ? "Use at least 8 characters." : pw.next === pw.current ? "Choose a password different from the current one." : undefined,
      confirm: pw.confirm === pw.next ? undefined : "The passwords don't match.",
    };
    setPwErrors(next);
    setPwFailure(null);
    if (next.current || next.next || next.confirm) return;
    changePassword.mutate();
  }

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      firstname: names.firstname.trim() ? undefined : "Enter your first name.",
      lastname: names.lastname.trim() ? undefined : "Enter your last name.",
    };
    setNameErrors(next);
    setFailure(null);
    if (next.firstname || next.lastname) return;
    saveName.mutate();
  }

  async function switchTo(id: string) {
    setSwitching(id);
    try {
      await switchRole(id);
      toast.success("Role switched");
      router.push("/admin");
    } catch (error) {
      toast.error("Couldn't switch the role", { body: describeApiError(error) });
    } finally {
      setSwitching(null);
    }
  }

  const name = fullName(user);
  const org = organization.data;
  const typedName = [names.firstname, names.middlename, names.lastname].map((n) => n.trim()).filter(Boolean).join(" ") || name;

  return (
    <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] xl:gap-8">
      {/* Left: you, at a glance, staying in view: avatar, name, role, where you work, roles held, and Sign out. */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
        <Card className="overflow-hidden p-0">
          <div className="h-16 bg-[linear-gradient(120deg,var(--color-accent-soft),var(--color-surface-2))]" aria-hidden="true" />
          <div className="flex flex-col items-center gap-3 px-5 pb-5 text-center">
            <div className="-mt-8 rounded-full bg-surface p-1">
              <Avatar initials={initialsOf(typedName)} size={48} />
            </div>
            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <h1 className="type-h3 m-0 break-words text-text">{typedName}</h1>
              {assignment && (
                <Pill tone="neutral" size="sm">
                  {assignment.role.name}
                </Pill>
              )}
            </div>
            <div className="flex w-full flex-col gap-2.5 border-t border-border pt-4 text-left">
              <div className="flex items-center gap-2.5">
                <Phone className="size-4 flex-none text-text-faint" />
                <span className="type-body-sm m-0 truncate text-text">{user?.mobile ? nationalMobile(user.mobile) : "No mobile"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Building2 className="size-4 flex-none text-text-faint" />
                <span className="type-body-sm m-0 truncate text-text">{assignment?.organization?.name ?? "Platform"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Repeat className="size-4 flex-none text-text-faint" />
                <span className="type-body-sm m-0 text-text">
                  {assignments.length} {assignments.length === 1 ? "role" : "roles"}
                </span>
              </div>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => setSignOutOpen(true)}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </Card>
        <p className="type-body-sm m-0 px-1 text-text-faint">You sign in with your Cheche account, the same one across Cheche.</p>
      </aside>

      {/* Right: one area at a time. */}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-col gap-0.5 pb-3">
          <h2 className="type-h1 m-0 text-text">My profile</h2>
          <p className="type-body m-0 text-text-soft">Your name, password, roles and how the app looks.</p>
        </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabList>
          <Tab value="profile">Profile</Tab>
          <Tab value="security">Password</Tab>
          <Tab value="roles" count={assignments.length > 1 ? assignments.length : undefined}>
            Roles
          </Tab>
          {organizationId && <Tab value="organization">Organization</Tab>}
          <Tab value="appearance">Appearance</Tab>
        </TabList>

        <TabPanel value="profile" className="pt-5">
          <form onSubmit={submitName} noValidate>
            <SettingsBlock
              icon={<UserRound />}
              title="Your name"
              description="As it shows to everyone, across Cheche."
              footer={
                <>
                  <span className="type-body-sm text-text-soft">The header updates as soon as you save.</span>
                  <Button type="submit" variant={namesChanged ? undefined : "secondary"} loading={saveName.isPending} loadingLabel="Saving" disabled={!namesChanged}>
                    Save name
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                {failure && <ErrorBanner>{failure}</ErrorBanner>}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="First name" htmlFor="st-first" required error={nameErrors.firstname}>
                    <Input id="st-first" autoComplete="given-name" value={names.firstname} error={!!nameErrors.firstname} onChange={(e) => setNames((n) => ({ ...n, firstname: e.target.value }))} />
                  </Field>
                  <Field label="Last name" htmlFor="st-last" required error={nameErrors.lastname}>
                    <Input id="st-last" autoComplete="family-name" value={names.lastname} error={!!nameErrors.lastname} onChange={(e) => setNames((n) => ({ ...n, lastname: e.target.value }))} />
                  </Field>
                  <Field label="Middle name" htmlFor="st-middle" hint="Optional.">
                    <Input id="st-middle" autoComplete="additional-name" value={names.middlename} onChange={(e) => setNames((n) => ({ ...n, middlename: e.target.value }))} />
                  </Field>
                  <Field label="Mobile" htmlFor="st-mobile" hint="Your sign-in. It can't be changed here.">
                    <Input id="st-mobile" value={user?.mobile ? nationalMobile(user.mobile) : "None"} readOnly disabled />
                  </Field>
                </div>
              </div>
            </SettingsBlock>
          </form>
        </TabPanel>

        <TabPanel value="security" className="pt-5">
          <form onSubmit={submitPassword} noValidate>
            <SettingsBlock
              icon={<KeyRound />}
              title="Password"
              description="The password you sign in with. Changing it keeps you signed in here."
              footer={
                <>
                  <span className="type-body-sm text-text-soft">At least 8 characters, different from the current one.</span>
                  <Button
                    type="submit"
                    variant={pw.current && pw.next && pw.confirm ? undefined : "secondary"}
                    loading={changePassword.isPending}
                    loadingLabel="Changing"
                    disabled={!pw.current || !pw.next || !pw.confirm}
                  >
                    Change password
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                {pwFailure && <ErrorBanner>{pwFailure}</ErrorBanner>}
                <Field label="Current password" htmlFor="pw-current" required error={pwErrors.current}>
                  <PasswordInput id="pw-current" autoComplete="current-password" value={pw.current} onValueChange={(v) => setPw((p) => ({ ...p, current: v }))} error={!!pwErrors.current} />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="New password" htmlFor="pw-new" required error={pwErrors.next}>
                    <PasswordInput id="pw-new" autoComplete="new-password" value={pw.next} onValueChange={(v) => setPw((p) => ({ ...p, next: v }))} error={!!pwErrors.next} />
                  </Field>
                  <Field label="Confirm new password" htmlFor="pw-confirm" required error={pwErrors.confirm}>
                    <PasswordInput id="pw-confirm" autoComplete="new-password" value={pw.confirm} onValueChange={(v) => setPw((p) => ({ ...p, confirm: v }))} error={!!pwErrors.confirm} />
                  </Field>
                </div>
              </div>
            </SettingsBlock>
          </form>
        </TabPanel>

        <TabPanel value="roles" className="pt-5">
          <SettingsBlock icon={<Repeat />} title="Your roles" description={assignments.length > 1 ? "You hold several roles. Switch to work in another." : "The role you work in."}>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {assignments.map((a) => {
                const current = a.id === assignment?.id;
                return (
                  <li
                    key={a.id}
                    className={
                      "flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between " +
                      (current ? "border-accent bg-accent-soft" : "border-border")
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <IconTile tone={current ? "accent" : "charcoal"} size="sm">
                        {a.organization ? <Building2 /> : <ShieldCheck />}
                      </IconTile>
                      <span className="type-body min-w-0 truncate text-text">{describeAssignment(a)}</span>
                    </div>
                    {current ? (
                      <Pill tone="success" size="sm">
                        In use
                      </Pill>
                    ) : (
                      <Button variant="secondary" loading={switching === a.id} loadingLabel="Switching" onClick={() => void switchTo(a.id)}>
                        Switch to this role
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </SettingsBlock>
        </TabPanel>

        {organizationId && (
          <TabPanel value="organization" className="pt-5">
            <SettingsBlock
              icon={<Building2 />}
              title="Organization"
              description="Where you work. New events use its timezone and currency."
              footer={
                can("update", MODULE_CODES.ORGANIZATIONS) ? (
                  <>
                    <span className="type-body-sm text-text-soft">You can change these as an admin.</span>
                    <Button variant="secondary" onClick={() => router.push(`/admin/organizations/${organizationId}/edit`)}>
                      Edit organization
                      <ArrowUpRight className="size-4" />
                    </Button>
                  </>
                ) : undefined
              }
            >
              {organization.isPending ? (
                <Skeleton shape="block" />
              ) : organization.isError || !org ? (
                <p className="type-body-sm m-0 text-danger">{describeApiError(organization.error, "organization")}</p>
              ) : (
                <dl className="m-0 flex flex-col divide-y divide-border">
                  <Row label="Name">{org.name}</Row>
                  <Row label="Web address">
                    <code className="font-mono">events/{org.slug}</code>
                  </Row>
                  <Row label="Timezone">{org.timezone.replace(/_/g, " ")}</Row>
                  <Row label="Currency">{org.default_currency}</Row>
                  <Row label="Branches">{org.has_branches ? "On" : "Off: one office"}</Row>
                </dl>
              )}
            </SettingsBlock>
          </TabPanel>
        )}

        <TabPanel value="appearance" className="pt-5">
          <SettingsBlock icon={<Palette />} title="Appearance" description="How the app looks on this device. System follows your phone or computer.">
            <ThemeSwitch />
          </SettingsBlock>
        </TabPanel>
      </Tabs>
      </div>

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Sign out?"
        description="You'll need your mobile and password to sign in again."
        confirmLabel="Sign out"
        onConfirm={() => {
          setSignOutOpen(false);
          void logout().then(() => toast.info("Signed out"));
        }}
      />
    </div>
  );
}
