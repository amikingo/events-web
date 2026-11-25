"use client";

import { InputAddon, InputGroup } from "./input";
import type { InputGroupProps } from "./input";
import { CheckThinIcon, FlagEthiopia } from "./icons";

/**
 * Digits only, at most nine, grouped 3-3-3 ("911 204 412"). A pasted or autofilled international number
 * ("+251911204412", "251 911 204 412") or a local one ("0911204412") keeps its nine national digits: an Ethiopian
 * mobile never starts with 2, so a leading 251 before a 7 or 9 is always the country code.
 */
export function formatEthiopianPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^251(?=[79])/, "").replace(/^0/, "").slice(0, 9);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(" ");
}

/** Valid at nine digits starting with 9 or 7. */
export function isValidEthiopianPhone(value: string): boolean {
  const d = value.replace(/\D/g, "");
  return d.length === 9 && /^[79]/.test(d);
}

export interface PhoneInputProps extends Omit<InputGroupProps, "type" | "leading" | "suffix" | "trailing" | "value" | "onChange"> {
  /** The formatted value, as returned by `onValueChange`. */
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * Fixed `+251` prefix with the flag, digits grouped 3-3-3 as you type, numeric keyboard on mobile.
 * A green check appears in the trailing slot once the number is valid (no toast).
 */
export function PhoneInput({ value, onValueChange, error, ...props }: PhoneInputProps) {
  const valid = isValidEthiopianPhone(value);
  return (
    <InputGroup
      {...props}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder="911 204 412"
      value={value}
      error={error}
      onChange={(e) => onValueChange(formatEthiopianPhone(e.target.value))}
      leading={
        <InputAddon>
          <FlagEthiopia className="h-[14px] w-[22px] flex-none rounded-flag shadow-flag" />
          +251
        </InputAddon>
      }
      trailing={
        valid && !error ? (
          <span className="flex w-[34px] flex-none items-center justify-center text-success-text" aria-label="Valid number">
            <CheckThinIcon className="size-4" />
          </span>
        ) : undefined
      }
    />
  );
}
