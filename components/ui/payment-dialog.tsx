"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { ErrorBanner } from "./error-banner";
import { IconTile } from "./icon-tile";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "./modal";
import { OtpInput, OtpResend } from "./otp-input";
import { PayLogo } from "./pay-logo";
import type { PayLogoMethod } from "./pay-logo";
import { Note } from "./note";
import { Spinner } from "./spinner";
import { StepList } from "./step-list";
import type { StepItem } from "./step-list";
import { CardIcon, ShieldIcon } from "./icons";

interface PaymentBase {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: PayLogoMethod;
  container?: "viewport" | "parent";
}

export interface PaymentOtpDialogProps extends PaymentBase {
  title: ReactNode;
  /** "Code sent to +251 9•• ••• 412". */
  subtitle?: ReactNode;
  /** "2,550 ETB". */
  amount: ReactNode;
  /** "Soreti Spa · Hair Cut". */
  payee: ReactNode;
  length?: number;
  /** Called with the full code when the user presses Pay. */
  onPay: (code: string) => void;
  onResend: () => void;
  loading?: boolean;
  /** The failure of the last attempt ("Wrong code. 2 attempts left."). */
  error?: ReactNode;
  payLabel?: ReactNode;
}

/** The "Confirm with Telebirr" modal: method logo, amount summary, six-digit code, resend countdown. Pay stays disabled until the code is complete. */
export function PaymentOtpDialog({ open, onOpenChange, method, title, subtitle, amount, payee, length = 6, onPay, onResend, loading, error, payLabel = "Pay", container }: PaymentOtpDialogProps) {
  const [code, setCode] = useState("");
  useEffect(() => {
    if (open) setCode("");
  }, [open]);
  return (
    <Modal open={open} onOpenChange={(o) => !loading && onOpenChange(o)} size="sm" container={container} aria-label={typeof title === "string" ? title : undefined}>
      <ModalHeader leading={<PayLogo method={method} />} title={title} subtitle={subtitle} onClose={loading ? undefined : () => onOpenChange(false)} />
      <ModalBody>
        <div className="mb-4 flex items-center gap-3 rounded-md bg-surface-2 px-3.5 py-3 text-left">
          <IconTile size="sm">
            <CardIcon />
          </IconTile>
          <div>
            <div className="text-[11.5px] text-text-faint">You are paying</div>
            <div className="text-[18px] font-bold tracking-[-0.3px] leading-[1.55] text-text [font-variant-numeric:tabular-nums]">{amount}</div>
            <div className="text-[12px] text-text-soft">to {payee}</div>
          </div>
        </div>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <OtpInput value={code} onValueChange={setCode} length={length} status={error ? "error" : "default"} autoFocus aria-label="Payment code" />
        <OtpResend variant="modal" onResend={onResend} className="mt-3" />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" disabled={loading} onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button className="min-w-[110px]" disabled={code.length < length} loading={loading} loadingLabel="Paying" onClick={() => onPay(code)}>
          {payLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export interface PaymentProcessingDialogProps extends PaymentBase {
  title: ReactNode;
  subtitle?: ReactNode;
  steps: StepItem[];
  /** Instruction under the steps. */
  hint?: ReactNode;
  /** Seconds before the "still waiting" block replaces the hint. Default 30. */
  fallbackAfter?: number;
  onCancel: () => void;
  onNotify?: () => void;
}

/** While a payment is pending on the phone: the step list, the instruction and — after 30s — a "taking longer" fallback with Keep waiting / Notify me. */
export function PaymentProcessingDialog({ open, onOpenChange, method, title, subtitle, steps, hint = "Approve the request on your phone. Don't close this screen.", fallbackAfter = 30, onCancel, onNotify, container }: PaymentProcessingDialogProps) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!open) return setSlow(false);
    if (slow) return;
    const t = setTimeout(() => setSlow(true), fallbackAfter * 1000);
    return () => clearTimeout(t);
  }, [open, slow, fallbackAfter]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="sm" dismissible={false} role="alertdialog" container={container} aria-label={typeof title === "string" ? title : undefined}>
      <ModalHeader trailing={<PayLogo method={method} />} title={title} subtitle={subtitle} />
      <ModalBody>
        {!slow && <StepList steps={steps} />}
        {slow ? (
          <div className="flex flex-col items-center gap-3 px-4 py-6 text-center text-[12.5px] text-text-faint">
            <Spinner size="lg" />
            <b className="text-[13.5px] font-semibold text-text">Still waiting for {method === "telebirr" ? "Telebirr" : "the payment"}</b>
            <span>It&apos;s taking longer than usual. You can leave; we&apos;ll notify you when it goes through.</span>
          </div>
        ) : (
          <Note icon={<ShieldIcon />} className="mt-4">
            {hint}
          </Note>
        )}
      </ModalBody>
      <ModalFooter>
        {slow ? (
          <>
            <Button variant="secondary" onClick={() => setSlow(false)}>
              Keep waiting
            </Button>
            <Button onClick={onNotify}>Notify me</Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
