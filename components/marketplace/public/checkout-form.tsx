"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSession } from "@/app/auth/session";
import { HolderCard } from "@/components/checkout/holder-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { NumberStepper } from "@/components/ui/number-stepper";
import { PhoneInput } from "@/components/ui/phone-input";
import { ApiError } from "@/lib/api-client";
import { checkout, startPublicPayment } from "@/lib/api/orders";
import type { PublicOrder, PublicOrderInput } from "@/lib/api/orders";
import { MAX_TICKETS_PER_ORDER, emptyHolder, nationalMobile, newIdempotencyKey, orderRefusalMessage, placeOrderIssues, toHolderInput, validateHolder } from "@/lib/checkout";
import type { HolderDraft, HolderErrors, HolderKey } from "@/lib/checkout";
import { phoneDigits, validatePhone } from "@/lib/marketplace/validation";
import { saveOrderToken } from "@/lib/order-tokens";
import { formatPrice, fromCents, toCents } from "@/lib/price";
import type { EventRegistration } from "@/types/marketplace";

interface CheckoutFormProps {
  organizationSlug: string;
  eventSlug: string;
  registration: EventRegistration;
}

/** The notice the visitor reads before getting tickets, kept short. The API only knows its version. */
function PrivacyNotice({ version }: { version: string }) {
  return (
    <p className="m-0 type-body-sm text-text-faint">
      We use these details to issue the tickets and text you the codes. The organizer sees them to run the event; we don&apos;t sell them. Privacy notice {version}.
    </p>
  );
}

const holderName = (h: { first_name: string; last_name: string | null } | null) => (h ? [h.first_name, h.last_name].filter(Boolean).join(" ") : "Unnamed ticket");

/** After checkout: the reference and every code. The SMS can be late; the codes on screen are what matter. */
function Confirmation({ order, mobileLabel, signedIn, onMore }: { order: PublicOrder; mobileLabel: string; signedIn: boolean; onMore: () => void }) {
  const count = order.tickets.length;
  return (
    <div className="flex flex-col gap-4" role="status">
      <div>
        <p className="m-0 type-label text-accent-text">{count === 1 ? "Your ticket" : `Your ${count} tickets`}</p>
        <h3 className="m-0 mt-1 type-h2 text-text">See you there.</h3>
        <p className="m-0 mt-1 type-body-sm text-text-soft">
          Order <b className="font-mono text-text">{order.reference}</b>
        </p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {order.tickets.map((t, i) => (
          <li key={`${t.code ?? "pending"}-${i}`} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-4 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="type-body m-0 truncate font-semibold text-text">{holderName(t.holder)}</span>
              <span className="type-body-sm m-0 text-text-soft">{t.ticket_type.name}</span>
            </div>
            <span className="flex-none font-mono text-[1.25rem] font-semibold tracking-[0.14em] text-text" aria-label={t.code ? `Code ${t.code.split("").join(" ")}` : "No code yet"}>
              {t.code ?? "—"}
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 type-body-sm text-text-soft">
        We&apos;ve also sent the codes by SMS to <b className="text-text">{mobileLabel}</b>. If the SMS is late, the codes on screen are what matter: keep them safe.
      </p>
      <div className="flex flex-wrap gap-2">
        {signedIn && (
          <Button asChild>
            <Link href="/my-tickets">View in My tickets</Link>
          </Button>
        )}
        <Button variant="secondary" onClick={onMore}>
          Get more tickets
        </Button>
      </div>
    </div>
  );
}

/**
 * Public checkout (Phase 7): pick how many of each free ticket type (up to 20 in all), give the mobile the codes go to
 * (unless signed in), and, on a Detailed event, each guest's details. One Idempotency-Key per submission: made when the
 * form opens, kept for a retry after a network failure, renewed after a refusal or a success.
 */
export function CheckoutForm({ organizationSlug, eventSlug, registration }: CheckoutFormProps) {
  const router = useRouter();
  const session = useSession();
  const account = session?.kind === "attendee" ? session.account : null;
  const { ticketTypes, mode, holderFields, purchaseLimit, privacyVersion } = registration;
  const detailed = mode === "DETAILED";

  // Every public type can be picked; paid ones go on to Cheche Pay after the order is made.
  const types = ticketTypes;

  const [quantities, setQuantities] = useState<Record<string, number>>(() => (types.length === 1 ? { [types[0]!.code]: 1 } : {}));
  const [holders, setHolders] = useState<Record<string, HolderDraft>>({});
  const [mobile, setMobile] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [errors, setErrors] = useState<{ tickets?: string; mobile?: string; privacy?: string }>({});
  const [holderErrors, setHolderErrors] = useState<Record<number, HolderErrors>>({});
  const [failure, setFailure] = useState<string | string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [done, setDone] = useState<{ order: PublicOrder; mobileLabel: string } | null>(null);
  // One key per submission, made when the form opens. It's never rendered, so server and browser can't disagree.
  const [key, setKey] = useState(newIdempotencyKey);

  const total = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  // Shown only: the server works out the real total. Added up in whole cents, never in floating point.
  const totalCents = types.reduce((sum, t) => sum + toCents(t.price) * (quantities[t.code] ?? 0), 0);
  const totalLabel = formatPrice(fromCents(totalCents), types[0]?.currency ?? "ETB");
  const cap = Math.min(MAX_TICKETS_PER_ORDER, purchaseLimit ?? MAX_TICKETS_PER_ORDER);
  /** Every ticket being bought, in order, with a stable key per slot so typed details survive quantity changes. */
  const slots = useMemo(
    () => types.flatMap((t) => Array.from({ length: quantities[t.code] ?? 0 }, (_, n) => ({ slot: `${t.code}#${n}`, code: t.code, name: t.name }))),
    [types, quantities],
  );

  if (types.length === 0) {
    return (
      <p className="m-0 type-body text-text-soft" role="status">
        No tickets are on sale right now.
      </p>
    );
  }

  function setQuantity(code: string, value: number) {
    setQuantities((q) => ({ ...q, [code]: value }));
    setErrors((e) => ({ ...e, tickets: undefined }));
  }

  function setHolder(slot: string, index: number, field: HolderKey, value: string) {
    setHolders((h) => ({ ...h, [slot]: { ...(h[slot] ?? emptyHolder()), [field]: value } }));
    if (holderErrors[index]?.[field]) setHolderErrors((e) => ({ ...e, [index]: { ...e[index], [field]: undefined } }));
  }

  /** Off to Cheche Pay. No link yet: "Preparing your payment…" and ask for one, at most 3 times. */
  async function goToPayment(order: PublicOrder) {
    let url = order.payment?.checkout_url ?? null;
    for (let attempt = 0; !url && attempt < 3 && order.order_token; attempt++) {
      setPreparing(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        url = (await startPublicPayment(order.reference, order.order_token)).payment?.checkout_url ?? null;
      } catch {
        // Try again; after 3 tries the order page takes over.
      }
    }
    if (url) {
      window.location.assign(url);
      return;
    }
    setPreparing(false);
    router.push(`/orders/${encodeURIComponent(order.reference)}`);
  }

  /**
   * On a Detailed event, ticket 1 is the buyer: a visitor who isn't signed in types one mobile, in ticket 1's card, and
   * it's both where the codes go and ticket 1's mobile. (Not when the event doesn't collect guests' mobiles or names.)
   */
  const mobileInTicket1 = detailed && !account && slots.length > 0 && holderFields.name !== "HIDDEN" && holderFields.mobile !== "HIDDEN";
  /** Otherwise ticket 1 falls back to the buyer's mobile typed above (or the account's) when its own is left empty. */
  const buyerMobileLabel = account ? nationalMobile(account.mobile) : phoneDigits(mobile).length === 9 ? nationalMobile(`+251${phoneDigits(mobile)}`) : "";
  const withFallback = (index: number, draft: HolderDraft): HolderDraft =>
    index === 0 && !draft.phone.trim() && buyerMobileLabel ? { ...draft, phone: buyerMobileLabel } : draft;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const nextHolderErrors: Record<number, HolderErrors> = {};
    if (detailed) {
      slots.forEach((s, i) => {
        const found = validateHolder(withFallback(i, holders[s.slot] ?? emptyHolder()), holderFields);
        if (Object.keys(found).length > 0) nextHolderErrors[i] = found;
      });
    }
    const next = {
      tickets: total === 0 ? "Choose at least one ticket." : undefined,
      mobile: account ? undefined : validatePhone(mobile),
      privacy: privacy ? undefined : "Tick the box to confirm you've read how we use your details.",
    };
    setErrors(next);
    setHolderErrors(nextHolderErrors);
    if (next.tickets || next.mobile || next.privacy || Object.keys(nextHolderErrors).length > 0) return;

    const chosen = types.filter((t) => (quantities[t.code] ?? 0) > 0);
    const offsets = chosen.map((_, i) => chosen.slice(0, i).reduce((sum, t) => sum + (quantities[t.code] ?? 0), 0));
    const input: PublicOrderInput = {
      ...(account ? {} : { buyer_mobile: `+251${phoneDigits(mobile)}` }),
      privacy_notice_version: privacyVersion,
      items: chosen.map((t) => ({
        ticket_type_code: t.code,
        quantity: quantities[t.code]!,
        // A Quick event takes no holders: its tickets are unnamed.
        ...(detailed
          ? { holders: slots.filter((s) => s.code === t.code).map((s) => toHolderInput(withFallback(slots.indexOf(s), holders[s.slot] ?? emptyHolder()), holderFields)) }
          : {}),
      })),
    };

    setFailure(null);
    setBusy(true);
    try {
      const { order } = await checkout(organizationSlug, eventSlug, input, key);
      setKey(newIdempotencyKey());
      // Keep the token on this browser, so /orders/{reference} opens now and when Cheche Pay sends the buyer back.
      if (order.order_token) saveOrderToken(order.reference, order.order_token);
      if (order.status === "PENDING_PAYMENT") {
        await goToPayment(order);
        return;
      }
      // Free: straight to the success page. Without a token (shouldn't happen), the codes show here instead.
      if (order.order_token) {
        router.push(`/orders/${encodeURIComponent(order.reference)}`);
        return;
      }
      setDone({ order, mobileLabel: account ? nationalMobile(account.mobile) || "your account's mobile" : nationalMobile(`+251${phoneDigits(mobile)}`) });
    } catch (error) {
      // A clear refusal (4xx) is final, so the next press is a new submission. Anything else may have issued the
      // tickets already, so the same key goes with the next press and the API returns the same order.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) setKey(newIdempotencyKey());
      const placed = placeOrderIssues(error, offsets);
      if (placed) {
        setHolderErrors(placed.holders);
        if (placed.buyer) setErrors((er) => ({ ...er, mobile: placed.buyer }));
        setFailure(placed.summary);
      } else if (error instanceof ApiError && error.code === "privacy_notice_outdated") {
        setFailure("The privacy notice changed. Reload the page to read the new one.");
      } else if (error instanceof ApiError && error.status === 404) {
        setFailure("This ticket type isn't available any more. Reload the page.");
      } else {
        setFailure(orderRefusalMessage(error, "public"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Confirmation
        order={done.order}
        mobileLabel={done.mobileLabel}
        signedIn={Boolean(account)}
        onMore={() => {
          setDone(null);
          setQuantities(types.length === 1 ? { [types[0]!.code]: 1 } : {});
          setHolders({});
          setPrivacy(false);
        }}
      />
    );
  }

  const signInHref = `/auth?next=${encodeURIComponent(`/events/${organizationSlug}/${eventSlug}`)}`;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-label="Get tickets">
      {failure && (
        <ErrorBanner>
          {Array.isArray(failure) ? (
            <ul className="m-0 list-none p-0">
              {failure.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            failure
          )}
          {failure === "The privacy notice changed. Reload the page to read the new one." && (
            <>
              {" "}
              <button type="button" className="font-semibold underline" onClick={() => router.refresh()}>
                Reload the page
              </button>
            </>
          )}
        </ErrorBanner>
      )}

      <Field label="" error={errors.tickets} hint={purchaseLimit ? `Up to ${cap} per mobile number for this event.` : `Up to ${MAX_TICKETS_PER_ORDER} in one order.`}>
        <ul aria-label="Tickets" className="m-0 flex list-none flex-col divide-y divide-border rounded-md border border-border p-0">
          {types.map((t) => {
            const q = quantities[t.code] ?? 0;
            return (
              <li key={t.code} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 flex-col">
                  <span className="type-body m-0 font-medium text-text">{t.name}</span>
                  <span className="type-body-sm m-0 text-text-soft">{formatPrice(t.price, t.currency)}</span>
                </div>
                <NumberStepper aria-label={`How many ${t.name} tickets`} value={q} min={0} max={q + Math.max(0, cap - total)} onValueChange={(v) => setQuantity(t.code, v)} />
              </li>
            );
          })}
        </ul>
      </Field>
      {totalCents > 0 && (
        <div className="flex items-baseline justify-between gap-3 rounded-md bg-surface-2 px-3 py-2.5">
          <span className="type-body text-text-soft">{total === 1 ? "1 ticket" : `${total} tickets`}</span>
          <span className="type-body font-semibold text-text">Total {totalLabel}</span>
        </div>
      )}
      {totalCents > 0 && <p className="m-0 type-body-sm text-text-soft">You pay on Cheche Pay&apos;s secure page next. Your places are held while you pay.</p>}

      {account ? (
        <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5 type-body-sm text-text-soft">
          {account.mobile ? (
            <>
              The codes will be sent to <b className="font-medium text-text">{nationalMobile(account.mobile)}</b>.
            </>
          ) : (
            "The codes will be sent to your account's verified mobile number."
          )}
        </div>
      ) : mobileInTicket1 ? null : (
        <Field label="Mobile number" htmlFor="co-mobile" required error={errors.mobile} hint="We text the ticket codes here. Ethiopian mobiles only.">
          <PhoneInput id="co-mobile" autoComplete="tel-national" value={mobile} error={!!errors.mobile} onValueChange={(v) => {
            setMobile(v);
            setErrors((er) => ({ ...er, mobile: undefined }));
          }} />
        </Field>
      )}

      {detailed && slots.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="m-0 type-body-sm text-text-soft">Who is each ticket for?</p>
          {slots.map((s, i) => (
            <HolderCard
              key={s.slot}
              index={i}
              ticketTypeName={s.name}
              fields={holderFields}
              value={holders[s.slot] ?? emptyHolder()}
              errors={holderErrors[i]}
              onChange={(field, value) => setHolder(s.slot, i, field, value)}
              phoneFallback={i === 0 && !mobileInTicket1 ? buyerMobileLabel || undefined : undefined}
              buyerPhone={
                i === 0 && mobileInTicket1 ? (
                  <Field label="Your mobile" htmlFor="co-mobile" required error={errors.mobile ?? holderErrors[0]?.phone} hint="We text the ticket codes here. Ethiopian mobiles only.">
                    <PhoneInput
                      id="co-mobile"
                      autoComplete="tel-national"
                      value={mobile}
                      error={!!(errors.mobile ?? holderErrors[0]?.phone)}
                      onValueChange={(v) => {
                        setMobile(v);
                        setErrors((er) => ({ ...er, mobile: undefined }));
                      }}
                    />
                  </Field>
                ) : undefined
              }
              stacked
              collapseOptional
            />
          ))}
        </div>
      )}

      <Field label="" error={errors.privacy}>
        <div className="flex flex-col gap-1.5">
          <Checkbox checked={privacy} onCheckedChange={(c) => {
            setPrivacy(c);
            setErrors((er) => ({ ...er, privacy: undefined }));
          }} label="I've read how my details are used" />
          <PrivacyNotice version={privacyVersion} />
        </div>
      </Field>
      <Button type="submit" loading={busy || preparing} loadingLabel={preparing ? "Preparing your payment…" : totalCents > 0 ? "Creating your order" : "Getting your tickets"} className="w-full">
        {totalCents > 0 ? `Continue to payment · ${totalLabel}` : total > 1 ? `Get ${total} tickets` : "Get ticket"}
      </Button>
      {!account && (
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
