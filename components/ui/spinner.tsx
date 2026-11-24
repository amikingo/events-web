import { cn } from "../../lib/utils";

export type SpinnerSize = "sm" | "md" | "lg";
export type SpinnerTone = "accent" | "soft" | "current";

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "size-4 border-2",
  md: "size-6 border-[2.5px]",
  lg: "size-9 border-[3px]",
};
const toneClasses: Record<SpinnerTone, string> = {
  accent: "text-accent",
  soft: "text-text-faint",
  current: "",
};

export interface SpinnerProps {
  /** 16 / 24 / 36px. */
  size?: SpinnerSize;
  /** `accent` on surfaces, `soft` when it must not draw attention (a background refresh), `current` to inherit the text color. */
  tone?: SpinnerTone;
  className?: string;
  /** Accessible name. Default "Loading". */
  label?: string;
}

/**
 * `.spinner` — a ring with a faint track and a spinning arc, 0.7s. Spinners are for actions and unknown waits;
 * skeletons are for content. Under reduced motion it stops as a static ring.
 */
export function Spinner({ size = "sm", tone = "accent", className, label = "Loading" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block flex-none animate-spin rounded-full border-[color-mix(in_srgb,currentColor_22%,transparent)] border-t-current [animation-duration:700ms] [animation-timing-function:linear] motion-reduce:animate-none motion-reduce:border-r-current",
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
    />
  );
}

/** `.btn-spinner` — the bordered circle with its right side transparent, spun at 0.7s; inside buttons (current text color) and toast tiles. */
export function ButtonSpinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent [animation-duration:700ms] motion-reduce:animate-none",
        className,
      )}
    />
  );
}
