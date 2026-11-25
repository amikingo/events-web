"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CheckIcon, MinusIcon } from "./icons";

export interface CheckboxProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** `.control-label` — renders the guideline's `.checkbox-row` (box + label, whole row clickable). Without it, give the box an `aria-label`. */
  label?: ReactNode;
}

/** `.checkbox-box` + `checkSvg()` — 18x18, 5px radius, 1.5px input-border, accent fill when checked. */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked, indeterminate = false, onCheckedChange, disabled, label, ...props }, ref) => {
    const box = (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-check border-[1.5px] transition-colors",
          checked || indeterminate
            ? "bg-accent border-accent"
            : "bg-surface border-input-border",
          disabled && "opacity-50 pointer-events-none",
          className,
        )}
        {...props}
      >
        {indeterminate ? (
          <MinusIcon strokeWidth={3} className="size-3 text-white" />
        ) : checked ? (
          <CheckIcon className="size-3 text-white" />
        ) : null}
      </button>
    );
    if (!label) return box;
    return (
      <label className={cn("flex cursor-pointer items-center gap-2.5", disabled && "cursor-not-allowed")}>
        {box}
        <span className="text-[13.5px] text-text">{label}</span>
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
