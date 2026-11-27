"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { AuthCard } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { ApiError } from "@/lib/api-client";
import { requestStaffPasswordReset } from "@/lib/api/auth";
import { SMS_CODE_LENGTH } from "@/lib/constants/sms-code";
import { describeApiError } from "@/lib/api/errors";
import { groupPhone, phoneDigits, validatePhone } from "@/lib/marketplace/validation";

/**
 * Forgot password. A team member (from Team sign-in) gets an SMS code to reset it (Phase 10). Guests have no password
 * reset: they're sent back to sign in with a one-time SMS code instead.
 */
export function ForgotStep(props: StepProps) {
  return props.challenge?.purpose === "staff-reset" ? <StaffForgot {...props} /> : <GuestForgot {...props} />;
}

function GuestForgot({ go }: StepProps) {
  return (
    <AuthCard
      title="Sign in with a code instead"
      description={`Enter your mobile number on the sign-in screen and we'll text a ${SMS_CODE_LENGTH}-digit code — no password needed.`}
      onBack={() => go("sign-in")}
      backLabel="Back to sign in"
    >
      <Button onClick={() => go("sign-in")} className="w-full">
        Sign in with a code instead
      </Button>
    </AuthCard>
  );
}

/**
 * Step 1 of a team reset: the mobile. The API answers the same whether or not the number has team access, so the
 * screen always goes on to the code step with the API's own words, and never says "no account found".
 */
function StaffForgot({ go, challenge, setChallenge }: StepProps) {
  const [mobile, setMobile] = useState(() => (challenge?.mobile ? groupPhone(challenge.mobile) : ""));
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const mobileError = validatePhone(mobile);
    setError(mobileError);
    setFailure(null);
    if (mobileError) return;
    const e164 = `+251${phoneDigits(mobile)}`;
    setLoading(true);
    try {
      const reply = await requestStaffPasswordReset(e164);
      setChallenge({ mobile: e164, purpose: "staff-reset", message: reply.message });
      go("reset");
    } catch (error) {
      setFailure(error instanceof ApiError && error.status === 429 ? "Too many codes for this number. Wait 10 minutes and try again." : describeApiError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your team mobile number. We'll text a code to set a new password."
      onBack={() => {
        setChallenge({ mobile: challenge?.mobile ?? "", purpose: "staff-sign-in" });
        go("sign-in");
      }}
      backLabel="Back to team sign-in"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {failure && <ErrorBanner>{failure}</ErrorBanner>}
        <Field label="Mobile number" htmlFor={id} required error={error}>
          <PhoneInput id={id} autoComplete="username" value={mobile} onValueChange={setMobile} error={!!error} autoFocus />
        </Field>
        <Button type="submit" loading={loading} loadingLabel="Sending code" className="w-full">
          Send code
        </Button>
      </form>
    </AuthCard>
  );
}
