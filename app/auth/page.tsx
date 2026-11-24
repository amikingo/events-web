import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFlow } from "@/app/auth/auth-flow";
import { AuthHero, EventTicker } from "@/app/auth/auth-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { eventsService } from "@/lib/services/events-service";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

// Rendered on every request, like the rest of the app (no caching), so the right screen is in the first HTML.
export const dynamic = "force-dynamic";

/** The only auth page: sign in, create account, password recovery and codes all happen here, one screen at a time. */
export default async function AuthPage() {
  const { wall, liveCount } = await eventsService.getHome();
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-24 h-[360px] max-w-[440px] rounded-md" />}>
      <AuthFlow hero={<AuthHero liveCount={liveCount} />} ticker={<EventTicker events={wall} />} />
    </Suspense>
  );
}
