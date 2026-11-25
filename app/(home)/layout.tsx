import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BackToTop } from "../../components/marketplace/back-to-top";
import { ScrollProgress } from "../../components/marketplace/scroll-progress";
import { SiteFooter } from "../../components/marketplace/site-footer";
import { SiteHeader } from "../../components/marketplace/site-header";
import { MARKETPLACE } from "../../lib/marketplace/config";

/**
 * No caching (project decision): every marketplace page renders on each request, so event dates, availability and
 * "this week" are always current. Without this, Next.js would prerender these pages once at build time and keep serving
 * that copy.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: `${MARKETPLACE.name} · ${MARKETPLACE.tagline}`, template: `%s · ${MARKETPLACE.name}` },
  description: "Discover concerts, conferences, festivals and workshops across Ethiopia. Register free in a minute; your code comes by SMS.",
};

/** The public attendee site (`/`, `/events`, `/my-tickets`, `/account`, …): header, page, footer. The `(home)` folder is a route group, so it adds nothing to the address. The admin area has its own shell under `app/admin`. */
export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <ScrollProgress />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
}
