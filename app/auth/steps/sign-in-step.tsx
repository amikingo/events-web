"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { MARKETPLACE } from "@/lib/marketplace/config";
import { phoneDigits, validateEmail, validatePhone } from "@/lib/marketplace/validation";
import { ApiError } from "@/lib/api/client";
import { attendeeAuth } from "@/app/auth/attendee/attendee-auth-service";
import type { Channel } from "@/app/auth/attendee/attendee-auth-service";
import { AuthCard, DemoHint, StepLink, landing, safeNext } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { authService } from "@/app/auth/staff/auth-service";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "@/components/ui/toaster";

/**
 * Sign in for everyone. People enter an email or phone number and get a one-time code. Team members use "Team
 * sign-in" instead: mobile number and password, checked by events-api.
 */
export function SignInStep({ next, go }: StepProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [team, setTeam] = useState(false);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ identifier?: string; mobile?: string; password?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const idId = useId();
  const mobileId = useId();
  const pwId = useId();

  async function submitIdentifier(e: FormEvent) {
    e.preventDefault();
    const value = identifier.trim();
    const channel: Channel = value.includes("@") ? "email" : "sms";
    const error = channel === "email" ? validateEmail(value) : validatePhone(value);
    setErrors({ identifier: error });
    if (error) return;

    setLoading(true);
    await attendeeAuth.requestCode({ channel, value, purpose: "sign-in", next: safeNext(next) });
    go("code");
  }

  async function submitTeam(e: FormEvent) {
    e.preventDefault();
    const nextErrors = { mobile: validatePhone(mobile), password: password ? undefined : "Enter your password." };
    setErrors(nextErrors);
    if (nextErrors.mobile || nextErrors.password) return;
    setFailure(null);
    setLoading(true);
    try {
      const user = await authService.login(`+251${phoneDigits(mobile)}`, password);
      toast.success(`Welcome back, ${user.name}`);
      router.push(landing("staff", next));
    } catch (error) {
      setFailure(teamFailureMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (team) {
    return (
      <AuthCard
        title="Team sign-in"
        description="Use the mobile number and password for your team account."
        onBack={() => {
          setTeam(false);
          setPassword("");
          setFailure(null);
          setErrors({});
        }}
        backLabel="Back to sign in"
      >
        <form onSubmit={submitTeam} noValidate className="flex flex-col gap-4">
          {failure && <ErrorBanner>{failure}</ErrorBanner>}
          <Field label="Mobile number" htmlFor={mobileId} required error={errors.mobile}>
            <PhoneInput id={mobileId} autoComplete="username" value={mobile} onValueChange={setMobile} error={!!errors.mobile} autoFocus />
          </Field>
          <Field label="Password" htmlFor={pwId} required error={errors.password}>
            <PasswordInput id={pwId} autoComplete="current-password" value={password} error={!!errors.password} onValueChange={setPassword} />
          </Field>
          <div className="flex items-center justify-between type-body-sm">
            <Checkbox checked={rememberMe} onCheckedChange={setRememberMe} label="Remember this device" />
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
      description={`Use your email or phone number to open your tickets on ${MARKETPLACE.name} or your team dashboard.`}
      footer={
        <>
          New here? <StepLink onClick={() => go("sign-up")}>Create an account</StepLink>
          <br />
          On the team? <StepLink onClick={() => setTeam(true)}>Team sign-in</StepLink>
        </>
      }
    >
      <form onSubmit={submitIdentifier} noValidate className="flex flex-col gap-4">
        <Field label="Email or phone number" htmlFor={idId} error={errors.identifier} hint="We'll send a six-digit code to confirm it's you.">
          <Input
            id={idId}
            autoComplete="username"
            inputMode="email"
            value={identifier}
            error={!!errors.identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="name@example.com or 911 204 412"
            autoFocus
          />
        </Field>
        <Button type="submit" loading={loading} loadingLabel="Continuing" className="w-full">
          Continue
        </Button>
      </form>
      <DemoHint />
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
