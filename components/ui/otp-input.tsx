"use client";

import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { cn } from "../../lib/utils";

export interface OtpInputProps {
  /** The digits entered so far (a string of at most `length` digits). */
  value: string;
  onValueChange: (value: string) => void;
  /** Called once all `length` digits are in. */
  onComplete?: (value: string) => void;
  length?: number;
  /** `ok` / `error` colour the boxes success / danger (a verified or wrong code). */
  status?: "default" | "ok" | "error";
  /** `sm` — 36x42 boxes (wallet PIN). Default is the 42x48 code box. */
  size?: "default" | "sm";
  /** Left-align the row (`.otp-row.start`, for forms) instead of centering it (modals). */
  start?: boolean;
  /** Hide the digits — the wallet PIN. */
  mask?: boolean;
  autoFocus?: boolean;
  /** Prefix for the per-box accessible names ("Digit 1 of 6"). */
  "aria-label"?: string;
  className?: string;
}

/**
 * `.otp-row` — one box per digit. Typing advances to the next box, Backspace on an empty box steps back, and
 * pasting a code fills every box. Digits only; a box turns accent once filled.
 */
export function OtpInput({
  value,
  onValueChange,
  onComplete,
  length = 6,
  status = "default",
  size = "default",
  start = false,
  mask = false,
  autoFocus = false,
  className,
  "aria-label": ariaLabel = "Digit",
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function commit(next: string, focusIndex: number) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onValueChange(clean);
    refs.current[Math.min(focusIndex, length - 1)]?.focus();
    if (clean.length === length) onComplete?.(clean);
  }

  function onChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const arr = digits.slice();
    arr[i] = digit;
    commit(arr.join("").replace(/ /g, ""), digit ? i + 1 : i);
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const arr = digits.slice();
      arr[i - 1] = "";
      onValueChange(arr.join(""));
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  }

  function onPaste(i: number, e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const merged = (value.slice(0, i) + text).slice(0, length);
    commit(merged, i + text.length);
  }

  return (
    <div role="group" className={cn("flex gap-2", start ? "justify-start flex-wrap" : "my-1.5 justify-center", className)}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type={mask ? "password" : "text"}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          aria-label={`${ariaLabel} ${i + 1} of ${length}`}
          aria-invalid={status === "error" || undefined}
          value={d}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={(e) => onPaste(i, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            "rounded-sm border bg-surface text-center font-semibold text-text transition-[border-color,box-shadow] focus:outline-none",
            size === "sm" ? "h-[42px] w-9 text-[17px]" : "h-12 w-[42px] text-[20px]",
            status === "ok"
              ? "border-success focus:shadow-focus"
              : status === "error"
                ? "border-danger focus:shadow-focus-danger"
                : d
                  ? "border-accent focus:shadow-focus"
                  : "border-input-border focus:border-accent focus:shadow-focus",
          )}
        />
      ))}
    </div>
  );
}

export interface OtpResendProps {
  /** `field` (default) is the 11.5px `.field-hint` under an OTP in a form; `modal` is the centered 12.5px `.otp-meta` of the payment modal. */
  variant?: "field" | "modal";
  /** Seconds before "Resend code" unlocks. Default 30. */
  seconds?: number;
  onResend: () => void;
  className?: string;
}

/** `.otp-meta` / `.field-hint` resend line — "Didn't get it? Resend in 00:30", then an accent "Resend code" link. */
export function OtpResend({ seconds = 30, onResend, variant = "field", className }: OtpResendProps) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const mm = `00:${String(left).padStart(2, "0")}`;
  return (
    <p className={cn("text-text-faint", variant === "modal" ? "text-center text-[12.5px]" : "text-[11.5px]", className)}>
      Didn&rsquo;t get it?{" "}
      {left > 0 ? (
        <span className="font-semibold">
          Resend in <b className="font-semibold tabular-nums text-text">{mm}</b>
        </span>
      ) : (
        <button
          type="button"
          className="font-semibold text-accent hover:underline"
          onClick={() => {
            setLeft(seconds);
            onResend();
          }}
        >
          Resend code
        </button>
      )}
    </p>
  );
}
