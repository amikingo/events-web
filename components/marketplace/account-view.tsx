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
import { CardIcon, LogoutIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { toast } from "@/components/ui/toaster";
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
            <p className="m-0 type-label text-text-faint">Cheche account</p>
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
