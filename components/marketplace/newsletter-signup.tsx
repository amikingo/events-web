"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { validateEmail } from "../../lib/marketplace/validation";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { CheckThinIcon } from "../ui/icons";
import { Input } from "../ui/input";
import { toast } from "../ui/toaster";

/** The frosted-glass surface shared by the form and its success state (same recipe as the hero search). */
const glass = "border bg-gradient-to-b from-white/[0.14] to-white/[0.04] shadow-raised backdrop-blur-xl";

/*
 * Landing-page restyle of the library input (dark band only): from `md` up it drops its white box and border and
 * blends into the glass capsule, 48px tall, white text. Below `md` it keeps the library look.
 */
const capsuleInput = "md:h-12 md:border-transparent md:bg-transparent md:text-white md:placeholder:text-white/55 md:focus:border-transparent md:focus:shadow-none";

/**
 * Weekly picks signup, built for the dark newsletter band: a frosted-glass capsule (email blended into the glass, rounded
 * pink button) on tablet and desktop, a stacked glass panel with the library's white field on phones.
 *
 * Simulated: the address is kept in this browser only until a mailing-list service is connected.
 */
export function NewsletterSignup({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    try {
      localStorage.setItem("cheche-events.newsletter", email.trim().toLowerCase());
    } catch {
      /* storage unavailable: still confirm for this session */
    }
    setLoading(false);
    setDone(true);
    toast.success("You're on the list", { body: `Weekly picks will go to ${email.trim()}.` });
  }

  if (done) {
    return (
      <div role="status" className={cn(glass, "flex items-center gap-3 rounded-lg border-white/15 p-4 md:rounded-full md:py-2.5 md:pl-2.5 md:pr-6", className)}>
        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-success-fill text-white">
          <CheckThinIcon className="size-4" />
        </span>
        <p className="m-0 type-body text-white">You&rsquo;re on the list. Your first weekly picks arrive on Friday morning.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={cn("w-full", className)}>
      {/* The error sits under the capsule; white text stays readable on the dark band (the danger-red border marks it). */}
      <Field label={<span className="sr-only">Email address</span>} htmlFor={id} error={error} className="[&_[role=alert]]:text-white/90">
        <div
          className={cn(
            glass,
            "grid gap-3 rounded-lg p-3 transition-colors md:flex md:items-center md:gap-1 md:rounded-full md:p-1.5 md:pl-3",
            error ? "border-danger" : "border-white/15 focus-within:border-white/30",
          )}
        >
          <div className="min-w-0 md:flex-1 md:rounded-full md:transition-colors md:hover:bg-white/5 md:focus-within:bg-white/10">
            <Input id={id} type="email" autoComplete="email" placeholder="you@example.com" value={email} error={Boolean(error)} onChange={(e) => setEmail(e.target.value)} className={capsuleInput} />
          </div>
          <Button type="submit" loading={loading} loadingLabel="Subscribing" className="md:h-12 md:flex-none md:rounded-full md:px-6">
            Get weekly picks
          </Button>
        </div>
      </Field>
    </form>
  );
}
