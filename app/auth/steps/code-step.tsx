"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { phoneDigits, validateEmail, validateName, validatePhone } from "@/lib/marketplace/validation";
import { attendeeAuth, useChallenge } from "@/app/auth/attendee/attendee-auth-service";
import { OTPVerification } from "@/app/auth/attendee/otp-verification";
import { AuthCard, StepLink, safeNext } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { ClockIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";

/** Enter the six-digit code; a new phone or email then finishes the account. */
export function CodeStep({ go }: StepProps) {
  const router = useRouter();
  const challenge = useChallenge();
  const [needsProfile, setNeedsProfile] = useState(false);
  const [name, setName] = useState("");
  const [other, setOther] = useState("");
  const [errors, setErrors] = useState<{ name?: string; other?: string }>({});
  const nameId = useId();
  const otherId = useId();

  if (challenge === undefined) return <Skeleton className="mx-auto h-[360px] max-w-[440px] rounded-md" />;

  if (!challenge) {
    return (
      <EmptyState
        size="lg"
        tone="charcoal"
        icon={<ClockIcon />}
        title="Start again to get a new code"
        description="Your code request has expired or was already used."
        actions={<Button onClick={() => go("sign-in")}>Back to sign in</Button>}
      />
    );
  }

  const c = challenge;
  const finish = (profile?: { name: string; email: string; phone: string }) => {
    const account = attendeeAuth.completeVerification(c, profile);
    toast.success(`Welcome, ${account.name.split(" ")[0]}`, { body: "You're signed in." });
    router.push(safeNext(c.next, "/my-tickets"));
  };

  function submitProfile(e: FormEvent) {
    e.preventDefault();
    const errs = { name: validateName(name), other: c.channel === "sms" ? validateEmail(other) : validatePhone(other) };
    setErrors(errs);
    if (errs.name || errs.other) return;
    finish(c.channel === "sms" ? { name, email: other, phone: c.target } : { name, email: c.target, phone: phoneDigits(other) });
  }

  if (needsProfile) {
    return (
      <AuthCard title="Finish your account" description="One more step so we can send your tickets." onBack={() => go(c.purpose === "sign-up" ? "sign-up" : "sign-in")}>
        <form onSubmit={submitProfile} noValidate className="flex flex-col gap-4">
          <Field label="Full name" htmlFor={nameId} required error={errors.name}>
            <Input id={nameId} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={Boolean(errors.name)} autoFocus />
          </Field>
          {c.channel === "sms" ? (
            <Field label="Email" htmlFor={otherId} required error={errors.other} hint="Tickets and receipts go here.">
              <Input id={otherId} type="email" autoComplete="email" value={other} onChange={(e) => setOther(e.target.value)} error={Boolean(errors.other)} />
            </Field>
          ) : (
            <Field label="Phone number" htmlFor={otherId} required error={errors.other} hint="For text updates on the day.">
              <PhoneInput id={otherId} value={other} onValueChange={setOther} error={Boolean(errors.other)} />
            </Field>
          )}
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={c.channel === "sms" ? "Check your phone" : "Check your email"}
      onBack={() => go(c.purpose === "sign-up" ? "sign-up" : "sign-in")}
      footer={<StepLink onClick={() => go(c.purpose === "sign-up" ? "sign-up" : "sign-in")}>Use a different {c.channel === "sms" ? "number" : "email"}</StepLink>}
    >
      <OTPVerification
        channel={c.channel}
        target={c.target}
        purpose={c.purpose}
        profile={c.profile}
        next={c.next}
        autoSend
        onVerified={(account) => {
          if (account || c.profile) finish();
          else setNeedsProfile(true);
        }}
      />
    </AuthCard>
  );
}
