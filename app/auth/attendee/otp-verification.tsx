"use client";

import { useState } from "react";
import { DEMO } from "@/lib/marketplace/config";
import { maskPhone } from "@/lib/format";
import { attendeeAuth } from "@/app/auth/attendee/attendee-auth-service";
import type { Channel, ChallengePurpose, PendingProfile } from "@/app/auth/attendee/attendee-auth-service";
import type { AttendeeAccount } from "@/types/marketplace";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { CheckThinIcon, InfoIcon, LockIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/icon-tile";
import { Note } from "@/components/ui/note";
import { OtpInput, OtpResend } from "@/components/ui/otp-input";

type Phase = "idle" | "sending" | "sent" | "verifying" | "invalid" | "locked" | "expired" | "verified";

/**
 * Code verification: send → enter six digits → verified, with the resend countdown, wrong-code, too-many-attempts and
 * expired states. Simulated (no SMS is sent); the demo code is shown in a note so the flow can be tested.
 */
export function OTPVerification({
  channel,
  target,
  purpose,
  profile,
  next,
  alreadyVerified = false,
  autoSend = false,
  onVerified,
}: {
  channel: Channel;
  /** Nine phone digits or an email address. */
  target: string;
  purpose: ChallengePurpose;
  profile?: PendingProfile;
  next?: string;
  alreadyVerified?: boolean;
  /** Start with the code already requested (the sign-in flow requested it on the previous screen). */
  autoSend?: boolean;
  onVerified: (account: AttendeeAccount | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>(alreadyVerified ? "verified" : autoSend ? "sent" : "idle");
  const [code, setCode] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  // Bumped after a wrong code: the boxes clear and focus returns to the first one, so a retype starts fresh.
  const [round, setRound] = useState(0);
  const shown = channel === "sms" ? maskPhone(target) : target;

  async function send() {
    setPhase("sending");
    await attendeeAuth.requestCode({ channel, value: target, purpose, profile, next });
    setCode("");
    setPhase("sent");
  }

  async function verify(value: string) {
    if (phase === "verifying") return;
    setPhase("verifying");
    const res = await attendeeAuth.verifyCode(value);
    if (res.ok) {
      setPhase("verified");
      onVerified(res.account);
      return;
    }
    if (res.reason === "invalid") {
      setAttemptsLeft(res.attemptsLeft);
      setCode("");
      setRound((r) => r + 1);
      setPhase("invalid");
    } else if (res.reason === "missing") {
      setPhase("idle");
    } else {
      setPhase(res.reason);
    }
  }

  if (phase === "verified") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-4" role="status">
        <IconTile tone="success">
          <CheckThinIcon />
        </IconTile>
        <div>
          <p className="m-0 type-body font-semibold text-text">{channel === "sms" ? "Phone number verified" : "Email verified"}</p>
          <p className="m-0 type-body-sm text-text-soft">{shown} is confirmed.</p>
        </div>
      </div>
    );
  }

  if (phase === "idle" || phase === "sending") {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="m-0 type-body text-text-soft">
          We&rsquo;ll send a six-digit code to <b className="text-text">{shown}</b> to make sure your tickets reach you.
        </p>
        <Button onClick={send} loading={phase === "sending"} loadingLabel="Sending code">
          Send code
        </Button>
        <DemoNote />
      </div>
    );
  }

  const blocked = phase === "locked" || phase === "expired";

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 type-body text-text-soft">
        Enter the code we sent to <b className="text-text">{shown}</b>.
      </p>
      {blocked ? (
        <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-4" role="alert">
          <IconTile tone="danger" size="sm">
            <LockIcon />
          </IconTile>
          <div className="flex flex-col items-start gap-2">
            <p className="m-0 type-body font-semibold text-text">{phase === "locked" ? "Too many wrong codes" : "This code has expired"}</p>
            <p className="m-0 type-body-sm text-text-soft">{phase === "locked" ? "For your security, request a new code to try again." : "Codes last 10 minutes. Request a new one."}</p>
            <Button variant="secondary" onClick={send}>
              Send a new code
            </Button>
          </div>
        </div>
      ) : (
        <Field
          error={phase === "invalid" ? `That code isn't right. ${attemptsLeft === 1 ? "1 attempt left." : `${attemptsLeft} attempts left.`}` : undefined}
          hint={phase === "verifying" ? "Checking the code…" : undefined}
        >
          <OtpInput
            key={round}
            value={code}
            onValueChange={(v) => {
              setCode(v);
              if (phase === "invalid") setPhase("sent");
            }}
            onComplete={verify}
            status={phase === "invalid" && !code ? "error" : "default"}
            start
            autoFocus
            aria-label="Verification code"
          />
        </Field>
      )}
      {!blocked && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <OtpResend
            onResend={async () => {
              await attendeeAuth.resendCode();
              setCode("");
              setPhase("sent");
            }}
          />
          <Button variant="secondary" disabled={code.length < 6} loading={phase === "verifying"} loadingLabel="Verifying" onClick={() => verify(code)}>
            Verify
          </Button>
        </div>
      )}
      <DemoNote />
    </div>
  );
}

function DemoNote() {
  return (
    <Note icon={<InfoIcon />}>
      Demo mode: no message is sent. Use code <b className="tabular-nums text-text">{DEMO.code}</b>; any other code shows the error state.
    </Note>
  );
}
