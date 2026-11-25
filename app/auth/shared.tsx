"use client";

import type { ReactNode } from "react";
import { DEMO } from "@/lib/marketplace/config";
import { groupPhone } from "@/lib/marketplace/validation";
import { ArrowLeftIcon, InfoIcon } from "@/components/ui/icons";
import { Note } from "@/components/ui/note";
import { TextLink } from "@/components/ui/text-link";
import type { Step } from "@/app/auth/steps";

export interface StepProps {
  /** Where to go after signing in, from `?next=`. */
  next?: string;
  go: (step: Step) => void;
}

/** Only same-site paths are allowed as a return target. */
export function safeNext(next: string | undefined, fallback = "/my-tickets"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

/** Where a signed-in person goes: staff only follow a `next` under /admin, attendees never land there. */
export function landing(kind: "staff" | "attendee", next: string | undefined): string {
  const home = kind === "staff" ? "/admin" : "/my-tickets";
  const target = safeNext(next, home);
  return target.startsWith("/admin") === (kind === "staff") ? target : home;
}

/** One screen's heading, form and footer; it sits inside the card on the sign-in page. */
export function AuthCard({ title, description, children, footer, onBack, backLabel = "Back" }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode; onBack?: () => void; backLabel?: string }) {
  return (
    <section className="flex flex-col gap-6">
      {onBack && (
        <div className="-mb-2 animate-blur-in">
          <TextLink soft onClick={onBack}>
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeftIcon className="size-3.5" /> {backLabel}
            </span>
          </TextLink>
        </div>
      )}
      <div className="animate-blur-in">
        <h1 className="m-0 type-h1 text-text">{title}</h1>
        {description && <p className="m-0 mt-2 type-body text-text-soft">{description}</p>}
      </div>
      <div className="flex animate-blur-in flex-col gap-5" style={{ animationDelay: "90ms" }}>
        {children}
      </div>
      {footer && (
        <div className="animate-blur-in type-body-sm text-text-soft" style={{ animationDelay: "180ms" }}>
          {footer}
        </div>
      )}
    </section>
  );
}

/** A text link that changes the step instead of the page. */
export function StepLink({ onClick, children, soft = false }: { onClick: () => void; children: ReactNode; soft?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={soft ? "font-medium text-text-soft hover:underline" : "font-semibold text-accent-text hover:underline"}>
      {children}
    </button>
  );
}

export function DemoHint() {
  return (
    <Note icon={<InfoIcon />}>
      Demo sign-in. Use <b className="text-text">+251 {groupPhone(DEMO.phone)}</b> to see a booking history, or any number for a new account. The code is always <b className="tabular-nums text-text">{DEMO.code}</b>.
    </Note>
  );
}
