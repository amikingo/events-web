"use client";

import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { AuthCard, StepLink } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Note } from "@/components/ui/note";
import { OtpInput } from "@/components/ui/otp-input";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { requestStaffPasswordReset, resetStaffPassword } from "@/lib/api/auth";
import { SMS_CODE_LENGTH } from "@/lib/constants/sms-code";
import { describeApiError } from "@/lib/api/errors";
import { groupPhone } from "@/lib/marketplace/validation";

/**
 * Step 2 of a team reset (Phase 10): the SMS code and a new password. A wrong or expired code offers a new one. On
 * success, back to team sign-in with the mobile filled in. Passwords stay in this screen's state only.
 */
export function ResetStep({ go, challenge, setChallenge }: StepProps) {
  const mobile = challenge?.purpose === "staff-reset" ? challenge.mobile : "";
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ code?: string; password?: string; confirm?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [codeWrong, setCodeWrong] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const ids = { new: useId(), confirm: useId() };

  // Opened without a mobile (a reload, or a pasted link): start again from the mobile step.
  useEffect(() => {
    if (!mobile) go("forgot");
  }, [mobile, go]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      code: code.length === SMS_CODE_LENGTH ? undefined : `Enter the ${SMS_CODE_LENGTH}-digit code.`,
      password: newPassword.length < 8 ? "Use at least 8 characters." : undefined,
      confirm: newPassword === confirmPassword ? undefined : "The two passwords don't match.",
    };
    setErrors(next);
    setFailure(null);
    if (next.code || next.password || next.confirm) return;
    setLoading(true);
    try {
      await resetStaffPassword(mobile, code, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed", { body: "Sign in with your new password." });
      setChallenge({ mobile, purpose: "staff-sign-in" });
      go("sign-in");
    } catch (error) {
      if (error instanceof ApiError && error.code === "invalid_code") {
        setCodeWrong(true);
        setErrors({ code: "The code is wrong or has expired." });
      } else {
        const issues = error instanceof ApiError ? ((error.details as { issues?: { path?: string; message?: string }[] } | undefined)?.issues ?? []) : [];
        const passwordIssue = issues.find((i) => i.path === "body.new_password");
        if (passwordIssue) setErrors({ password: passwordIssue.message ?? "Choose another password." });
        else setFailure(describeApiError(error));
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendNewCode() {
    setResending(true);
    try {
      const reply = await requestStaffPasswordReset(mobile);
      setChallenge({ mobile, purpose: "staff-reset", message: reply.message });
      setCode("");
      setCodeWrong(false);
      setErrors({});
      toast.info("New code sent", { body: reply.message });
    } catch (error) {
      setFailure(error instanceof ApiError && error.status === 429 ? "Too many codes for this number. Wait 10 minutes and try again." : describeApiError(error));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthCard title="Choose a new password" description={`For +251 ${groupPhone(mobile)}.`} onBack={() => go("forgot")} backLabel="Change the number">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {/* The API's own words: it never says whether the number has team access. */}
        {challenge?.message && (
          <Note className="mt-0" role="status">
            {challenge.message}
          </Note>
        )}
        {failure && <ErrorBanner>{failure}</ErrorBanner>}
        <Field label="Code from the SMS" required error={errors.code}>
          <OtpInput length={SMS_CODE_LENGTH} value={code} onValueChange={setCode} status={errors.code ? "error" : "default"} />
        </Field>
        <div className="flex justify-end type-body-sm">
          <StepLink onClick={() => !resending && void sendNewCode()}>
            {resending ? "Sending…" : codeWrong ? "Send a new code" : "Didn't get it? Send again"}
          </StepLink>
        </div>
        <Field label="New password" htmlFor={ids.new} required error={errors.password} hint="At least 8 characters.">
          <PasswordInput id={ids.new} autoComplete="new-password" value={newPassword} error={!!errors.password} onValueChange={setNewPassword} />
        </Field>
        <Field label="Confirm new password" htmlFor={ids.confirm} required error={errors.confirm}>
          <PasswordInput id={ids.confirm} autoComplete="new-password" value={confirmPassword} error={!!errors.confirm} onValueChange={setConfirmPassword} />
        </Field>
        <Button type="submit" loading={loading} loadingLabel="Saving password" className="w-full">
          Set new password
        </Button>
      </form>
    </AuthCard>
  );
}
