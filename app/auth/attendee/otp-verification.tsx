"use client";

import { useState } from "react";
import { maskPhone } from "@/lib/format";
import { SMS_CODE_LENGTH } from "@/lib/constants/sms-code";
import { ApiError } from "@/lib/api-client";
import { guestAuthMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { OtpInput, OtpResend } from "@/components/ui/otp-input";
import { toast } from "@/components/ui/toaster";

/**
 * SMS code verification backed by `/v1/auth/customer/*`: enter code → submit to parent verifier, or resend
 * a fresh SMS code with rate-limit handling.
 */
export function OTPVerification({
  mobile,
  onVerify,
  onResend,
}: {
  /** Ethiopian E.164 mobile (`+2519...`). */
  mobile: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
}) {
  const [phase, setPhase] = useState<"idle" | "verifying" | "resending">("idle");
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [bannerError, setBannerError] = useState<string | null>(null);
  // Bumped after a wrong code: clears boxes and returns focus to the first digit.
  const [round, setRound] = useState(0);
  const shown = maskPhone(mobile);

  async function verify(value: string) {
    if (phase === "verifying" || value.length < SMS_CODE_LENGTH) return;
    setPhase("verifying");
    setFieldError(undefined);
    setBannerError(null);
    try {
      await onVerify(value);
    } catch (error) {
      if (error instanceof ApiError && error.code === "invalid_code") {
        setFieldError(guestAuthMessage(error));
        setCode("");
        setRound((r) => r + 1);
      } else {
        setBannerError(guestAuthMessage(error));
      }
      setPhase("idle");
    }
  }

  async function handleResend() {
    setPhase("resending");
    setFieldError(undefined);
    setBannerError(null);
    try {
      await onResend();
      setCode("");
      setRound((r) => r + 1);
      toast.info("A new code was sent");
    } catch (error) {
      setBannerError(guestAuthMessage(error));
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 type-body text-text-soft">
        Enter the {SMS_CODE_LENGTH}-digit code we sent to <b className="text-text">{shown}</b>.
      </p>
      {bannerError && <ErrorBanner>{bannerError}</ErrorBanner>}
      <Field error={fieldError} hint={phase === "verifying" ? "Checking the code…" : undefined}>
        <OtpInput
          key={round}
          value={code}
          onValueChange={(v) => {
            setCode(v);
            if (fieldError) setFieldError(undefined);
            if (bannerError) setBannerError(null);
          }}
          length={SMS_CODE_LENGTH}
          onComplete={verify}
          status={fieldError && !code ? "error" : "default"}
          start
          autoFocus
          aria-label="Verification code"
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <OtpResend onResend={handleResend} />
        <Button
          variant="secondary"
          disabled={code.length < SMS_CODE_LENGTH || phase === "resending"}
          loading={phase === "verifying"}
          loadingLabel="Verifying"
          onClick={() => verify(code)}
        >
          Verify
        </Button>
      </div>
    </div>
  );
}
