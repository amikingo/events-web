"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CheckIcon, ChevIcon } from "./icons";
import { Spinner } from "./spinner";
import { EmptyState } from "./empty-state";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Shown in the trigger while `value` matches no option. */
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  /** Options are being fetched: the panel shows "Loading …" with a spinner instead of the list. */
  loading?: boolean;
  loadingLabel?: string;
  /** Shown in the panel when there are no options — usually an `<EmptyState size="sm">` with a text link ("No stylists at this branch · Add staff"). */
  emptyState?: ReactNode;
  /** `sm` is the chart card's range filter: 32px tall, 12.5px, sized to its label, panel right-aligned. */
  size?: "default" | "sm";
  className?: string;
}

/** `.select-trigger` + `.select-panel` — single-select; the active option is tinted and checked. */
export function Select({ options, value, onValueChange, placeholder = "Select…", id, disabled, loading = false, loadingLabel = "Loading options…", emptyState, size = "default", className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  // A width class (`w-40`, `max-w-xs`) sizes the whole select, not only the trigger inside its full-width wrapper — otherwise
  // selects placed in a row each take a full line. Every other class stays on the trigger.
  const classes = (className ?? "").split(/\s+/).filter(Boolean);
  const isWidth = (c: string) => /^(?:min-|max-)?w-/.test(c);
  const widthClass = classes.filter(isWidth).join(" ");
  const triggerClass = classes.filter((c) => !isWidth(c)).join(" ");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} className={cn("relative block", size === "sm" ? "w-auto" : "w-full", widthClass)}>
      <DropdownMenuTrigger
        id={id}
        disabled={disabled}
        className={cn(
          "justify-between rounded-btn border border-input-border bg-surface text-text",
          size === "sm" ? "h-8 gap-2 px-2.5 text-[12.5px]" : "h-9 w-full px-3 type-body",
          " disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-faint",
          open && "border-accent shadow-focus",
          triggerClass,
        )}
      >
        <span className={cn("truncate", !selected && "text-text-faint")}>{selected?.label ?? placeholder}</span>
        <ChevIcon className={cn("size-4 shrink-0 text-text-faint transition-transform", open && "rotate-180")} />
      </DropdownMenuTrigger>
      {/* Long lists scroll inside the panel (the guideline's select panel is a scroll region) instead of running off the screen.
          `portal`: the panel is drawn over the page, so a clipping ancestor (an `overflow-hidden` hero or card, a scroll area) can't cut it off. */}
      <DropdownMenuContent portal align={size === "sm" ? "end" : "start"} matchTriggerWidth={size !== "sm"} className={cn("max-h-80 overflow-y-auto overscroll-contain", size === "sm" && "w-auto min-w-[150px]")}>
        {loading ? (
          <div className="flex items-center justify-center gap-2.5 p-3 text-[12.5px] text-text-soft">
            <Spinner />
            {loadingLabel}
          </div>
        ) : options.length === 0 ? (
          (emptyState ?? <EmptyState size="sm" title="No options" />)
        ) : (
          options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={cn(
              "justify-between",
              option.value === value && "bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))] font-semibold text-accent-text",
            )}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
            {option.value === value && <CheckIcon className="!size-3.5 !text-accent" />}
          </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
