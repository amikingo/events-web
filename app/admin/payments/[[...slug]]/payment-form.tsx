"use client";

import { useState } from "react";
import { AmountInput } from "../../../../components/ui/amount-input";
import { Breadcrumb } from "../../../../components/ui/breadcrumb";
import { Button } from "../../../../components/ui/button";
import { Card, CardHeader } from "../../../../components/ui/card";
import { ConfirmDialog } from "../../../../components/ui/confirm-dialog";
import { Field } from "../../../../components/ui/field";
import { Input } from "../../../../components/ui/input";
import { PayLogo } from "../../../../components/ui/pay-logo";
import type { PayLogoMethod } from "../../../../components/ui/pay-logo";
import { PhoneInput } from "../../../../components/ui/phone-input";
import { SegmentedControl } from "../../../../components/ui/segmented-control";
import { StatusPill } from "../../../../components/ui/status-pill";
import { Textarea } from "../../../../components/ui/textarea";
import { formatCurrency } from "../../../../lib/format";
import type { Payment } from "../../../../types";

export type PaymentMethod = "Telebirr" | "CBE Birr" | "Wallet";

export interface PaymentFormValues {
  customer: string;
  phone: string;
  method: PaymentMethod;
  /** The amount as typed, with thousands separators. */
  amount: string;
  note: string;
}

/** The gateway keeps 1.5% of every payment. */
export const FEE_RATE = 0.015;

export const parseAmount = (value: string) => Number(value.replace(/,/g, "")) || 0;
export const feeOf = (amount: number) => Math.round(amount * FEE_RATE);

const logoOf = (m: PaymentMethod): PayLogoMethod => (m === "CBE Birr" ? "cbe" : m === "Wallet" ? "wallet" : "telebirr");

interface PaymentFormProps {
  /** The payment being edited. Leave out to record a new one. */
  payment?: Payment;
  onSubmit: (values: PaymentFormValues) => void;
  onCancel: () => void;
}

/**
 * Record and edit page for a payment: two cards of fields and a live summary of the amount, the fee and what the merchant
 * receives. The buttons sit in the header so they are always in view.
 */
export function PaymentForm({ payment, onSubmit, onCancel }: PaymentFormProps) {
  const editing = Boolean(payment);
  const start: PaymentFormValues = payment
    ? { customer: payment.customer, phone: payment.phone, method: payment.method as PaymentMethod, amount: payment.amount.toLocaleString("en-US"), note: payment.note }
    : { customer: "", phone: "", method: "Telebirr", amount: "", note: "" };

  const [values, setValues] = useState<PaymentFormValues>(start);
  const [errors, setErrors] = useState<Partial<Record<keyof PaymentFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const dirty = (Object.keys(start) as (keyof PaymentFormValues)[]).some((k) => values[k] !== start[k]);
  const gross = parseAmount(values.amount);
  const fee = feeOf(gross);

  function set<K extends keyof PaymentFormValues>(key: K, value: PaymentFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!values.customer.trim()) next.customer = "Enter the customer’s name.";
    if (gross <= 0) next.amount = "Enter an amount greater than 0.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    onSubmit(values);
  }

  function cancel() {
    if (dirty) setDiscardOpen(true);
    else onCancel();
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Breadcrumb
          items={[
            { label: "Payments", onClick: cancel },
            ...(editing ? [{ label: payment!.id, onClick: cancel }] : []),
            { label: editing ? "Edit" : "New payment" },
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="type-h1 m-0 text-text">{editing ? `Edit ${payment!.id}` : "New payment"}</h1>
            <p className="type-body m-0 text-text-soft">
              {editing ? "Change who paid, how, or how much." : "Record a payment you received."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" form="payment-form" loading={saving} loadingLabel="Saving" disabled={editing && !dirty}>
              {editing ? "Save changes" : "Record payment"}
            </Button>
          </div>
        </div>
      </div>

      {errorCount > 0 && (
        <p role="alert" className="type-body m-0 rounded-md border border-border bg-surface px-4 py-3 text-danger">
          {errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}
        </p>
      )}

      <form id="payment-form" onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Payment details" subtitle="Who paid, how they paid, and how much." />
            <div className="flex flex-col gap-4">
              <Field label="Customer name" htmlFor="customer" required error={errors.customer}>
                <Input id="customer" value={values.customer} error={!!errors.customer} onChange={(e) => set("customer", e.target.value)} placeholder="Hana Bekele" autoComplete="off" />
              </Field>
              <Field label="Payment method">
                <SegmentedControl
                  aria-label="Payment method"
                  value={values.method}
                  onValueChange={(v) => set("method", v as PaymentMethod)}
                  options={[
                    { value: "Telebirr", label: "Telebirr" },
                    { value: "CBE Birr", label: "CBE Birr" },
                    { value: "Wallet", label: "Wallet" },
                  ]}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Amount" htmlFor="amount" required error={errors.amount}>
                  <AmountInput id="amount" value={values.amount} error={!!errors.amount} onValueChange={(v) => set("amount", v)} />
                </Field>
                <Field label="Customer phone" htmlFor="phone" hint="Optional. Used to send the receipt.">
                  <PhoneInput id="phone" value={values.phone} onValueChange={(v) => set("phone", v)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Note" subtitle="Anything your team should know about this payment." />
            <Field label="Internal note" htmlFor="note" hint="Only your team sees this.">
              <Textarea id="note" value={values.note} onChange={(e) => set("note", e.target.value)} />
            </Field>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-4">
          <CardHeader title="Summary" subtitle="What this payment adds up to." />
          <div className="flex items-center gap-3">
            <PayLogo method={logoOf(values.method)} size={40} />
            <div className="flex min-w-0 flex-col">
              <span className="type-body truncate font-medium text-text">{values.customer.trim() || "New payment"}</span>
              <span className="type-body-sm text-text-faint">{values.method}</span>
            </div>
          </div>
          <dl className="m-0 mt-4 flex flex-col divide-y divide-border">
            <div className="flex items-center justify-between py-2.5">
              <dt className="type-body text-text-soft">Amount</dt>
              <dd className="type-body m-0 text-text">{formatCurrency(gross)}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="type-body text-text-soft">Gateway fee (1.5%)</dt>
              <dd className="type-body m-0 text-text">{formatCurrency(fee)}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="type-body font-medium text-text">Merchant receives</dt>
              <dd className="type-body m-0 font-semibold text-text">{formatCurrency(gross - fee)}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="type-body text-text-soft">Status</dt>
              <dd className="m-0">
                <StatusPill kind="payment" status={payment?.status ?? "paid"} />
              </dd>
            </div>
          </dl>
        </Card>
      </form>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard changes?"
        description="You have changes that are not saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setDiscardOpen(false);
          onCancel();
        }}
      />
    </div>
  );
}
