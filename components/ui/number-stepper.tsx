"use client";

import { cn } from "../../lib/utils";
import { MinusIcon, PlusIcon } from "./icons";

export interface NumberStepperProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** `lg` is the 36px touch size (seats, passengers). Default is the 30px size used in tables and carts. */
  size?: "default" | "lg";
  /** Fill the container (mobile): the value cell stretches between the two buttons. */
  block?: boolean;
  /** Accessible name for the group (the visible label usually sits above, in a `<Field>`). */
  "aria-label"?: string;
  className?: string;
}

/** `.qty-step` — minus, value, plus in one bordered box. Buttons disable (35% opacity) at `min` / `max`. */
export function NumberStepper({ value, onValueChange, min = 0, max = Infinity, step = 1, size = "default", block = false, className, ...props }: NumberStepperProps) {
  const lg = size === "lg";
  const btn = cn(
    "flex items-center justify-center bg-transparent text-text-soft hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-text-soft",
    lg ? "h-9 w-9" : "h-[30px] w-7",
  );
  return (
    <div
      role="group"
      className={cn(
        "items-center overflow-hidden rounded-btn border border-input-border bg-surface",
        block ? "flex w-full" : "inline-flex",
        className,
      )}
      {...props}
    >
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => onValueChange(Math.max(min, value - step))} className={btn}>
        <MinusIcon className="size-3" />
      </button>
      <span
        aria-live="polite"
        className={cn(
          "border-x border-border text-center font-semibold tabular-nums text-text",
          lg ? "min-w-12 text-[14px] leading-9" : "min-w-[30px] text-[13px] leading-[30px]",
          block && "flex-1",
        )}
      >
        {value}
      </span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onValueChange(Math.min(max, value + step))} className={btn}>
        <PlusIcon className="size-3" />
      </button>
    </div>
  );
}
