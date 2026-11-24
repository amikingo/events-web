"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MARKETPLACE } from "@/lib/marketplace/config";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/app/auth/session";
import { ShaderBackdrop } from "@/app/auth/shader-backdrop";
import { landing } from "@/app/auth/shared";
import { stepFromParam, stepUrl } from "@/app/auth/steps";
import type { Step } from "@/app/auth/steps";
import { CodeStep } from "@/app/auth/steps/code-step";
import { ForgotStep } from "@/app/auth/steps/forgot-step";
import { ResetStep } from "@/app/auth/steps/reset-step";
import { SignInStep } from "@/app/auth/steps/sign-in-step";
import { SignUpStep } from "@/app/auth/steps/sign-up-step";
import { TwoStepStep } from "@/app/auth/steps/two-step-step";

/**
 * The one page for everything about signing in: sign in, password, code, create account, forgot and reset password,
 * two-step. The current screen is `?step=` in the address, so /auth is the only auth page, the back button steps
 * back through the screens, and any screen can be linked to.
 */
export function AuthFlow({ hero, ticker }: { hero: ReactNode; ticker: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const step = stepFromParam(params.get("step"));
  const next = params.get("next") ?? undefined;
  const arrived = useRef(false);

  // Someone who arrives already signed in goes straight on. Sign-ins made on this page navigate themselves.
  useEffect(() => {
    if (session === undefined || arrived.current) return;
    arrived.current = true;
    if (session) router.replace(landing(session.kind, next));
  }, [router, session, next]);

  const go = useCallback(
    (to: Step) => {
      // Native pushState: Next.js picks it up, so `useSearchParams` re-renders with no round trip to the server.
      window.history.pushState(null, "", stepUrl(to, next));
      window.scrollTo({ top: 0 });
    },
    [next],
  );

  const props = { next, go };

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-paper-ink text-white">
      <ShaderBackdrop />

      <header className="flex items-center justify-between px-5 py-5 sm:px-10 lg:px-14 lg:py-7">
        <div className="flex items-center gap-2.5">
          <Logo variant="icon-solid" width={28} />
          <span className="type-h3 text-white">{MARKETPLACE.name}</span>
        </div>
        <a href={`mailto:${MARKETPLACE.supportEmail}`} className="type-body-sm font-medium text-white/70 hover:text-white hover:underline">
          Need help?
        </a>
      </header>

      <div className="mx-auto grid w-full max-w-[1280px] flex-1 content-center items-start gap-12 px-5 py-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-20 lg:px-14">
        {hero}
        <div className="relative mx-auto w-full max-w-[440px] lg:mx-0">
          {/* A soft halo of brand colour behind the form lifts it off the background. */}
          <div aria-hidden="true" className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] bg-accent opacity-25 blur-3xl" />
          {/* A modern glass card: a travelling edge of light, a frosted brand-tinted body, a soft sheen and a deep tinted shadow. */}
          <div className="auth-edge rounded-[28px] p-px shadow-[0_32px_80px_-24px_color-mix(in_srgb,var(--color-accent-deep)_70%,transparent)]">
            <Card className="isolate overflow-hidden rounded-[27px] border-0 bg-[color-mix(in_srgb,color-mix(in_srgb,var(--color-accent)_6%,var(--color-surface))_90%,transparent)] p-7 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-accent-light)_35%,transparent)] backdrop-blur-2xl sm:p-9">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-surface/70 via-transparent to-transparent" />
              {session ? (
                // Signed in: the form is never shown, even while the redirect is on its way.
                <Skeleton className="h-[260px] w-full rounded-md" />
              ) : (
                // Keyed by step so each screen animates in again as the address changes.
                <div key={step}>
                  {step === "sign-in" && <SignInStep {...props} />}
                  {step === "code" && <CodeStep {...props} />}
                  {step === "sign-up" && <SignUpStep {...props} />}
                  {step === "forgot" && <ForgotStep {...props} />}
                  {step === "reset" && <ResetStep {...props} />}
                  {step === "two-step" && <TwoStepStep {...props} />}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <footer className="px-0 pb-6 pt-2 lg:pb-8">{ticker}</footer>
    </main>
  );
}
