"use client";

import { createContext, useContext, useId, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
  name: string;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name for the group when there's no visible label wired with `aria-labelledby`. */
  "aria-label"?: string;
}

/** `.radio-group` — a column of `<RadioItem>`s, 10px apart. Arrow keys move the selection; only the selected item is in the tab order. */
export function RadioGroup({ value, onValueChange, className, children, ...props }: RadioGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const name = useId();

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
    if (!keys.includes(e.key)) return;
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role="radio"]:not([aria-disabled="true"])') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const next = items[(i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
    next?.focus();
    next?.click();
  }

  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name }}>
      <div ref={ref} role="radiogroup" onKeyDown={onKeyDown} className={cn("flex flex-col gap-2.5", className)} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioItemProps {
  value: string;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** `.radio-row` — 18px dot (1.5px input-border; accent border + 9px accent centre when selected) and its `.control-label`. */
export function RadioItem({ value, label, disabled, className }: RadioItemProps) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) throw new Error("<RadioItem> must be used inside <RadioGroup>");
  const checked = ctx.value === value;
  const anySelected = ctx.value !== "";
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5", disabled && "cursor-not-allowed opacity-50", className)}>
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        tabIndex={checked || !anySelected ? 0 : -1}
        onClick={() => ctx.onValueChange(value)}
        className={cn(
          "flex size-[18px] flex-none items-center justify-center rounded-full border-[1.5px] bg-surface transition-colors",
          checked ? "border-accent" : "border-input-border",
        )}
      >
        {checked && <span className="size-[9px] rounded-full bg-accent" />}
      </button>
      <span className="text-[13.5px] text-text">{label}</span>
    </label>
  );
}
