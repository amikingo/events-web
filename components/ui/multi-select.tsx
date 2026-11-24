"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { CheckIcon, ChevIcon } from "./icons";
import { Chip } from "./chip";
import { ScrollArea } from "./scroll-area";
import { TextLink } from "./text-link";
import { useKeepInView } from "../../lib/use-keep-in-view";

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  /** Shown in the trigger while nothing is selected. */
  placeholder?: string;
  id?: string;
  className?: string;
}

/**
 * `.ms` — multi-select. The trigger holds one removable chip per selected value
 * (`.ms-trigger .pill.chip`), the panel lists checkbox options (`.ms-panel`) and ends
 * with a "N selected · Clear" footer (`.ms-foot`).
 */
export function MultiSelect({ options, value, onValueChange, placeholder = "Select…", id, className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // The panel hangs from the trigger; near a phone's screen edge it is nudged back into view, like the other popovers.
  const panelRef = useRef<HTMLDivElement>(null);
  useKeepInView(panelRef, open);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    // Capture phase so an Escape that closes this panel doesn't also close an enclosing menu/panel.
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const toggle = (v: string) =>
    onValueChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div
        id={id}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        className={cn(
          "relative flex min-h-9 cursor-pointer flex-wrap items-center gap-[5px] rounded-btn border bg-surface py-1 pl-[5px] pr-[34px] transition-[border-color,box-shadow]",
          "focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus",
          open
            ? "border-accent shadow-focus"
            : "border-input-border",
        )}
      >
        {value.map((v) => {
          const opt = options.find((o) => o.value === v);
          return (
            <Chip
              key={v}
              selected
              tabIndex={-1}
              className="px-2 py-[3px] text-[11.5px]"
              onRemove={() => toggle(v)}
              removeLabel={`Remove ${opt?.label ?? v}`}
            >
              {opt?.label ?? v}
            </Chip>
          );
        })}
        {value.length === 0 && <span className="pl-[7px] type-body leading-[26px] text-text-faint">{placeholder}</span>}
        <ChevIcon
          className={cn(
            "absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint transition-transform",
            open && "rotate-180",
          )}
        />
      </div>

      {open && (
        <ScrollArea
          ref={panelRef}
          role="listbox"
          aria-multiselectable="true"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-40 max-h-64 rounded-sm border border-border bg-surface shadow"
        >
          {options.map((option) => {
            const active = value.includes(option.value);
            return (
              <div
                key={option.value}
                role="option"
                tabIndex={0}
                aria-selected={active}
                onClick={() => toggle(option.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(option.value);
                  }
                }}
                className="flex cursor-pointer items-center justify-start gap-2.5 px-3 py-[9px] text-[13.5px] font-medium text-text hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "pointer-events-none flex size-[18px] shrink-0 items-center justify-center rounded-check border-[1.5px] transition-colors",
                    active ? "border-accent bg-accent" : "border-input-border bg-surface",
                  )}
                >
                  {active && <CheckIcon className="size-3 text-white" />}
                </span>
                {option.label}
              </div>
            );
          })}
          <div className="sticky bottom-0 flex items-center justify-between border-t border-border bg-surface px-3 py-2 text-[12px] text-text-faint">
            <span>
              <b className="font-semibold text-text">{value.length}</b> selected
            </span>
            <TextLink onClick={() => onValueChange([])}>Clear</TextLink>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
