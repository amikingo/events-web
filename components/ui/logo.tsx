import type { ImgHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

/**
 * The brand artwork lives in `assets/brand/` — copy that folder to your app's `public/brand/`
 * (or pass `assetBase`). Variants map to the guideline's Logo section:
 *   wordmark       primary logo, pink wordmark          — on light surfaces
 *   lockup         primary logo, pink button lockup     — on light surfaces
 *   lockup-dark    primary logo, charcoal button lockup — on dark surfaces
 *   icon-outline   the standalone "C" mark
 *   icon-gradient  app icon, gradient tile
 *   icon-solid     app icon, solid pink tile
 */
export type LogoVariant = "wordmark" | "lockup" | "lockup-dark" | "icon-outline" | "icon-gradient" | "icon-solid";

interface VariantSpec {
  file: string;
  alt: string;
  /** width / height of the artwork. */
  ratio: number;
  /** Height of the artwork's "C" as a fraction of the image height — the guideline's 1x clear-space unit. */
  cFraction: number;
  /** Digital minimum width in px: icon 24, logo 100. */
  minWidth: number;
}

const VARIANTS: Record<LogoVariant, VariantSpec> = {
  wordmark: { file: "logo-wordmark-pink.png", alt: "Cheche", ratio: 1434 / 268, cFraction: 0.854, minWidth: 100 },
  lockup: { file: "logo-lockup-pink.png", alt: "Cheche", ratio: 1774 / 520, cFraction: 0.277, minWidth: 100 },
  "lockup-dark": { file: "logo-lockup-dark.png", alt: "Cheche", ratio: 1773 / 521, cFraction: 0.277, minWidth: 100 },
  "icon-outline": { file: "icon-outline.png", alt: "Cheche", ratio: 838 / 857, cFraction: 0.954, minWidth: 24 },
  "icon-gradient": { file: "icon-gradient-tile.png", alt: "Cheche", ratio: 923 / 919, cFraction: 0.958, minWidth: 24 },
  "icon-solid": { file: "icon-solid-tile.png", alt: "Cheche", ratio: 923 / 919, cFraction: 0.958, minWidth: 24 },
};

export interface LogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> {
  variant?: LogoVariant;
  /** Rendered width in px. Never goes below the guideline's minimum (icon 24px / logo 100px). */
  width?: number;
  /** Folder the brand files are served from. Default `/brand`. */
  assetBase?: string;
  /** Skip the minimum-size clamp. Only for the sidebar header, where the guideline sets the wordmark 16px tall (below the 100px minimum). */
  allowBelowMin?: boolean;
  /** Reserve the guideline's clear space (1x the "C" height) on every side — nothing else may enter that zone. */
  clearSpace?: boolean;
}

/** Cheche logo / app icon, with the guideline's minimum size and clear space enforced. */
export function Logo({ variant = "wordmark", width = 120, assetBase = "/brand", clearSpace = false, allowBelowMin = false, className, alt, ...props }: LogoProps) {
  const spec = VARIANTS[variant];
  const w = allowBelowMin ? width : Math.max(width, spec.minWidth);
  const h = w / spec.ratio;
  const img = (
    <img
      src={`${assetBase}/${spec.file}`}
      alt={alt ?? spec.alt}
      width={Math.round(w)}
      height={Math.round(h)}
      className={cn("block max-w-none", className)}
      {...props}
    />
  );
  if (!clearSpace) return img;
  return <span className="inline-block" style={{ padding: h * spec.cFraction }}>{img}</span>;
}
