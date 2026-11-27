"use client";

import { useRouter } from "next/navigation";
import { attendeeAuth } from "@/app/auth/attendee/attendee-auth-service";
import { OTPVerification } from "@/app/auth/attendee/otp-verification";
import { AuthCard, StepLink, landing } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ClockIcon } from "@/components/ui/icons";
import { toast } from "@/components/ui/toaster";

/** Enter the SMS code for guest sign-in or sign-up confirmation. */
export function CodeStep({ go, challenge, setChallenge }: StepProps) {
  const router = useRouter();

  if (!challenge || (challenge.purpose === "sign-up" && !challenge.password)) {
    return (
      <EmptyState
        size="lg"
        tone="charcoal"
        icon={<ClockIcon />}
        title="Start again to get a new code"
        description="Your code session is no longer active. Request a new code to continue."
        actions={<Button onClick={() => go("sign-in")}>Back to sign in</Button>}
      />
    );
  }

  const c = challenge;
  const backStep = c.purpose === "sign-up" ? "sign-up" : "sign-in";

  async function handleVerify(otp: string) {
    const profile =
      c.purpose === "sign-up"
        ? await attendeeAuth.confirmSignUp({ mobile: c.mobile, otp, password: c.password! })
        : await attendeeAuth.loginWithCode(c.mobile, otp);

    // Clear pending sign-up credentials from React state immediately after login.
    setChallenge(null);
    toast.success(profile.firstname ? `Welcome, ${profile.firstname}` : "You're signed in", {
      body: "You're signed in.",
    });
    router.push(landing("attendee", c.next));
  }

  async function handleResend() {
    if (c.purpose === "sign-up") {
      await attendeeAuth.resendCode(c.mobile);
    } else {
      await attendeeAuth.requestCode(c.mobile);
    }
  }

  return (
    <AuthCard
      title="Check your phone"
      onBack={() => go(backStep)}
      footer={<StepLink onClick={() => go(backStep)}>Use a different number</StepLink>}
    >
      <OTPVerification mobile={c.mobile} onVerify={handleVerify} onResend={handleResend} />
    </AuthCard>
  );
}
