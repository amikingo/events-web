"use client";

import { useEffect, useRef } from "react";
import { cn } from "../../../lib/utils";
import { IconTile } from "../../ui/icon-tile";
import { landingType } from "./landing-type";
import { PROPS } from "./value-props";

/** Where the circle finishes opening (share of the scroll), and where each promise lights up, one after another. */
const OPEN_END = 0.4;
const LIGHT_AT = [0.42, 0.6, 0.78] as const;

/**
 * "Why book with us" as a scroll reveal. The section is tall with a full-screen stage pinned. At first the stage is the
 * light page with a heading; as you scroll a dark circle opens from the middle until it fills the screen, then the
 * three promises light up one after another. One scroll listener writes the progress to `--p`; the circle, fades and
 * lighting are CSS `calc()` on it. With reduced motion everything is shown at once, with no pinning.
 */
export function WhyBookReveal() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (reduced.matches) return;
      const rect = el.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      el.style.setProperty("--p", (range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0).toFixed(4));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <section ref={ref} aria-labelledby="why-title" className="relative h-[260svh] motion-reduce:h-auto" style={{ "--p": 0 } as React.CSSProperties}>
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-auto">
        {/* The light stage the circle opens over. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center motion-reduce:hidden" style={{ opacity: `max(0, calc(1 - var(--p) / ${OPEN_END * 0.7}))` }}>
          <p className={cn("m-0 text-accent-text", landingType.eyebrow)}>Why book with us</p>
          <h2 className={cn("m-0 mt-3 max-w-[720px] text-text", landingType.title)}>Three promises we keep at checkout</h2>
        </div>

        {/* The dark circle, opening from just below the middle. */}
        <div
          className="absolute inset-0 flex items-center bg-paper-ink bg-[radial-gradient(ellipse_at_50%_55%,color-mix(in_srgb,var(--color-accent-deep)_85%,var(--color-paper-ink)),var(--color-paper-ink)_72%)] text-white motion-reduce:static motion-reduce:py-20 motion-reduce:[clip-path:none]"
          style={{ clipPath: `circle(calc(min(var(--p) / ${OPEN_END}, 1) * 80%) at 50% 55%)` }}
        >
          <div className="mx-auto w-full max-w-[1100px] px-6">
            <h2 id="why-title" className="sr-only">
              Why book with us
            </h2>
            <ol className="m-0 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-8">
              {PROPS.map((p, i) => (
                <li key={p.title} className="flex flex-col gap-4 motion-reduce:opacity-100" style={{ opacity: `calc(0.18 + clamp(0, (var(--p) - ${LIGHT_AT[i]}) * 8, 1) * 0.82)` }}>
                  <IconTile tone="accent" size="lg">
                    {p.icon}
                  </IconTile>
                  <span className="type-label text-accent-light">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className={cn("m-0 text-white", landingType.card)}>{p.title}</h3>
                  <p className="m-0 type-body text-white/75">{p.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
