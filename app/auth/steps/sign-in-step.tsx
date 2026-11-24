"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { MARKETPLACE } from "@/lib/marketplace/config";
import { validateEmail, validatePhone } from "@/lib/marketplace/validation";
import { attendeeAuth } from "@/app/auth/attendee/attendee-auth-service";
import type { Channel } from "@/app/auth/attendee/attendee-auth-service";
import { AuthCard, DemoHint, StepLink, landing, safeNext } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { authService, isStaffEmail } from "@/app/auth/staff/auth-service";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "@/components/ui/toaster";

/**
 * Sign in for everyone. People enter an email or phone number; staff accounts are then asked for their password,
 * everyone else gets a one-time code.
 */
export function SignInStep({ next, go }: StepProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [staffEmail, setStaffEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const idId = useId();
  const pwId = useId();
  const typed = identifier.trim();
  // Say what will happen next as soon as the address shows which kind of account it is.
  const hint = !typed
    ? "Staff are asked for a password. Everyone else gets a six-digit code."
    : typed.includes("@") && isStaffEmail(typed)
      ? "This is a team account. We'll ask for your password next."
      : "We'll send a six-digit code to confirm it's you.";

  async function submitIdentifier(e: FormEvent) {
    e.preventDefault();
    const value = identifier.trim();
    const channel: Channel = value.includes("@") ? "email" : "sms";
    const error = channel === "email" ? validateEmail(value) : validatePhone(value);
    setErrors({ identifier: error });
    if (error) return;

    if (channel === "email" && isStaffEmail(value)) {
      setStaffEmail(value);
      return;
    }
    setLoading(true);
    await attendeeAuth.requestCode({ channel, value, purpose: "sign-in", next: safeNext(next) });
    go("code");
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    if (!password) {
      setErrors({ password: "Enter your password." });
      return;
    }
    setErrors({});
    setFailed(false);
    setLoading(true);
    try {
      const user = await authService.login(staffEmail!, password);
      toast.success(`Welcome back, ${user.name}`);
      router.push(landing("staff", next));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (staffEmail) {
    return (
      <AuthCard
        title="Enter your password"
        description={
          <>
            Signing in as <b className="text-text">{staffEmail}</b>.
          </>
        }
        onBack={() => {
          setStaffEmail(null);
          setPassword("");
          setFailed(false);
          setErrors({});
        }}
        backLabel="Use a different email"
      >
        <form onSubmit={submitPassword} noValidate className="flex flex-col gap-4">
          {failed && <ErrorBanner>The password is not right. Check it and try again.</ErrorBanner>}
          <Field label="Password" htmlFor={pwId} required error={errors.password}>
            <PasswordInput id={pwId} autoComplete="current-password" value={password} error={!!errors.password} onValueChange={setPassword} autoFocus />
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
        </>
      }
    >
      <form onSubmit={submitIdentifier} noValidate className="flex flex-col gap-4">
        <Field label="Email or phone number" htmlFor={idId} error={errors.identifier} hint={hint}>
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
