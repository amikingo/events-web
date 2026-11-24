/**
 * Display typography for the landing page only.
 *
 * Project decision: on the landing page the brand guideline governs components and colours, not type size, so the
 * page can use editorial display sizes beyond the `type-*` scale (max 22px). Everywhere else in the app the `type-*`
 * utilities still apply. Keep every landing-page size in this one file.
 */
export const landingType = {
  /** Hero headline: fluid 40px → 68px. */
  display: "text-[clamp(2.5rem,5.2vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]",
  /** Section headings: fluid 28px → 44px, lines balanced so no word is left alone. */
  title: "text-[clamp(1.75rem,3.2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance",
  /** Spotlight slide titles: fluid 26px → 48px. */
  slide: "text-[clamp(1.625rem,3.6vw,3rem)] font-bold leading-[1.04] tracking-[-0.03em]",
  /** The lead category tile: fluid 26px → 40px. */
  tile: "text-[clamp(1.625rem,2.8vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.025em]",
  /** Card and tile titles: 18px → 20px. */
  card: "text-[18px] font-semibold leading-[1.3] tracking-[-0.01em] sm:text-[20px]",
  /** Intro paragraphs under display headings: fluid 16px → 19px. */
  lead: "text-[clamp(1rem,1.4vw,1.1875rem)] leading-[1.6]",
  /** Small caps label above a heading. */
  eyebrow: "text-[12px] font-semibold uppercase tracking-[0.16em]",
} as const;
