"use client";

import { AuthCard } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { Button } from "@/components/ui/button";

/** Customer sign-in has no password-reset endpoint yet: send people back to one-time SMS code sign-in. */
export function ForgotStep({ go }: StepProps) {
  return (
    <AuthCard
      title="Sign in with a code instead"
      description="Enter your mobile number on the sign-in screen and we'll text a six-digit code — no password needed."
      onBack={() => go("sign-in")}
      backLabel="Back to sign in"
    >
      <Button onClick={() => go("sign-in")} className="w-full">
        Sign in with a code instead
      </Button>
    </AuthCard>
  );
}
