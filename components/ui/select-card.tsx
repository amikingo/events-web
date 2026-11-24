"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CheckThinIcon } from "./icons";

export interface SelectCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "value"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** The figure on the right ("+150"); turns accent when selected. */
  value?: ReactNode;
  selected?: boolean;
  /** A leading logo or tile. */
  leading?: ReactNode;
  /** `radio` (default) for single choice, `checkbox` for multi choice. */
  control?: "radio" | "checkbox";
  /** `plan` stacks vertically with a name, a big price and a feature list (the plan picker). */
  plan?: { name: ReactNode; price: ReactNode; unit?: ReactNode; features?: ReactNode[] };
}

/** `.card.select-card` — a card that behaves like a radio or checkbox. Selected = accent border + 3px ring, like a focused input. */
export function SelectCard({ title, subtitle, value, selected = false, leading, control = "radio", plan, disabled, className, type = "button", ...props }: SelectCardProps) {
  const dot = (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-[18px] flex-none items-center justify-center border-[1.5px]",
        plan ? "absolute right-3.5 top-3.5" : "ml-auto",
        control === "radio" ? "rounded-full" : "rounded-check",
        control === "radio" && (selected ? "border-accent bg-surface" : "border-input-border bg-surface"),
        control === "checkbox" && (selected ? "border-accent bg-accent" : "border-input-border bg-surface"),
      )}
    >
      {control === "radio" && selected && <span className="size-[9px] rounded-full bg-accent" />}
      {control === "checkbox" && selected && <CheckThinIcon className="size-3 text-white" />}
    </span>
  );
  return (
    <button
      type={type}
      role={control}
      aria-checked={selected}
      disabled={disabled}
      className={cn(
        "relative w-full min-w-0 cursor-pointer select-none rounded-md border bg-surface text-left shadow transition-[box-shadow,border-color,opacity]",
        plan ? "flex flex-col items-stretch gap-2.5 p-[18px]" : "flex items-center gap-3 px-4 py-3.5",
        selected ? "border-accent shadow-focus" : "border-border hover:border-border-strong",
        disabled && "pointer-events-none opacity-50 shadow-none",
        className,
      )}
      {...props}
    >
      {plan ? (
        <>
          {dot}
          <div className="text-[12px] font-semibold uppercase tracking-[0.6px] text-text-faint">{plan.name}</div>
          <div className="text-[24px] font-bold tracking-[-0.3px] text-text">
            {plan.price}
            {plan.unit && <small className="text-[12px] font-medium tracking-normal text-text-faint">{plan.unit}</small>}
          </div>
          {plan.features && (
            <ul className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0 text-[12.5px] text-text-soft">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-[7px]">
                  <CheckThinIcon className="size-[13px] flex-none text-success-text" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          {leading}
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold text-text">{title}</span>
            {subtitle && <span className="block text-[11.5px] text-text-faint">{subtitle}</span>}
          </span>
          {value && <span className={cn("whitespace-nowrap text-[13px] font-semibold", selected ? "text-accent" : "text-text")}>{value}</span>}
          {dot}
        </>
      )}
    </button>
  );
}
