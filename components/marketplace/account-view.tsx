"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { groupPhone } from "@/lib/marketplace/validation";
import { attendeeAuth, customerFullName } from "@/app/auth/attendee/attendee-auth-service";
import { useSession } from "@/app/auth/session";
import type { CustomerProfile } from "@/lib/api-client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CardIcon, LogoutIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { toast } from "@/components/ui/toaster";
import { describeApiError } from "@/lib/api/errors";
import { initialsOf } from "./account-menu";

function formatAccountMobile(mobile: string | null | undefined): string {
  if (!mobile) return "No mobile number on account";
  const grouped = groupPhone(mobile);
  return grouped ? `+251 ${grouped}` : mobile;
}

/** Read-only guest account from `GET /v1/auth/customer/me`. Signed-out visitors redirect to `/auth`. */
export function AccountView() {
  const session = useSession();
  const router = useRouter();
  const [me, setMe] = useState<CustomerProfile | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  // Edit name (Phase 10): first, middle and last, inline in the account card.
  const [editing, setEditing] = useState(false);
  const [names, setNames] = useState({ firstname: "", middlename: "", lastname: "" });
  const [nameErrors, setNameErrors] = useState<{ firstname?: string; lastname?: string }>({});
  const [nameFailure, setNameFailure] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const isGuest = session?.kind === "attendee";

  useEffect(() => {
    if (session === undefined) return;
    if (!isGuest) {
      router.replace("/auth");
    }
  }, [session, isGuest, router]);

  useEffect(() => {
    if (!isGuest) return;
    const controller = new AbortController();
    attendeeAuth
      .getMe(controller.signal)
      .then((profile) => {
        if (!controller.signal.aborted) setMe(profile);
      })
      .catch(() => {
        // Fallback to the session's cached guest profile if `/me` transiently fails.
      });
    return () => controller.abort();
  }, [isGuest]);

  if (session === undefined || !isGuest) {
    return <Skeleton className="h-[260px] max-w-[680px] rounded-md" />;
  }

  const profile = me?.id === session.account.id ? me : session.account;
  const fullName = customerFullName(profile);

  function startEditing() {
    setNames({ firstname: profile.firstname ?? "", middlename: profile.middlename ?? "", lastname: profile.lastname ?? "" });
    setNameErrors({});
    setNameFailure(null);
    setEditing(true);
  }

  async function saveNames(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      firstname: names.firstname.trim() ? undefined : "Enter your first name.",
      lastname: names.lastname.trim() ? undefined : "Enter your last name.",
    };
    setNameErrors(next);
    setNameFailure(null);
    if (next.firstname || next.lastname) return;
    setSavingName(true);
    try {
      const updated = await attendeeAuth.updateNames({ firstname: names.firstname.trim(), middlename: names.middlename.trim(), lastname: names.lastname.trim() });
      setMe(updated);
      setEditing(false);
      toast.success("Name saved");
    } catch (error) {
      setNameFailure(describeApiError(error, "person"));
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="grid max-w-[840px] gap-6 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
      <Card className="flex flex-col items-start gap-4 self-start">
        <Avatar initials={initialsOf(fullName)} size={48} />
        <div className="min-w-0">
          <p className="m-0 type-h3 text-text">{fullName}</p>
          <p className="m-0 mt-0.5 type-body-sm text-text-soft">{formatAccountMobile(profile.mobile)}</p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button asChild variant="secondary" className="w-full">
            <Link href="/my-tickets">
              <CardIcon className="size-4" /> My tickets
            </Link>
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setConfirmOut(true)}>
            <LogoutIcon className="size-4" /> Sign out
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col divide-y divide-border">
          <div className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 type-label text-text-faint">Cheche account</p>
              {!editing && (
                <Button variant="secondary" onClick={startEditing}>
                  Edit name
                </Button>
              )}
            </div>
            {editing ? (
              <form onSubmit={saveNames} noValidate className="mt-3 flex flex-col gap-4">
                {nameFailure && <ErrorBanner>{nameFailure}</ErrorBanner>}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="First name" htmlFor="acc-first" required error={nameErrors.firstname}>
                    <Input id="acc-first" autoComplete="given-name" value={names.firstname} error={!!nameErrors.firstname} onChange={(e) => setNames((n) => ({ ...n, firstname: e.target.value }))} autoFocus />
                  </Field>
                  <Field label="Middle name" htmlFor="acc-middle" hint="Optional.">
                    <Input id="acc-middle" autoComplete="additional-name" value={names.middlename} onChange={(e) => setNames((n) => ({ ...n, middlename: e.target.value }))} />
                  </Field>
                  <Field label="Last name" htmlFor="acc-last" required error={nameErrors.lastname}>
                    <Input id="acc-last" autoComplete="family-name" value={names.lastname} error={!!nameErrors.lastname} onChange={(e) => setNames((n) => ({ ...n, lastname: e.target.value }))} />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" loading={savingName} loadingLabel="Saving">
                    Save name
                  </Button>
                  <Button type="button" variant="secondary" disabled={savingName} onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
            <dl className="m-0 mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="type-body-sm text-text-faint">Name</dt>
                <dd className="m-0 mt-0.5 type-body font-medium text-text">{fullName}</dd>
              </div>
              <div>
                <dt className="type-body-sm text-text-faint">Mobile number</dt>
                <dd className="m-0 mt-0.5 type-body font-medium text-text">{formatAccountMobile(profile.mobile)}</dd>
              </div>
            </dl>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="m-0 type-body font-semibold text-text">Appearance</p>
              <p className="m-0 type-body-sm text-text-soft">Light, dark, or follow your device.</p>
            </div>
            <ThemeSwitch />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <div>
              <p className="m-0 type-body font-semibold text-text">Sign out</p>
              <p className="m-0 type-body-sm text-text-soft">Sign out of this device.</p>
            </div>
            <Button variant="secondary" onClick={() => setConfirmOut(true)}>
              Sign out
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOut}
        onOpenChange={setConfirmOut}
        title="Sign out?"
        description="Your tickets stay safe in your account. Sign in again any time with a code or your password."
        confirmLabel="Sign out"
        icon={<LogoutIcon />}
        onConfirm={async () => {
          setConfirmOut(false);
          await attendeeAuth.signOut();
          toast.info("Signed out");
          router.push("/");
        }}
      />
    </div>
  );
}
