"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { MARKETPLACE } from "../../lib/marketplace/config";
import { exploreHref } from "../../lib/marketplace/query";
import { cn } from "../../lib/utils";
import { Logo } from "../ui/logo";
import { AccountMenu } from "./account-menu";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import type { NavLink } from "./mobile-nav";

const LINKS: NavLink[] = [
  { href: "/events", label: "Explore" },
  { href: exploreHref({ date: "weekend" }), label: "This weekend" },
  { href: exploreHref({ price: "free" }), label: "Free events" },
];

/** Space the floating header takes (12px top inset + 64px pill) — the landing hero pulls itself up by this much. */
export const HEADER_HEIGHT = 76;

function subscribeScroll(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}
const scrolledSnapshot = () => window.scrollY > 12;
const notScrolled = () => false;

/**
 * The marketplace header. On the landing page it starts transparent over the dark hero (white links, no search — the
 * hero has the big one) and turns into the solid, blurred bar once the page scrolls. Everywhere else it is solid.
 */
export function SiteHeader() {
  const pathname = usePathname();
  return <HeaderBar landing={pathname === "/"} />;
}

function HeaderBar({ landing }: { landing: boolean }) {
  const scrolled = useSyncExternalStore(subscribeScroll, scrolledSnapshot, notScrolled);
  const overlay = landing && !scrolled;

  const linkCls = cn(
    "rounded-full px-3.5 py-2 type-body font-medium transition-colors",
    "text-text-soft hover:bg-surface-2 hover:text-text",
  );

  return (
    // A floating pill: the header itself is a transparent strip (12px inset), the bar is the rounded glass panel inside.
    // At the top of the landing page the panel has no fill or border at all — the items float on the hero — and the
    // frosted pill fades in as soon as the page scrolls. Same size in both states, so nothing moves.
    <header data-overlay={overlay || undefined} className="pointer-events-none sticky top-0 z-30 px-3 pt-3 sm:px-4">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-btn focus:bg-surface focus:px-3 focus:py-2 focus:text-text focus:shadow-raised">
        Skip to content
      </a>
      <div
        className={cn(
          // Same 1400px width as the page container, so on desktop the logo sits on the content's left edge.
          "pointer-events-auto mx-auto flex h-16 w-full max-w-[1400px] items-center gap-3 rounded-full border pl-4 pr-2 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-(--motion-slow) sm:pl-6",
          // Frosted glass: a see-through surface with a strong blur and a little saturation, so whatever scrolls behind
          // shows as a soft wash of colour while the header text stays crisp. Phones get a more opaque fill so the bar stays
          // readable even where the blur is weak.
          overlay ? "border-transparent bg-transparent" : "border-border/70 bg-surface/85 shadow-raised backdrop-blur-2xl backdrop-saturate-150 sm:bg-surface/60",
        )}
      >
        <Link href="/" className="flex flex-none items-center gap-2 rounded-sm" aria-label={`${MARKETPLACE.name} home`}>
          <Logo variant="wordmark" width={100} alt="" />
          <span className={cn("type-label transition-colors max-[380px]:hidden", "text-text-faint")}>Events</span>
        </Link>
        <nav aria-label="Main" className="hidden flex-1 justify-center lg:flex">
          <ul className="m-0 flex list-none items-center gap-1 p-0">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkCls}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:ml-0">
          <ThemeToggle className={cn(linkCls, "px-0")} />
          <Link href="/my-tickets" className={cn(linkCls, "hidden sm:inline-flex")}>
            My tickets
          </Link>
          <AccountMenu />
          <div className="lg:hidden">
            <MobileNav links={LINKS} />
          </div>
        </div>
      </div>
    </header>
  );
}
