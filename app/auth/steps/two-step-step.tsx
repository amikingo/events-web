"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { AuthCard } from "@/app/auth/shared";
import type { StepProps } from "@/app/auth/shared";
import { Button } from "@/components/ui/button";
import { OtpInput, OtpResend } from "@/components/ui/otp-input";
import { toast } from "@/components/ui/toaster";

/** Two-step check for staff: the six-digit code from their authenticator. */
export function TwoStepStep({ go }: StepProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length < 6) return toast.error("Enter all six digits of the code.");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    toast.success("Code accepted");
    router.push("/admin/dashboard");
  }

  return (
    <AuthCard
      title="Enter your code"
      description="Type the six-digit code from your authenticator app."
      onBack={() => go("sign-in")}
      backLabel="Back to sign in"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 py-2">
          <OtpInput value={code} onValueChange={setCode} length={6} autoFocus aria-label="Two-step verification code" />
          <OtpResend onResend={() => toast.info("New code sent")} variant="modal" />
        </div>
        <Button type="submit" loading={loading} loadingLabel="Checking code" disabled={code.length < 6} className="w-full">
          Continue
        </Button>
      </form>
    </AuthCard>
  );
}
