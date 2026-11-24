import { forwardRef } from "react";
import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `compact` is the 12px/14px padding used for stacked rows and dense lists; default is 18px. */
  compact?: boolean;
  /** Lifts on hover (raised shadow, -2px) — for cards that are links or buttons. */
  hoverable?: boolean;
  /** Accent border and focus ring — a selected card. */
  selected?: boolean;
  /** 50% opacity, not interactive. */
  disabled?: boolean;
}

/** `.card` — the surface container: 12px radius, 1px border, resting shadow. */
export const Card = forwardRef<HTMLDivElement, CardProps>(({ compact = false, hoverable = false, selected = false, disabled = false, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative min-w-0 rounded-md border bg-surface shadow transition-[box-shadow,transform,border-color,opacity]",
      compact ? "px-3.5 py-3" : "p-[18px]",
      selected ? "border-accent shadow-focus" : "border-border",
      hoverable && "cursor-pointer hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised",
      disabled && "pointer-events-none opacity-50 shadow-none",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  /** `.card-sub` — 12px muted line under the title. */
  subtitle?: ReactNode;
  /** The trailing action: a `CardLink`, a range select or an icon button. */
  action?: ReactNode;
}

/** `.card-head` — title 14/600 with an optional 12px sub on the left, one action on the right. No divider underneath. */
export function CardHeader({ title, subtitle, action, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn("mb-3.5 flex items-start justify-between gap-3", className)} {...props}>
      <div className="min-w-0">
        <h4 className="m-0 text-[14px] font-semibold leading-[1.3] text-text">{title}</h4>
        {subtitle && <p className="m-0 mt-0.5 text-[12px] text-text-faint">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** `.card-foot` — 1px top rule, 14px above and below it; pills on the left, buttons on the right. */
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-3.5 flex flex-wrap items-center justify-between gap-2.5 border-t border-border pt-3.5", className)} {...props} />;
}

/** `.card-link` — the 12px accent text action in a card header or footer. */
export const CardLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(({ className, ...props }, ref) => (
  <a ref={ref} className={cn("whitespace-nowrap text-[12px] font-semibold text-accent no-underline hover:underline", className)} {...props} />
));
CardLink.displayName = "CardLink";

/** `.card-grid` — auto-fit grid, 16px gap; cards stretch to equal height. `narrow` 190px (KPI rows), default 230px, `wide` 300px (charts, lists). */
export function CardGrid({ size = "default", className, ...props }: HTMLAttributes<HTMLDivElement> & { size?: "narrow" | "default" | "wide" }) {
  return (
    <div
      className={cn(
        "grid w-full gap-4",
        size === "narrow" && "grid-cols-[repeat(auto-fit,minmax(190px,1fr))]",
        size === "default" && "grid-cols-[repeat(auto-fit,minmax(230px,1fr))]",
        size === "wide" && "grid-cols-[repeat(auto-fit,minmax(300px,1fr))]",
        className,
      )}
      {...props}
    />
  );
}
