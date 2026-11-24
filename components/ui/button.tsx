import { cloneElement, forwardRef, isValidElement } from "react";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { ButtonSpinner } from "./spinner";

/** Matches the guideline's `.btn` exactly — it only documents these three. */
export type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** `.btn.icon-only` — 36x36, no label. Override the size with className where a context needs a different one (the table's 32px row actions, the pager's 30px arrows). */
  iconOnly?: boolean;
  /** Shows the spinner, disables the button and keeps its width — the idle content stays in layout (invisible) while the spinner and `loadingLabel` sit centred over it. */
  loading?: boolean;
  /** The present-tense label shown while loading ("Processing…"). Defaults to the normal label. Icon-only buttons just show the spinner. */
  loadingLabel?: ReactNode;
  /** Give the single child element (a router `<Link>`, an `<a>`) the button's look instead of rendering a `<button>`. No loading state in this mode. */
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent-fill text-white shadow-btn-accent hover:opacity-90 hover:shadow-btn-accent-hover",
  secondary: "bg-surface-2 text-text border border-border hover:bg-border",
  danger: "bg-danger-fill text-white shadow-btn-danger hover:opacity-90 hover:shadow-btn-danger-hover",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", iconOnly = false, loading = false, loadingLabel, disabled, asChild = false, children, ...props }, ref) => {
    const classes = cn(
      "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-btn type-button transition-[filter,box-shadow,transform,opacity] active:scale-[0.98]",
      "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none disabled:active:scale-100",
      "aria-disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:shadow-none",
      iconOnly ? "w-9 p-0" : "px-4",
      loading && "relative",
      variantClasses[variant],
      className,
    );
    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<Record<string, unknown>>;
      return cloneElement(child, { ...props, ref, "aria-disabled": disabled || undefined, className: cn(classes, child.props.className as string | undefined) });
    }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={classes}
        {...props}
      >
        {loading ? (
          <>
            <span aria-hidden="true" className="invisible inline-flex items-center justify-center gap-2">
              {children}
            </span>
            <span className="absolute inset-0 flex items-center justify-center gap-2" aria-busy="true">
              <ButtonSpinner />
              {!iconOnly && (loadingLabel ?? children)}
            </span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";
