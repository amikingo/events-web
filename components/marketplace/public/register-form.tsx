"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useSession } from "@/app/auth/session";
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
import { groupPhone, phoneDigits, validateEmail, validatePhone } from "@/lib/marketplace/validation";
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

/** Formats `+251911223344` or `911223344` as Ethiopian national style `0911 223 344`. */
function formatNationalMobile(mobile: string | null | undefined): string {
  if (!mobile) return "";
  const grouped = groupPhone(mobile);
  return grouped ? `0${grouped}` : mobile;
}

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
function Confirmation({
  registration,
  phoneLabel,
  alreadyProcessed,
  isGuest,
  onAnother,
}: {
  registration: PublicRegistration;
  phoneLabel: string;
  alreadyProcessed: boolean;
  isGuest: boolean;
  onAnother: () => void;
}) {
  return (
    <div className="flex flex-col gap-4" role="status">
      <div>
        <p className="m-0 type-label text-accent-text">
          {alreadyProcessed ? "You're already registered for this event" : "You're registered"}
        </p>
        <h3 className="m-0 mt-1 type-h2 text-text">See you there, {registration.guest.first_name}.</h3>
      </div>
      <div className="rounded-lg border border-border bg-surface-2 p-5 text-center">
        <p className="m-0 type-label text-text-faint">Your code</p>
        <p
          className="m-0 mt-1 font-mono text-[clamp(1.75rem,6vw,2.5rem)] font-semibold tracking-[0.18em] text-text"
          aria-label={`Your code is ${registration.code.split("").join(" ")}`}
        >
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
          <dd className="m-0 text-right type-body-sm text-text">
            {registration.event.starts_at ? formatMomentFull(registration.event.starts_at, registration.event.timezone) : "To be announced"}
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <dt className="type-body-sm text-text-faint">Ticket</dt>
          <dd className="m-0 text-right type-body-sm text-text">{registration.ticket_type.name}</dd>
        </div>
      </dl>
      <p className="m-0 type-body-sm text-text-soft">
        We&apos;re texting a confirmation with this code to <b className="text-text">{phoneLabel}</b>. Keep the code safe: it&apos;s your only ticket.
      </p>
      {isGuest ? (
        <Button asChild variant="secondary">
          <Link href="/my-tickets">View in My tickets</Link>
        </Button>
      ) : (
        <Button variant="secondary" onClick={onAnother}>
          Register someone else
        </Button>
      )}
    </div>
  );
}

/**
 * A random Idempotency-Key. crypto.randomUUID exists only on HTTPS and localhost; on plain HTTP (a phone testing
 * against a laptop on the network) the key is built from crypto.getRandomValues instead.
 */
function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * The public sign-up form: anonymous visitors enter their Ethiopian mobile; signed-in guests keep their verified
 * account mobile (sent via guest Bearer token) and omit `phone`. Each press of Register makes a new `Idempotency-Key`,
 * except an automatic retry after a network failure.
 */
export function RegisterForm({ organizationSlug, eventSlug, ticketTypes, privacyVersion }: RegisterFormProps) {
  const router = useRouter();
  const session = useSession();
  const isGuest = session?.kind === "attendee";
  const guestAccount = isGuest ? session.account : null;

  const [values, setValues] = useState({ firstName: "", lastName: "", phone: "", email: "", affiliation: "", ticket: "", privacy: false });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<{ message: string; reload: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ registration: PublicRegistration; alreadyProcessed: boolean; phoneLabel: string } | null>(null);
  const editedName = useRef({ firstName: false, lastName: false });
  // The last submission whose outcome is unknown (network error, timeout, server error): submitting the same form
  // again reuses its key, so the API returns that registration instead of making a second one.
  const pending = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    if (!guestAccount) return;
    setValues((v) => ({
      ...v,
      firstName: editedName.current.firstName ? v.firstName : (guestAccount.firstname ?? v.firstName),
      lastName: editedName.current.lastName ? v.lastName : (guestAccount.lastname ?? v.lastName),
    }));
  }, [guestAccount]);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    if (key === "firstName") editedName.current.firstName = true;
    if (key === "lastName") editedName.current.lastName = true;
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {
      firstName: values.firstName.trim() ? undefined : "Enter your first name.",
      lastName: values.lastName.trim() ? undefined : "Enter your last name.",
      phone: isGuest ? undefined : validatePhone(values.phone),
      email: values.email.trim() ? validateEmail(values.email.trim()) : undefined,
      ticket: ticketTypes.length > 1 && !values.ticket ? "Choose a ticket type." : undefined,
      privacy: values.privacy ? undefined : "Tick the box to confirm you've read how we use your details.",
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const input: PublicRegistrationInput = {
      first_name: values.firstName.trim(),
      last_name: values.lastName.trim(),
      ...(isGuest ? {} : { phone: `+251${phoneDigits(values.phone)}` }),
      email: values.email.trim() || null,
      affiliation_name: values.affiliation.trim() || null,
      ticket_type_code: ticketTypes.length > 1 ? values.ticket : undefined,
      privacy_notice_version: privacyVersion,
    };
    const signature = JSON.stringify({ ...input, guestId: guestAccount?.id ?? null });
    const key = pending.current?.signature === signature ? pending.current.key : newIdempotencyKey();
    setFailure(null);
    setBusy(true);
    try {
      const { registration, alreadyProcessed } = await registerForEvent(organizationSlug, eventSlug, input, key);
      pending.current = null;
      const phoneLabel = isGuest
        ? formatNationalMobile(guestAccount?.mobile) || "your account mobile"
        : `+251 ${values.phone.trim()}`;
      setDone({ registration, alreadyProcessed, phoneLabel });
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
        phoneLabel={done.phoneLabel}
        alreadyProcessed={done.alreadyProcessed}
        isGuest={isGuest}
        onAnother={() => {
          setDone(null);
          editedName.current = { firstName: false, lastName: false };
          setValues({ firstName: "", lastName: "", phone: "", email: "", affiliation: "", ticket: "", privacy: false });
        }}
      />
    );
  }

  const signInHref = `/auth?next=${encodeURIComponent(`/events/${organizationSlug}/${eventSlug}`)}`;
  const guestMobileDisplay = formatNationalMobile(guestAccount?.mobile);

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
      {isGuest ? (
        <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5 type-body-sm text-text-soft">
          {guestMobileDisplay ? (
            <>
              Your code will be sent to <b className="font-medium text-text">{guestMobileDisplay}</b>.
            </>
          ) : (
            "Your confirmation code will be sent to your account's verified mobile number."
          )}
        </div>
      ) : (
        <Field label="Mobile number" htmlFor="reg-phone" required error={errors.phone} hint="We text your confirmation code here. Ethiopian mobiles only.">
          <PhoneInput id="reg-phone" autoComplete="tel-national" value={values.phone} error={!!errors.phone} onValueChange={(v) => set("phone", v)} />
        </Field>
      )}
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
      {!isGuest && (
        <p className="m-0 pt-1 text-center type-body-sm text-text-faint">
          Have a Cheche account?{" "}
          <Link href={signInHref} className="font-medium text-text-soft underline-offset-4 hover:text-text hover:underline">
            Sign in
          </Link>{" "}
          to keep your tickets in one place.
        </p>
      )}
    </form>
  );
}
