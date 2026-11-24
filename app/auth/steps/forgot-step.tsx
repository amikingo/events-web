"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { validateEmail } from "@/lib/marketplace/validation";
import { AuthCard } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { toast } from "@/components/ui/toaster";

/** Staff password recovery: ask for the email, then move on to choosing a new password. */
export function ForgotStep({ go }: StepProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSent(true);
    toast.success("Recovery link sent");
  }

  return (
    <AuthCard title="Reset your password" description="Enter your work email and we'll send a link to choose a new password." onBack={() => go("sign-in")} backLabel="Back to sign in">
      {sent ? (
        <div className="flex flex-col gap-4">
          <Note>
            We sent a recovery link to <b>{email}</b>. Open it to choose a new password.
          </Note>
          <Button onClick={() => go("reset")}>Continue to reset password</Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field label="Work email" htmlFor={id} required error={error}>
            <Input id={id} type="email" autoComplete="email" value={email} error={!!error} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoFocus />
          </Field>
          <Button type="submit" loading={loading} loadingLabel="Sending link" className="w-full">
            Send recovery link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
