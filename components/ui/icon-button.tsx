import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CountBadge } from "./count-badge";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The 17px line icon. */
  icon: ReactNode;
  "aria-label": string;
  /** A number bubble on the top-right corner. Over `max` shows `99+`; 0 / undefined shows nothing. */
  count?: number;
  /** `danger` only for things that need action now (a cart with an expiring hold, failed payments). */
  countTone?: "accent" | "danger" | "neutral";
  max?: number;
  /** A small dot instead of a number — "something new". */
  dot?: boolean;
  /** The top-bar notification dot: 7px, danger red, inside the button's top-right corner with a surface ring. */
  statusDot?: boolean;
}

/** `.icon-btn` inside a `.badge-host` — a 36px quiet icon button with an optional count (or dot) badge. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ icon, count, countTone = "accent", max = 99, dot = false, statusDot = false, className, type = "button", ...props }, ref) => (
  <span className="relative inline-flex">
    <button
      ref={ref}
      type={type}
      className={cn(
        "relative flex size-9 items-center justify-center rounded-sm border border-border bg-surface text-text-soft hover:bg-surface-2 [&_svg]:size-[17px]",
        className,
      )}
      {...props}
    >
      {icon}
      {statusDot && <span aria-hidden="true" className="absolute right-[7px] top-[7px] size-[7px] rounded-full border-[1.5px] border-surface bg-danger" />}
    </button>
    {dot ? <CountBadge dotOnly tone={countTone} /> : count ? <CountBadge tone={countTone}>{count > max ? `${max}+` : count}</CountBadge> : null}
  </span>
));
IconButton.displayName = "IconButton";
