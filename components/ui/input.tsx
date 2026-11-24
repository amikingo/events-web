import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/** `.text-input` — 36px, 6px radius, 1px input-border, accent focus ring, danger ring when `error`. */
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error = false, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={error || undefined}
    className={cn(
      "h-9 w-full rounded-btn border bg-surface px-3 type-body text-text placeholder:text-text-faint",
      "focus:outline-none",
      "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-faint",
      error ? "border-danger focus:shadow-focus-danger" : "border-input-border focus:border-accent focus:shadow-focus",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export interface InputAddonProps {
  children: ReactNode;
  /** `suffix` puts the divider on the left (e.g. "ETB"); the default puts it on the right (e.g. "+251"). `plain` has no divider. */
  variant?: "prefix" | "suffix" | "plain";
}

/** `.input-addon` — the fixed text/flag chip at either end of an `<InputGroup>`. */
export function InputAddon({ children, variant = "prefix" }: InputAddonProps) {
  const divider = "after:absolute after:top-1/2 after:h-[18px] after:w-px after:-translate-y-1/2 after:bg-border-strong after:content-['']";
  return (
    <span
      className={cn(
        "relative flex flex-none items-center gap-2 whitespace-nowrap text-[13.5px] font-medium tabular-nums text-text-soft",
        variant === "prefix" && cn("py-0 pl-2.5 pr-3", divider, "after:right-0"),
        variant === "suffix" && cn("py-0 pl-3 pr-2.5", divider, "after:left-0"),
        variant === "plain" && "pl-2.5 pr-1",
      )}
    >
      {children}
    </span>
  );
}

export interface InputGroupProps extends Omit<InputProps, "prefix"> {
  /** `.input-addon` before the field (flag + "+251", a currency symbol…). */
  leading?: ReactNode;
  /** `.input-addon.suffix` after the field ("ETB"). */
  suffix?: ReactNode;
  /** `.input-trail-btn` / `.input-trail-ic` — a button or status icon inside the right edge (show password, ✓). */
  trailing?: ReactNode;
  /** Classes for the group wrapper; `className` goes to the inner `<input>`. */
  groupClassName?: string;
}

/**
 * `.input-group` — one bordered box holding an addon, the bare input and a trailing slot. The border,
 * focus ring and error/disabled states live on the group, so they wrap the whole thing.
 */
export const InputGroup = forwardRef<HTMLInputElement, InputGroupProps>(
  ({ leading, suffix, trailing, error = false, disabled, className, groupClassName, ...props }, ref) => (
    <div
      className={cn(
        "flex w-full items-stretch overflow-hidden rounded-btn border bg-surface transition-[border-color,box-shadow]",
        error ? "border-danger focus-within:shadow-focus-danger" : "border-input-border focus-within:border-accent focus-within:shadow-focus",
        disabled && "bg-surface-2",
        groupClassName,
      )}
    >
      {leading}
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={error || undefined}
        className={cn(
          "h-9 min-w-0 flex-1 border-none bg-transparent type-body text-text placeholder:text-text-faint focus:outline-none disabled:cursor-not-allowed disabled:text-text-faint",
          leading ? "pl-2.5 pr-3" : "px-3",
          suffix && "pr-3",
          className,
        )}
        {...props}
      />
      {suffix}
      {trailing}
    </div>
  ),
);
InputGroup.displayName = "InputGroup";
