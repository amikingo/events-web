"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { AuthCard } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";

/** Choose a new staff password, then back to sign in. */
export function ResetStep({ go }: StepProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const ids = { new: useId(), confirm: useId() };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) return setError("Use at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("The two passwords don't match.");
    setError(undefined);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    toast.success("Password changed", { body: "Sign in with your new password." });
    go("sign-in");
  }

  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*]/.test(newPassword);

  return (
    <AuthCard
      title="Choose a new password"
      description="Use at least 8 characters, with a number and a symbol."
      onBack={() => go("forgot")}
      backLabel="Back"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="New password" htmlFor={ids.new} required error={error}>
          <PasswordInput id={ids.new} value={newPassword} error={!!error} onValueChange={setNewPassword} placeholder="Enter new password" autoFocus />
        </Field>
        <Field label="Confirm new password" htmlFor={ids.confirm} required>
          <PasswordInput id={ids.confirm} value={confirmPassword} onValueChange={setConfirmPassword} placeholder="Repeat new password" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Pill tone={hasMinLength ? "success" : "neutral"} dot={hasMinLength}>8+ characters</Pill>
          <Pill tone={hasNumber ? "success" : "neutral"} dot={hasNumber}>A number</Pill>
          <Pill tone={hasSpecial ? "success" : "neutral"} dot={hasSpecial}>A symbol</Pill>
        </div>
        <Button type="submit" loading={loading} loadingLabel="Updating password" className="w-full">
          Set new password
        </Button>
      </form>
    </AuthCard>
  );
}
