"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { MARKETPLACE } from "@/lib/marketplace/config";
import { groupPhone, phoneDigits, validatePhone } from "@/lib/marketplace/validation";
import { SMS_CODE_LENGTH } from "@/lib/constants/sms-code";
import { ApiError } from "@/lib/api-client";
import { guestAuthMessage } from "@/lib/api/errors";
import { attendeeAuth } from "@/app/auth/attendee/attendee-auth-service";
import { AuthCard, StepLink, landing, safeNext } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { authService } from "@/app/auth/staff/auth-service";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "@/components/ui/toaster";

type Mode = "code" | "password" | "team";

/**
 * Sign in for everyone:
 * - Guest SMS code (default): Ethiopian mobile → SMS code (`POST /v1/auth/customer/code`) → verify on code step.
 * - Guest password: mobile + password (`POST /v1/auth/customer/login/password`).
 * - Team sign-in: mobile + password (`POST /v1/auth/staff/login`).
 */
export function SignInStep({ next, go, challenge, setChallenge }: StepProps) {
  const router = useRouter();
  // Back from a staff password reset: open on team sign-in, with the mobile filled in.
  const [mode, setMode] = useState<Mode>(() => (challenge?.purpose === "staff-sign-in" ? "team" : "code"));
  // Filled in when sign-up found an existing account and sent the person here.
  const [mobile, setMobile] = useState(() => (challenge?.mobile ? groupPhone(challenge.mobile) : ""));
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ mobile?: string; password?: string }>({});
  const [failure, setFailure] = useState<{ message: string; offerSignUp?: boolean; mobile?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const mobileId = useId();
  const pwId = useId();

  function switchMode(target: Mode) {
    setMode(target);
    setPassword("");
    setErrors({});
    setFailure(null);
  }

  async function submitCustomerCode(e: FormEvent) {
    e.preventDefault();
    const mobileError = validatePhone(mobile);
    setErrors({ mobile: mobileError });
    if (mobileError) return;

    const e164 = `+251${phoneDigits(mobile)}`;
    setFailure(null);
    setLoading(true);
    try {
      await attendeeAuth.requestCode(e164);
      setChallenge({ mobile: e164, purpose: "sign-in", next: safeNext(next) });
      go("code");
    } catch (error) {
      setFailure({
        message: guestAuthMessage(error),
        offerSignUp: error instanceof ApiError && error.code === "account_not_found",
        mobile: e164,
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitCustomerPassword(e: FormEvent) {
    e.preventDefault();
    const nextErrors = {
      mobile: validatePhone(mobile),
      password: password ? undefined : "Enter your password.",
    };
    setErrors(nextErrors);
    if (nextErrors.mobile || nextErrors.password) return;

    const e164 = `+251${phoneDigits(mobile)}`;
    setFailure(null);
    setLoading(true);
    try {
      const profile = await attendeeAuth.loginWithPassword(e164, password);
      setChallenge(null);
      setPassword("");
      toast.success(profile.firstname ? `Welcome back, ${profile.firstname}` : "Welcome back");
      router.push(landing("attendee", next));
    } catch (error) {
      setFailure({ message: guestAuthMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  async function submitTeam(e: FormEvent) {
    e.preventDefault();
    const nextErrors = {
      mobile: validatePhone(mobile),
      password: password ? undefined : "Enter your password.",
    };
    setErrors(nextErrors);
    if (nextErrors.mobile || nextErrors.password) return;
    setFailure(null);
    setLoading(true);
    try {
      const user = await authService.login(`+251${phoneDigits(mobile)}`, password);
      toast.success(`Welcome back, ${user.name}`);
      router.push(landing("staff", next));
    } catch (error) {
      setFailure({ message: teamFailureMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  if (mode === "team") {
    return (
      <AuthCard
        title="Team sign-in"
        description="Use the mobile number and password for your team account."
        onBack={() => switchMode("code")}
        backLabel="Back to sign in"
      >
        <form onSubmit={submitTeam} noValidate className="flex flex-col gap-4">
          {failure && <ErrorBanner>{failure.message}</ErrorBanner>}
          <Field label="Mobile number" htmlFor={mobileId} required error={errors.mobile}>
            <PhoneInput id={mobileId} autoComplete="username" value={mobile} onValueChange={setMobile} error={!!errors.mobile} autoFocus />
          </Field>
          <Field label="Password" htmlFor={pwId} required error={errors.password}>
            <PasswordInput id={pwId} autoComplete="current-password" value={password} error={!!errors.password} onValueChange={setPassword} />
          </Field>
          <div className="flex items-center justify-between type-body-sm">
            <Checkbox checked={rememberMe} onCheckedChange={setRememberMe} label="Remember this device" />
            <StepLink
              onClick={() => {
                // Team passwords reset by SMS code (Phase 10); the typed mobile rides along.
                const digits = phoneDigits(mobile);
                setChallenge({ mobile: digits.length === 9 ? `+251${digits}` : "", purpose: "staff-reset" });
                go("forgot");
              }}
            >
              Forgot password?
            </StepLink>
          </div>
          <Button type="submit" loading={loading} loadingLabel="Signing in" className="w-full">
            Sign in
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (mode === "password") {
    return (
      <AuthCard
        title="Sign in"
        onBack={() => switchMode("code")}
        backLabel="Back to code sign-in"
        description={`Use your Cheche mobile number and password to view your tickets on ${MARKETPLACE.name}.`}
        footer={
          <>
            Prefer a one-time SMS code? <StepLink onClick={() => switchMode("code")}>Sign in with a code instead</StepLink>
            <br />
            New here? <StepLink onClick={() => go("sign-up")}>Create an account</StepLink>
          </>
        }
      >
        <form onSubmit={submitCustomerPassword} noValidate className="flex flex-col gap-4">
          {failure && <ErrorBanner>{failure.message}</ErrorBanner>}
          <Field label="Mobile number" htmlFor={mobileId} required error={errors.mobile}>
            <PhoneInput id={mobileId} autoComplete="username" value={mobile} onValueChange={setMobile} error={!!errors.mobile} autoFocus />
          </Field>
          <Field label="Password" htmlFor={pwId} required error={errors.password}>
            <PasswordInput id={pwId} autoComplete="current-password" value={password} error={!!errors.password} onValueChange={setPassword} />
          </Field>
          <div className="flex justify-end type-body-sm">
            <StepLink onClick={() => go("forgot")}>Forgot password?</StepLink>
          </div>
          <Button type="submit" loading={loading} loadingLabel="Signing in" className="w-full">
            Sign in
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Sign in"
      onBack={() => router.push("/")}
      backLabel="Back to events"
      description={`Use your mobile number to view your tickets on ${MARKETPLACE.name}.`}
      footer={
        <>
          Have a password? <StepLink onClick={() => switchMode("password")}>Sign in with a password</StepLink>
          <br />
          New here? <StepLink onClick={() => go("sign-up")}>Create an account</StepLink>
          <br />
          On the team? <StepLink onClick={() => switchMode("team")}>Team sign-in</StepLink>
        </>
      }
    >
      <form onSubmit={submitCustomerCode} noValidate className="flex flex-col gap-4">
        {failure && (
          <ErrorBanner>
            {failure.message}
            {failure.offerSignUp && (
              <>
                {" "}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => {
                    // Carry the number over, so sign-up opens with it filled in.
                    if (failure.mobile) setChallenge({ mobile: failure.mobile, purpose: "sign-up", next: safeNext(next) });
                    go("sign-up");
                  }}
                >
                  Create an account
                </button>
              </>
            )}
          </ErrorBanner>
        )}
        <Field label="Mobile number" htmlFor={mobileId} required error={errors.mobile} hint={`We'll text a ${SMS_CODE_LENGTH}-digit code to confirm it's you.`}>
          <PhoneInput id={mobileId} autoComplete="tel-national" value={mobile} onValueChange={setMobile} error={!!errors.mobile} autoFocus />
        </Field>
        <Button type="submit" loading={loading} loadingLabel="Sending code" className="w-full">
          Send code
        </Button>
      </form>
    </AuthCard>
  );
}

/** What to tell a team member when sign-in fails. Always decided by `error.code`, never by the server's wording. */
function teamFailureMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";
  switch (error.code) {
    case "invalid_credentials":
      return "The mobile number or password is not right. Check them and try again.";
    case "staff_assignment_not_found":
      return "You don't have access to Events yet. Ask an admin to add you.";
    case "role_inactive":
    case "organization_inactive":
    case "branch_inactive":
    case "invalid_tenant_scope":
      return "Your team role is switched off at the moment. Ask an admin to turn it back on.";
    case "rate_limited":
    case "central_auth_rate_limited":
      return "Too many attempts. Wait a minute and try again.";
    case "validation_error":
      return "Check the mobile number and password, then try again.";
    case "network_error":
    case "central_auth_unavailable":
    case "central_auth_malformed_response":
    case "service_unavailable":
      return "Sign-in is temporarily unavailable. Try again in a moment.";
    default:
      return "We couldn't sign you in. Try again.";
  }
}
