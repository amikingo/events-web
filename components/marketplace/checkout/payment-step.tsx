"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "../../../lib/format";
import { PAYMENT_METHODS, mockPaymentProvider } from "../../../lib/services/checkout-service";
import type { PaymentResult, PaymentScenario } from "../../../lib/services/checkout-service";
import type { PaymentMethodId } from "../../../types/marketplace";
import { Button } from "../../ui/button";
import { InfoIcon, ShieldIcon } from "../../ui/icons";
import { Note } from "../../ui/note";
import { PaymentProcessingDialog } from "../../ui/payment-dialog";
import { PayLogo } from "../../ui/pay-logo";
import { SegmentedControl } from "../../ui/segmented-control";
import { SelectCard } from "../../ui/select-card";
import type { StepItem } from "../../ui/step-list";
import { toast } from "../../ui/toaster";
import { PaymentStatus } from "./payment-status";

/** The three local payment options as selectable cards. */
export function PaymentMethodSelector({ value, onChange }: { value: PaymentMethodId; onChange: (m: PaymentMethodId) => void }) {
  return (
    <div role="radiogroup" aria-label="Payment method" className="flex flex-col gap-2.5">
      {PAYMENT_METHODS.map((m) => (
        <SelectCard key={m.id} role="radio" aria-checked={value === m.id} selected={value === m.id} onClick={() => onChange(m.id)} leading={<PayLogo method={m.id} size={32} />} title={m.name} subtitle={m.hint} />
      ))}
    </div>
  );
}

const STEP_LABELS = (method: string) => [`Request sent to ${method}`, "Waiting for your approval", "Confirming the payment"];

/**
 * Payment: choose a method, approve (simulated), then success, pending or failure with retry. The demo control decides
 * the simulated outcome; no money moves and nothing claims a real charge happened.
 */
export function PaymentStep({ total, onResult }: { total: number; onResult: (result: Extract<PaymentResult, { status: "paid" | "pending" }>, method: PaymentMethodId) => void }) {
  const [method, setMethod] = useState<PaymentMethodId>("telebirr");
  const [scenario, setScenario] = useState<PaymentScenario>("success");
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const methodName = PAYMENT_METHODS.find((m) => m.id === method)!.name;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function pay() {
    const id = ++attempt.current;
    setFailure(null);
    setStage(0);
    setProcessing(true);
    timers.current.forEach(clearTimeout);
    timers.current = [setTimeout(() => setStage(1), 1200), setTimeout(() => setStage(2), 3200)];
    const result = await mockPaymentProvider.charge({ method, amount: total, scenario });
    if (id !== attempt.current) return; // cancelled while waiting
    setProcessing(false);
    if (result.status === "failed") {
      setFailure(result.reason);
      return;
    }
    onResult(result, method);
  }

  function cancel() {
    attempt.current++;
    timers.current.forEach(clearTimeout);
    setProcessing(false);
    toast.info("Payment cancelled", { body: "You haven't been charged. Your tickets are still held." });
  }

  const steps: StepItem[] = STEP_LABELS(methodName).map((label, i) => ({ label, status: i < stage ? "done" : i === stage ? "active" : "pending" }));

  return (
    <div className="flex flex-col gap-6">
      {failure && (
        <PaymentStatus
          kind="failed"
          title="Payment didn't go through"
          description={failure}
          actions={
            <>
              <Button onClick={pay}>Try again</Button>
              <Button variant="secondary" onClick={() => setFailure(null)}>
                Use another method
              </Button>
            </>
          }
        />
      )}

      <section aria-labelledby="pay-method" className="flex flex-col gap-3">
        <h3 id="pay-method" className="m-0 type-h3 text-text">
          How would you like to pay?
        </h3>
        <PaymentMethodSelector value={method} onChange={setMethod} />
      </section>

      <div className="flex flex-col gap-2 rounded-md border border-dashed border-border-strong p-4">
        <p className="m-0 type-label text-text-faint">Demo control · simulated result</p>
        <SegmentedControl
          aria-label="Simulated payment result"
          value={scenario}
          onValueChange={(v) => setScenario(v as PaymentScenario)}
          options={[
            { value: "success", label: "Approved" },
            { value: "pending", label: "Pending" },
            { value: "failure", label: "Declined" },
          ]}
          size="sm"
          block
        />
        <p className="m-0 type-body-sm text-text-faint">This prototype has no payment provider connected. No money moves, whichever result you pick.</p>
      </div>

      <Note icon={<ShieldIcon />}>You&rsquo;ll approve the payment of {formatCurrency(total)} in {methodName}. We never see your PIN.</Note>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 sm:-mx-0 sm:rounded-md sm:border lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <div className="lg:hidden">
          <span className="block type-body-sm text-text-soft">Total</span>
          <span className="block type-body font-semibold tabular-nums text-text">{formatCurrency(total)}</span>
        </div>
        <Button onClick={pay} className="lg:w-full" disabled={processing}>
          Pay {formatCurrency(total)}
        </Button>
      </div>

      <PaymentProcessingDialog
        open={processing}
        onOpenChange={(o) => !o && cancel()}
        method={method}
        title={`Approve in ${methodName}`}
        subtitle={`${formatCurrency(total)} · check your phone`}
        steps={steps}
        hint={
          <span className="inline-flex items-start gap-1.5">
            <InfoIcon className="mt-0.5 size-3.5 flex-none" />
            Simulated approval. Keep this screen open until it finishes.
          </span>
        }
        onCancel={cancel}
      />
    </div>
  );
}
