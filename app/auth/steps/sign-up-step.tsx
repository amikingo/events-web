"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { phoneDigits, validateEmail, validateName, validatePhone } from "@/lib/marketplace/validation";
import { attendeeAuth } from "@/app/auth/attendee/attendee-auth-service";
import { AuthCard, DemoHint, StepLink, safeNext } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "@/components/ui/toaster";

/** Create an attendee account: details, then a code to verify the phone. */
export function SignUpStep({ next, go }: StepProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string; agreed?: string }>({});
  const [loading, setLoading] = useState(false);
  const ids = { name: useId(), phone: useId(), email: useId() };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = { name: validateName(name), phone: validatePhone(phone), email: validateEmail(email), agreed: agreed ? undefined : "Agree to the terms to create an account." };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    if (attendeeAuth.hasAccount("sms", phone)) toast.info("You already have an account", { body: "Verify your number and we'll sign you in." });
    setLoading(true);
    await attendeeAuth.requestCode({ channel: "sms", value: phone, purpose: "sign-up", profile: { name, email, phone: phoneDigits(phone) }, next: safeNext(next, "/account") });
    go("code");
  }

  return (
    <AuthCard
      title="Create your account"
      onBack={() => go("sign-in")}
      backLabel="Back to sign in"
      description="Keep all your tickets in one place and check out faster."
      footer={
        <>
          Already have an account? <StepLink onClick={() => go("sign-in")}>Sign in</StepLink>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Full name" htmlFor={ids.name} required error={errors.name}>
          <Input id={ids.name} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={Boolean(errors.name)} />
        </Field>
        <Field label="Phone number" htmlFor={ids.phone} required error={errors.phone} hint="We'll text a code to verify it.">
          <PhoneInput id={ids.phone} value={phone} onValueChange={setPhone} error={Boolean(errors.phone)} />
        </Field>
        <Field label="Email" htmlFor={ids.email} required error={errors.email}>
          <Input id={ids.email} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={Boolean(errors.email)} />
        </Field>
        <Field error={errors.agreed}>
          <Checkbox checked={agreed} onCheckedChange={setAgreed} label="I agree to the terms of use and privacy notice" />
        </Field>
        <Button type="submit" loading={loading} loadingLabel="Sending code" className="w-full">
          Create account
        </Button>
      </form>
      <DemoHint />
    </AuthCard>
  );
}
