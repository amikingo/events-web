"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { groupPhone, phoneDigits, validatePhone } from "@/lib/marketplace/validation";
import { ApiError } from "@/lib/api-client";
import { guestAuthMessage } from "@/lib/api/errors";
import { attendeeAuth } from "@/app/auth/attendee/attendee-auth-service";
import { AuthCard, StepLink, safeNext } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";

type Errors = Partial<Record<"firstName" | "lastName" | "phone" | "password" | "agreed", string>>;

/** Create a guest Cheche account: details + password, then verify mobile by SMS code. */
export function SignUpStep({ next, go, challenge, setChallenge }: StepProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // Filled in when sign-in found no account for this number and sent the person here.
  const [phone, setPhone] = useState(() => (challenge?.mobile ? groupPhone(challenge.mobile) : ""));
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<{ message: string; offerSignIn?: boolean; mobile?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const ids = {
    firstName: useId(),
    lastName: useId(),
    phone: useId(),
    password: useId(),
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Errors = {
      firstName: firstName.trim() ? undefined : "Enter your first name.",
      lastName: lastName.trim() ? undefined : "Enter your last name.",
      phone: validatePhone(phone),
      password: password.trim() ? undefined : "Choose a password.",
      agreed: agreed ? undefined : "Agree to the terms to create an account.",
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    const e164 = `+251${phoneDigits(phone)}`;
    setFailure(null);
    setLoading(true);
    try {
      await attendeeAuth.signUp({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        mobile: e164,
        password,
      });
      // Password stays in React component state only until signup/confirm completes.
      setChallenge({
        mobile: e164,
        purpose: "sign-up",
        password,
        next: safeNext(next),
      });
      go("code");
    } catch (error) {
      setFailure({
        message: signUpErrorMessage(error),
        offerSignIn: error instanceof ApiError && error.code === "account_exists",
        mobile: e164,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      onBack={() => go("sign-in")}
      backLabel="Back to sign in"
      description="Keep all your tickets in one place and register faster."
      footer={
        <>
          Already have an account? <StepLink onClick={() => go("sign-in")}>Sign in</StepLink>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {failure && (
          <ErrorBanner>
            {failure.message}
            {failure.offerSignIn && (
              <>
                {" "}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => {
                    // Carry the number over, so sign-in opens with it filled in.
                    if (failure.mobile) setChallenge({ mobile: failure.mobile, purpose: "sign-in", next: safeNext(next) });
                    go("sign-in");
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </ErrorBanner>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor={ids.firstName} required error={errors.firstName}>
            <Input
              id={ids.firstName}
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={Boolean(errors.firstName)}
              autoFocus
            />
          </Field>
          <Field label="Last name" htmlFor={ids.lastName} required error={errors.lastName}>
            <Input
              id={ids.lastName}
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={Boolean(errors.lastName)}
            />
          </Field>
        </div>
        <Field label="Mobile number" htmlFor={ids.phone} required error={errors.phone} hint="We'll text a code to verify it.">
          <PhoneInput id={ids.phone} value={phone} onValueChange={setPhone} error={Boolean(errors.phone)} />
        </Field>
        <Field label="Password" htmlFor={ids.password} required error={errors.password} hint="Choose a password to sign in with later.">
          <PasswordInput
            id={ids.password}
            autoComplete="new-password"
            value={password}
            onValueChange={setPassword}
            error={Boolean(errors.password)}
          />
        </Field>
        <Field error={errors.agreed}>
          <Checkbox checked={agreed} onCheckedChange={setAgreed} label="I agree to the terms of use and privacy notice" />
        </Field>
        <Button type="submit" loading={loading} loadingLabel="Sending code" className="w-full">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}

function signUpErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "validation_error") {
    const details = error.details as { issues?: Array<{ message?: string }> } | undefined;
    const issueMessage = details?.issues?.find((i) => typeof i.message === "string" && i.message.trim())?.message;
    if (issueMessage) return issueMessage;
  }
  return guestAuthMessage(error);
}
