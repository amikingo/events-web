"use client";

import { useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { groupPhone, hasErrors, phoneDigits, validateEmail, validateName, validatePhone, validateRequired } from "../../../lib/marketplace/validation";
import type { AttendeeQuestion, Buyer, OrderItem, TicketHolder } from "../../../types/marketplace";
import { Checkbox } from "../../ui/checkbox";
import { Field } from "../../ui/field";
import { Input } from "../../ui/input";
import { PhoneInput } from "../../ui/phone-input";
import { Select } from "../../ui/select";

/** One row per ticket, in order: "Ticket 2 · VIP". */
export function expandTickets(items: OrderItem[]): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (const i of items) for (let n = 0; n < i.quantity; n++) out.push({ key: `${i.ticketTypeId}-${n}`, label: i.name });
  return out;
}

type Errors = Record<string, string | undefined>;

/**
 * Buyer contact details plus a name for every ticket (tickets are personal and checked against ID at some events), and
 * the organizer's required questions. Validates on submit and moves focus to the first problem.
 */
export function AttendeeForm({
  formId,
  items,
  questions,
  initialBuyer,
  initialHolders,
  onSubmit,
}: {
  formId: string;
  items: OrderItem[];
  questions: AttendeeQuestion[];
  initialBuyer: Buyer;
  initialHolders: TicketHolder[];
  onSubmit: (buyer: Buyer, holders: TicketHolder[]) => void;
}) {
  const tickets = expandTickets(items);
  const base = useId();
  const [buyer, setBuyer] = useState<Buyer>({ ...initialBuyer, phone: groupPhone(initialBuyer.phone) });
  const [holders, setHolders] = useState<TicketHolder[]>(() => tickets.map((_, i) => initialHolders[i] ?? { name: "", email: "", answers: {} }));
  const [firstIsBuyer, setFirstIsBuyer] = useState(() => !initialHolders[0]?.name || initialHolders[0]?.name === initialBuyer.name);
  const [errors, setErrors] = useState<Errors>({});

  const fid = (k: string) => `${base}-${k}`;
  const setHolder = (i: number, patch: Partial<TicketHolder>) => setHolders((hs) => hs.map((h, n) => (n === i ? { ...h, ...patch } : h)));

  function validate(): Errors {
    const e: Errors = {
      "buyer-name": validateName(buyer.name),
      "buyer-email": validateEmail(buyer.email),
      "buyer-phone": validatePhone(buyer.phone),
    };
    holders.forEach((h, i) => {
      const usesBuyer = i === 0 && firstIsBuyer;
      if (!usesBuyer) {
        e[`h${i}-name`] = validateName(h.name);
        e[`h${i}-email`] = validateEmail(h.email, { required: false });
      }
      for (const q of questions) if (q.required) e[`h${i}-q-${q.id}`] = validateRequired(h.answers[q.id] ?? "", q.label);
    });
    return e;
  }

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (hasErrors(e)) {
      const first = Object.keys(e).find((k) => e[k]);
      if (first) document.getElementById(fid(first))?.focus();
      return;
    }
    const cleanBuyer: Buyer = { name: buyer.name.trim(), email: buyer.email.trim().toLowerCase(), phone: phoneDigits(buyer.phone) };
    onSubmit(
      cleanBuyer,
      holders.map((h, i) => (i === 0 && firstIsBuyer ? { ...h, name: cleanBuyer.name, email: cleanBuyer.email } : { ...h, name: h.name.trim(), email: h.email.trim().toLowerCase() })),
    );
  }

  const text = (key: string, label: string, value: string, onChange: (v: string) => void, opts: { type?: string; autoComplete?: string; required?: boolean; hint?: ReactNode } = {}) => (
    <Field label={label} htmlFor={fid(key)} required={opts.required ?? true} error={errors[key]} hint={opts.hint}>
      <Input id={fid(key)} type={opts.type ?? "text"} autoComplete={opts.autoComplete} value={value} error={Boolean(errors[key])} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-8">
      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1 type-h3 text-text">Your contact details</legend>
        <p className="m-0 -mt-2 type-body-sm text-text-soft">We send the tickets and any event updates here.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{text("buyer-name", "Full name", buyer.name, (v) => setBuyer((b) => ({ ...b, name: v })), { autoComplete: "name" })}</div>
          {text("buyer-email", "Email", buyer.email, (v) => setBuyer((b) => ({ ...b, email: v })), { type: "email", autoComplete: "email" })}
          <Field label="Phone number" htmlFor={fid("buyer-phone")} required error={errors["buyer-phone"]} hint="We'll text a code to confirm it.">
            <PhoneInput id={fid("buyer-phone")} value={buyer.phone} error={Boolean(errors["buyer-phone"])} onValueChange={(v) => setBuyer((b) => ({ ...b, phone: v }))} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1 type-h3 text-text">Ticket holders</legend>
        <p className="m-0 -mt-2 type-body-sm text-text-soft">Each ticket carries a name. Guests&rsquo; emails are optional; we&rsquo;ll send them their own ticket if you add one.</p>
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {tickets.map((t, i) => {
            const usesBuyer = i === 0 && firstIsBuyer;
            const h = holders[i]!;
            return (
              <li key={t.key} className="rounded-md border border-border bg-surface p-4">
                <p className="m-0 mb-3 type-label text-text-faint">
                  Ticket {i + 1} · {t.label}
                </p>
                {i === 0 && (
                  <div className="mb-3">
                    <Checkbox checked={firstIsBuyer} onCheckedChange={setFirstIsBuyer} label="This ticket is for me" />
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {!usesBuyer && (
                    <>
                      {text(`h${i}-name`, "Full name", h.name, (v) => setHolder(i, { name: v }), { autoComplete: "off" })}
                      {text(`h${i}-email`, "Email", h.email, (v) => setHolder(i, { email: v }), { type: "email", autoComplete: "off", required: false })}
                    </>
                  )}
                  {questions.map((q) => {
                    const key = `h${i}-q-${q.id}`;
                    const value = h.answers[q.id] ?? "";
                    const set = (v: string) => setHolder(i, { answers: { ...h.answers, [q.id]: v } });
                    return q.type === "select" ? (
                      <Field key={q.id} label={q.label} htmlFor={fid(key)} required={q.required} error={errors[key]}>
                        <Select id={fid(key)} value={value} onValueChange={set} placeholder="Choose…" options={(q.options ?? []).map((o) => ({ value: o, label: o }))} />
                      </Field>
                    ) : (
                      <div key={q.id}>{text(key, q.label, value, set, { required: q.required })}</div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </fieldset>
    </form>
  );
}
