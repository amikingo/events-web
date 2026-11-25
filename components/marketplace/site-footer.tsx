import Link from "next/link";
import { useId } from "react";
import { MARKETPLACE } from "../../lib/marketplace/config";
import { exploreHref } from "../../lib/marketplace/query";
import { Logo } from "../ui/logo";
import { ThemeSwitch } from "../ui/theme-switch";
import { Container } from "./section";

const linkCls = "rounded-sm type-body-sm text-text-soft hover:text-text hover:underline";

/**
 * The brand name set huge across the full width of the footer and cropped at the bottom by the copyright row, so it
 * looks like it sits behind that row. Its fill is see-through (a faint accent that thins towards the bottom), so the page shows through the letters. It is an SVG so
 * the text always spans the container exactly (`textLength` stretches it, and the size is chosen to be almost exactly
 * that wide, so the letters are not visibly distorted), at any screen size. Decorative: the name is also in the line below.
 */
function BigName() {
  const id = useId();
  const gradient = `${id}-fill`;
  const clip = `${id}-clip`;
  const band = `${id}-band`;
  const textStyle = { fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 141, letterSpacing: "-0.04em" } as const;
  return (
    <svg viewBox="0 0 1000 72" aria-hidden="true" focusable="false" className="block h-auto w-full select-none">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--color-accent)", stopOpacity: 0.22 }} />
          <stop offset="100%" style={{ stopColor: "var(--color-accent)", stopOpacity: 0.08 }} />
        </linearGradient>
        {/* The name itself, as a clip for the shine. */}
        <clipPath id={clip}>
          <text x="0" y="106" textLength="1000" lengthAdjust="spacingAndGlyphs" style={textStyle}>
            {MARKETPLACE.name}
          </text>
        </clipPath>
        <linearGradient id={band} x1="0" y1="0" x2="1" y2="0">
          <stop data-shine-stop="" offset="0%" style={{ stopOpacity: 0 }} />
          <stop data-shine-stop="" offset="50%" style={{ stopOpacity: 0.95 }} />
          <stop data-shine-stop="" offset="100%" style={{ stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <text x="0" y="106" textLength="1000" lengthAdjust="spacingAndGlyphs" fill={`url(#${gradient})`} style={textStyle}>
        {MARKETPLACE.name}
      </text>
      {/* A soft slanted band of light that sweeps across the letters, then rests: white in dark mode, accent pink in light mode. Animated inside the SVG itself (no stylesheet needed), and hidden for visitors who prefer reduced motion. */}
      <style>{`
        @media (prefers-reduced-motion: reduce) { [data-footer-shine] { display: none; } }
        /* Light mode: the sweep is the accent pink (white would vanish on a light page). Dark mode: white light. */
        [data-shine-stop] { stop-color: var(--color-accent); }
        @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) [data-shine-stop] { stop-color: var(--color-white); } }
        :root[data-theme="dark"] [data-shine-stop] { stop-color: var(--color-white); }
      `}</style>
      <g clipPath={`url(#${clip})`} data-footer-shine="">
        <g transform="skewX(-20)">
          <rect x="0" y="0" width="340" height="118" fill={`url(#${band})`}>
            <animateTransform attributeName="transform" type="translate" values="-420 0; 1120 0; 1120 0" keyTimes="0; 0.4; 1" calcMode="spline" keySplines="0.45 0 0.2 1; 0 0 1 1" dur="5s" begin="0.8s" repeatCount="indefinite" />
          </rect>
        </g>
      </g>
    </svg>
  );
}

/** Footer with only working destinations: discovery shortcuts, account pages and real support contacts. */
export function SiteFooter() {
  const groups: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: "Discover",
      links: [
        { href: "/events", label: "All events" },
        { href: exploreHref({ date: "weekend" }), label: "This weekend" },
        { href: exploreHref({ price: "free" }), label: "Free events" },
      ],
    },
    {
      title: "Your account",
      links: [
        { href: "/my-tickets", label: "My tickets" },
        { href: "/account", label: "Account settings" },
        { href: "/auth", label: "Sign in" },
        { href: "/auth?step=sign-up", label: "Create an account" },
      ],
    },
  ];

  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.3fr_repeat(2,1fr)]">
        <div className="flex flex-col gap-3">
          <Logo variant="wordmark" width={110} />
          <p className="m-0 max-w-[280px] type-body-sm text-text-soft">{MARKETPLACE.tagline}. Free registration for conferences, workshops, concerts and more across Ethiopia.</p>
          <div className="mt-1 flex flex-col gap-1 type-body-sm text-text-soft">
            <span className="type-label text-text-faint">Need help?</span>
            <a className={linkCls} href={`mailto:${MARKETPLACE.supportEmail}`}>
              {MARKETPLACE.supportEmail}
            </a>
            <a className={linkCls} href={`tel:+251${MARKETPLACE.supportPhone.replace(/\s/g, "")}`}>
              +251 {MARKETPLACE.supportPhone}
            </a>
          </div>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="m-0 mb-3 type-label text-text-faint">{g.title}</h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {g.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className={linkCls}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      {/* The name, cut off by the line above the copyright row, as if it sits behind it. */}
      <div className="overflow-hidden">
        <Container>
          <BigName />
        </Container>
      </div>
    </footer>
  );
}
