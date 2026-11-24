"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** `.control-label` — renders the guideline's `.switch-row` (track + label, whole row clickable). Without it, give the switch an `aria-label`. */
  label?: ReactNode;
}

/** `.switch-track` — 38x22 pill, `input-border` off / accent on, with an 18px white thumb that slides 16px. */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(({ checked, onCheckedChange, label, disabled, className, ...props }, ref) => {
  const track = (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-[22px] w-[38px] flex-none cursor-pointer rounded-full transition-colors",
        checked ? "bg-accent" : "bg-input-border",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-[18px] rounded-full bg-white shadow-thumb transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
  if (!label) return track;
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5", disabled && "cursor-not-allowed")}>
      {track}
      <span className="text-[13.5px] text-text">{label}</span>
    </label>
  );
});
Switch.displayName = "Switch";
