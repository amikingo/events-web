"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { registerForEvent } from "@/lib/api/public-events";
import type { PublicRegistration, PublicRegistrationInput } from "@/lib/api/public-events";
import { phoneDigits, validateEmail, validatePhone } from "@/lib/marketplace/validation";
import { formatMomentFull } from "@/lib/ethiopian-datetime";

interface RegisterFormProps {
  organizationSlug: string;
  eventSlug: string;
  /** Active ticket types, by the code the API takes. A choice is asked for only when there are several. */
  ticketTypes: { code: string; name: string }[];
  /** The privacy notice version the page was rendered with: sent back so the API knows which one the visitor saw. */
  privacyVersion: string;
}

type Errors = Partial<Record<"firstName" | "lastName" | "phone" | "email" | "ticket" | "privacy", string>>;

/** The notice the visitor reads before registering. The API only knows its version; the wording is the organizer's platform's. */
function PrivacyNotice({ version }: { version: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3 type-body-sm text-text-soft">
      <p className="m-0 font-medium text-text">How we use your details</p>
      <p className="m-0 mt-1">
        We use your name and phone number to register you for this event and to text you a confirmation code. The organizer of the event can see them, to run the event. We don&apos;t sell your details.
      </p>
      <p className="m-0 mt-1 text-text-faint">Privacy notice version {version}</p>
    </div>
  );
}

/** What the visitor sees after registering: the code is their ticket. */
function Confirmation({ registration, phone, alreadyProcessed, onAnother }: { registration: PublicRegistration; phone: string; alreadyProcessed: boolean; onAnother: () => void }) {
  return (
    <div className="flex flex-col gap-4" role="status">
      <div>
        <p className="m-0 type-label text-accent-text">{alreadyProcessed ? "Already registered" : "You're registered"}</p>
        <h3 className="m-0 mt-1 type-h2 text-text">See you there, {registration.guest.first_name}.</h3>
      </div>
      <div className="rounded-lg border border-border bg-surface-2 p-5 text-center">
        <p className="m-0 type-label text-text-faint">Your code</p>
        <p className="m-0 mt-1 font-mono text-[clamp(1.75rem,6vw,2.5rem)] font-semibold tracking-[0.18em] text-text" aria-label={`Your code is ${registration.code.split("").join(" ")}`}>
          {registration.code}
        </p>
        <p className="m-0 mt-2 type-body-sm text-text-soft">Show this code at the door.</p>
      </div>
      <dl className="m-0 flex flex-col divide-y divide-border">
        <div className="flex justify-between gap-4 py-2">
          <dt className="type-body-sm text-text-faint">Event</dt>
          <dd className="m-0 text-right type-body-sm text-text">{registration.event.name}</dd>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <dt className="type-body-sm text-text-faint">When</dt>
          <dd className="m-0 text-right type-body-sm text-text">{registration.event.starts_at ? formatMomentFull(registration.event.starts_at, registration.event.timezone) : "To be announced"}</dd>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <dt className="type-body-sm text-text-faint">Ticket</dt>
          <dd className="m-0 text-right type-body-sm text-text">{registration.ticket_type.name}</dd>
        </div>
      </dl>
      <p className="m-0 type-body-sm text-text-soft">
        We&apos;re texting a confirmation with this code to <b className="text-text">+251 {phone}</b>. Keep the code safe: it&apos;s your only ticket.
      </p>
      <Button variant="secondary" onClick={onAnother}>
        Register someone else
      </Button>
    </div>
  );
}

/**
 * The public sign-up form: no account, no payment. Name, an Ethiopian mobile (the confirmation goes there), an optional
 * email and organization, a ticket type when there are several, and the privacy notice. Each press of Register makes a
 * new `Idempotency-Key`, except an automatic retry after a network failure, which reuses the key so a place is never
 * taken twice.
 */
/**
 * A random Idempotency-Key. crypto.randomUUID exists only on HTTPS and localhost; on plain HTTP (a phone testing
 * against a laptop on the network) the key is built from crypto.getRandomValues instead.
 */
function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function RegisterForm({ organizationSlug, eventSlug, ticketTypes, privacyVersion }: RegisterFormProps) {
  const router = useRouter();
  const [values, setValues] = useState({ firstName: "", lastName: "", phone: "", email: "", affiliation: "", ticket: "", privacy: false });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<{ message: string; reload: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ registration: PublicRegistration; alreadyProcessed: boolean; phone: string } | null>(null);
  // The last submission whose outcome is unknown (network error, timeout, server error): submitting the same form
  // again reuses its key, so the API returns that registration instead of making a second one.
  const pending = useRef<{ signature: string; key: string } | null>(null);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {
      firstName: values.firstName.trim() ? undefined : "Enter your first name.",
      lastName: values.lastName.trim() ? undefined : "Enter your last name.",
      phone: validatePhone(values.phone),
      email: values.email.trim() ? validateEmail(values.email.trim()) : undefined,
      ticket: ticketTypes.length > 1 && !values.ticket ? "Choose a ticket type." : undefined,
      privacy: values.privacy ? undefined : "Tick the box to confirm you've read how we use your details.",
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const input: PublicRegistrationInput = {
      first_name: values.firstName.trim(),
      last_name: values.lastName.trim(),
      phone: `+251${phoneDigits(values.phone)}`,
      email: values.email.trim() || null,
      affiliation_name: values.affiliation.trim() || null,
      ticket_type_code: ticketTypes.length > 1 ? values.ticket : undefined,
      privacy_notice_version: privacyVersion,
    };
    const signature = JSON.stringify(input);
    const key = pending.current?.signature === signature ? pending.current.key : newIdempotencyKey();
    setFailure(null);
    setBusy(true);
    try {
      const { registration, alreadyProcessed } = await registerForEvent(organizationSlug, eventSlug, input, key);
      pending.current = null;
      setDone({ registration, alreadyProcessed, phone: values.phone.trim() });
    } catch (error) {
      // A clear refusal (4xx) is final: the next press is a new submission with a new key. Anything else may have
      // registered the guest already, so the same form keeps the same key.
      const refused = error instanceof ApiError && error.status >= 400 && error.status < 500;
      pending.current = refused ? null : { signature, key };
      const message = error instanceof ApiError && error.status === 404 ? "This event isn't open for registration any more." : describeApiError(error);
      setFailure({ message, reload: error instanceof ApiError && error.code === "privacy_notice_outdated" });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Confirmation
        registration={done.registration}
        phone={done.phone}
        alreadyProcessed={done.alreadyProcessed}
        onAnother={() => {
          setDone(null);
          setValues({ firstName: "", lastName: "", phone: "", email: "", affiliation: "", ticket: "", privacy: false });
        }}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-label="Register for this event">
      {failure && (
        <ErrorBanner>
          {failure.message}
          {failure.reload && (
            <>
              {" "}
              <button type="button" className="font-semibold underline" onClick={() => router.refresh()}>
                Reload the page
              </button>
            </>
          )}
        </ErrorBanner>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="reg-first" required error={errors.firstName}>
          <Input id="reg-first" autoComplete="given-name" value={values.firstName} error={!!errors.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Last name" htmlFor="reg-last" required error={errors.lastName}>
          <Input id="reg-last" autoComplete="family-name" value={values.lastName} error={!!errors.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
      </div>
      <Field label="Mobile number" htmlFor="reg-phone" required error={errors.phone} hint="We text your confirmation code here. Ethiopian mobiles only.">
        <PhoneInput id="reg-phone" autoComplete="tel-national" value={values.phone} error={!!errors.phone} onValueChange={(v) => set("phone", v)} />
      </Field>
      <Field label="Email" htmlFor="reg-email" error={errors.email} hint="Optional.">
        <Input id="reg-email" type="email" autoComplete="email" value={values.email} error={!!errors.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label="Organization" htmlFor="reg-org" hint="Optional. Where you work or study.">
        <Input id="reg-org" autoComplete="organization" value={values.affiliation} onChange={(e) => set("affiliation", e.target.value)} />
      </Field>
      {ticketTypes.length > 1 && (
        <Field label="Ticket" htmlFor="reg-ticket" required error={errors.ticket}>
          <Select id="reg-ticket" placeholder="Choose a ticket" options={ticketTypes.map((t) => ({ value: t.code, label: t.name }))} value={values.ticket} onValueChange={(v) => set("ticket", v)} />
        </Field>
      )}
      <PrivacyNotice version={privacyVersion} />
      <Field label="" error={errors.privacy}>
        <Checkbox checked={values.privacy} onCheckedChange={(c) => set("privacy", c)} label="I've read how my details are used" />
      </Field>
      <Button type="submit" loading={busy} loadingLabel="Registering" className="w-full">
        Register
      </Button>
    </form>
  );
}
