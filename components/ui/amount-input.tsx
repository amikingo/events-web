"use client";

import { forwardRef } from "react";
import { cn } from "../../lib/utils";
import { InputAddon, InputGroup } from "./input";
import type { InputGroupProps } from "./input";
import { Chip } from "./chip";

/** Strips everything but digits and one decimal point, keeps at most two decimals, and inserts thousands separators ("1,234.5"). */
export function formatAmount(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const [intPart = "", ...rest] = cleaned.split(".");
  const int = intPart.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return rest.length ? `${int}.${rest.join("").slice(0, 2)}` : int;
}

/** The number behind a formatted amount ("1,234.50" → 1234.5); NaN for an empty field. */
export function parseAmount(formatted: string): number {
  return parseFloat(formatted.replace(/,/g, ""));
}

export interface AmountInputProps extends Omit<InputGroupProps, "type" | "leading" | "suffix" | "trailing" | "value" | "onChange" | "size"> {
  /** The formatted value, as returned by `onValueChange`. */
  value: string;
  onValueChange: (value: string) => void;
  /** Currency shown as the suffix addon (default ETB). */
  currency?: string;
  /** `large` — the centered wallet top-up field: 36px / 700, currency label beside it, bottom rule that turns accent on focus. */
  size?: "default" | "large";
  /** `large` only — quick-pick chips under the field (`.quick-amts`). The chip matching the current value is selected. */
  quickAmounts?: number[];
}

/**
 * Money is never a plain number field: thousands separators appear as you type, two decimals max,
 * the currency sits in a suffix addon, numeric keyboard on mobile, tabular numerals.
 */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onValueChange, currency = "ETB", size = "default", quickAmounts, error, className, groupClassName, ...props }, ref) => {
    if (size === "large") {
      return (
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              "flex items-baseline justify-center gap-2 border-b-[1.5px] pb-1.5 pt-3 transition-colors focus-within:border-accent",
              error ? "border-danger" : "border-border",
              groupClassName,
            )}
          >
            <span className="text-[14px] font-semibold text-text-faint">{currency}</span>
            <input
              ref={ref}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={value}
              aria-invalid={error || undefined}
              onChange={(e) => onValueChange(formatAmount(e.target.value))}
              className={cn(
                "w-[190px] border-none bg-transparent p-0 text-right text-[36px] font-bold leading-[normal] tracking-[-0.6px] tabular-nums text-text outline-none placeholder:text-text-faint",
                className,
              )}
              {...props}
            />
          </div>
          {quickAmounts && (
            <div className="flex flex-wrap justify-center gap-2">
              {quickAmounts.map((amt) => (
                <Chip key={amt} selected={parseAmount(value) === amt} onClick={() => onValueChange(formatAmount(String(amt)))}>
                  {amt.toLocaleString("en-US")}
                </Chip>
              ))}
            </div>
          )}
        </div>
      );
    }
    return (
      <InputGroup
        ref={ref}
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        error={error}
        groupClassName={groupClassName}
        className={cn("text-right tabular-nums", className)}
        onChange={(e) => onValueChange(formatAmount(e.target.value))}
        suffix={<InputAddon variant="suffix">{currency}</InputAddon>}
        {...props}
      />
    );
  },
);
AmountInput.displayName = "AmountInput";
