import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CalendarIcon } from "./icons";

export interface DateTriggerProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  /** Placeholder styling (faint) when no date is chosen. */
  empty?: boolean;
  children: ReactNode;
}

/** `.date-trigger` — the 36px calendar-icon box that opens a date or date-range panel. */
export const DateTrigger = forwardRef<HTMLDivElement, DateTriggerProps>(({ open = false, empty = false, className, children, ...props }, ref) => (
  <div
    ref={ref}
    role="button"
    tabIndex={0}
    aria-haspopup="dialog"
    aria-expanded={open}
    className={cn(
      "flex h-9 w-full cursor-pointer items-center gap-2 rounded-btn border bg-surface px-3 type-body text-text",
      "focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus",
      open ? "border-accent shadow-focus" : "border-input-border",
      className,
    )}
    {...props}
  >
    <CalendarIcon className="size-4 shrink-0 text-text-faint" />
    <span className={cn(empty && "text-text-faint")}>{children}</span>
  </div>
));
DateTrigger.displayName = "DateTrigger";
