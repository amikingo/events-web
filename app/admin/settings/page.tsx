"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Note } from "@/components/ui/note";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { toast } from "@/components/ui/toaster";
import { describeApiError } from "@/lib/api/errors";
import { getOrganization } from "@/lib/api/organizations";
import { updateStaffProfile } from "@/lib/api/staff";
import { describeAssignment, useAuth } from "@/lib/auth-context";
import { nationalMobile } from "@/lib/checkout";
import { MODULE_CODES } from "@/lib/constants/modules";
import { organizationQk, staffQk } from "@/lib/query-keys";

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

/** A section: an icon, a title and one line on the left of its card's header. */
function Section({ icon, title, subtitle, action, children }: { icon: ReactNode; title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <IconTile tone="charcoal" size="sm">
            {icon}
          </IconTile>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="type-h3 m-0 text-text">{title}</h2>
            <p className="type-body-sm m-0 text-text-soft">{subtitle}</p>
          </div>
        </div>
        {action && <div className="flex flex-none items-center gap-2">{action}</div>}
      </div>
      {children}
    </Card>
  );
}

/**
 * Your settings, from the real session and API only: who you are (your Cheche account), the roles you hold and which
 * one is in use, your organization, how the app looks, and signing out. Names can be changed by someone allowed to
 * manage staff; the mobile and password belong to the Cheche account and are changed there.
 */
export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, assignment, assignments, switchRole, logout } = useAuth();
  const { can } = useModuleAccess();
  const organizationId = assignment?.organizationId ?? null;

  // Names are changed through your own staff assignment, which needs the right to manage staff in your organization.
  const canEditName = Boolean(organizationId && assignment && can("update", MODULE_CODES.USER_ROLES));
  const [names, setNames] = useState(() => ({ firstname: user?.firstname ?? "", middlename: user?.middlename ?? "", lastname: user?.lastname ?? "" }));
  const [nameErrors, setNameErrors] = useState<{ firstname?: string; lastname?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const namesChanged =
    names.firstname.trim() !== (user?.firstname ?? "") || (names.middlename.trim() || null) !== (user?.middlename ?? null) || names.lastname.trim() !== (user?.lastname ?? "");

  const organization = useQuery({
    queryKey: organizationQk.detail(organizationId ?? ""),
    queryFn: ({ signal }) => getOrganization(organizationId!, signal),
    enabled: Boolean(organizationId),
  });

  const saveName = useMutation({
    mutationFn: () =>
      updateStaffProfile(organizationId!, assignment!.id, {
        firstname: names.firstname.trim(),
        middlename: names.middlename.trim() || null,
        lastname: names.lastname.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffQk.all(organizationId!) });
      toast.success("Name saved", { body: "It shows everywhere after your next sign-in." });
    },
    onError: (error) => setFailure(describeApiError(error, "person")),
  });

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

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="type-h1 m-0 text-text">Settings</h1>
        <p className="type-body m-0 text-text-soft">Your account, your roles and how the app looks.</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-8">
        {/* Left: you, at a glance. Stays in view while the page scrolls. */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar initials={initialsOf(name)} size={48} />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="type-h3 m-0 break-words text-text">{name}</p>
                  {assignment && (
                    <div>
                      <Pill tone="neutral" size="sm">
                        {assignment.role.name}
                      </Pill>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="type-body-sm m-0 flex items-center gap-2 text-text-soft">
                  <Phone className="size-4 flex-none" />
                  {user?.mobile ? nationalMobile(user.mobile) : "No mobile"}
                </p>
                <p className="type-body-sm m-0 flex items-center gap-2 text-text-soft">
                  <Building2 className="size-4 flex-none" />
                  {assignment?.organization?.name ?? "Platform (no organization)"}
                </p>
              </div>
            </div>
          </Card>
          <p className="type-body-sm m-0 px-1 text-text-faint">You sign in with your Cheche account, the same one you use across Cheche.</p>
        </aside>

        {/* Right: the sections. */}
        <div className="flex flex-col gap-6">
          <Section icon={<UserRound />} title="Profile" subtitle={canEditName ? "Your name as staff see it." : "Your name and mobile, from your Cheche account."}>
            {canEditName ? (
              <form onSubmit={submitName} noValidate className="flex flex-col gap-4">
                {failure && <ErrorBanner>{failure}</ErrorBanner>}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="First name" htmlFor="st-first" required error={nameErrors.firstname}>
                    <Input id="st-first" autoComplete="given-name" value={names.firstname} error={!!nameErrors.firstname} onChange={(e) => setNames((n) => ({ ...n, firstname: e.target.value }))} />
                  </Field>
                  <Field label="Middle name" htmlFor="st-middle" hint="Optional.">
                    <Input id="st-middle" autoComplete="additional-name" value={names.middlename} onChange={(e) => setNames((n) => ({ ...n, middlename: e.target.value }))} />
                  </Field>
                  <Field label="Last name" htmlFor="st-last" required error={nameErrors.lastname}>
                    <Input id="st-last" autoComplete="family-name" value={names.lastname} error={!!nameErrors.lastname} onChange={(e) => setNames((n) => ({ ...n, lastname: e.target.value }))} />
                  </Field>
                </div>
                <dl className="m-0">
                  <Row label="Mobile">{user?.mobile ? nationalMobile(user.mobile) : "None"} · changed on your Cheche account</Row>
                </dl>
                <div>
                  <Button type="submit" loading={saveName.isPending} loadingLabel="Saving" disabled={!namesChanged}>
                    Save name
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="m-0 flex flex-col divide-y divide-border">
                <Row label="Name">{name}</Row>
                <Row label="Mobile">{user?.mobile ? nationalMobile(user.mobile) : "None"}</Row>
                <Row label="To change them">Ask someone who manages staff in your organization, or change them on your Cheche account.</Row>
              </dl>
            )}
          </Section>

          <Section icon={<Repeat />} title="Your roles" subtitle={assignments.length > 1 ? "You hold several roles. Switch to work in another." : "The role you work in."}>
            <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
              {assignments.map((a) => {
                const current = a.id === assignment?.id;
                return (
                  <li key={a.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
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
          </Section>

          {organizationId && (
            <Section
              icon={<Building2 />}
              title="Organization"
              subtitle="Where you work. New events use its timezone and currency."
              action={
                can("update", MODULE_CODES.ORGANIZATIONS) ? (
                  <Button variant="secondary" onClick={() => router.push(`/admin/organizations/${organizationId}/edit`)}>
                    Edit organization
                    <ArrowUpRight className="size-4" />
                  </Button>
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
            </Section>
          )}

          <Section icon={<Palette />} title="Appearance" subtitle="How the app looks on this device.">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="type-body text-text">Theme</span>
              <ThemeSwitch />
            </div>
          </Section>

          <Section
            icon={<KeyRound />}
            title="Sign-in and security"
            subtitle="Your password belongs to your Cheche account."
            action={
              <Button variant="secondary" onClick={() => setSignOutOpen(true)}>
                <LogOut className="size-4" />
                Sign out
              </Button>
            }
          >
            <Note icon={<ShieldCheck />} className="mt-0">
              To change your password, use &quot;Forgot password&quot; on the sign-in page: it resets it on your Cheche account. Signing out here ends your session on this device.
            </Note>
          </Section>
        </div>
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
