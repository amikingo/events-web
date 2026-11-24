"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { ChevIcon } from "./icons";
import { Input } from "./input";
import { ScrollArea } from "./scroll-area";
import { Spinner } from "./spinner";
import { Highlight, OptionEmpty, OptionGroupLabel, OptionRow } from "./option-list";
import { useKeepInView } from "../../lib/use-keep-in-view";

export interface ComboboxOption {
  value: string;
  label: string;
  /** `.opt-sub` — muted text after the label ("12 staff"). */
  sub?: ReactNode;
  /** Section heading this option belongs to; options sharing a `group` are listed together. */
  group?: string;
  /** Avatar, pay logo or a 14px icon before the label. */
  leading?: ReactNode;
  /** Pill / status at the far right. */
  right?: ReactNode;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Message when the typed text matches nothing. */
  emptyText?: string;
  id?: string;
  error?: boolean;
  /** Options are being fetched: the panel shows a spinner row instead of the list. */
  loading?: boolean;
  loadingLabel?: string;
  className?: string;
}

/**
 * `.combo` — a select for more than about eight options. The trigger is the text input; typing filters the panel and
 * highlights the match in accent; options can group under a small label and carry a sub-line, an avatar or a status.
 */
export function Combobox({ options, value, onValueChange, placeholder = "Search…", emptyText = "No matches", id, error, loading = false, loadingLabel = "Loading options…", className }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const [query, setQuery] = useState(selectedLabel);
  const [typed, setTyped] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // The list hangs from the input; on a phone near the screen edge it is nudged back into view, like the other popovers.
  const panelRef = useRef<HTMLDivElement>(null);
  useKeepInView(panelRef, open);

  // Keyed on the label (a string), not `options` — a parent that rebuilds the array each render would otherwise wipe what's being typed.
  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  function close() {
    setOpen(false);
    setTyped(false);
    setQuery(selectedLabel);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedLabel]);


  const q = typed ? query.trim().toLowerCase() : "";
  const visible = options.filter((o) => !q || o.label.toLowerCase().includes(q));
  const groups = [...new Set(visible.map((o) => o.group ?? ""))];

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        error={error}
        className={cn("pr-9", open && "border-accent shadow-focus")}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setTyped(true);
          setOpen(true);
        }}
      />
      <ChevIcon className={cn("pointer-events-none absolute right-2.5 top-[18px] size-4 -translate-y-1/2 text-text-faint transition-transform", open && "rotate-180")} />
      {open && (
        <ScrollArea
          ref={panelRef}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-40 max-h-[260px] rounded-sm border border-border bg-surface shadow"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2.5 p-3 text-[12.5px] text-text-soft">
              <Spinner />
              {loadingLabel}
            </div>
          ) : visible.length === 0 ? (
            <OptionEmpty>{emptyText}</OptionEmpty>
          ) : (
            groups.map((g) => (
              <div key={g || "_"}>
                {g && <OptionGroupLabel>{g}</OptionGroupLabel>}
                {visible
                  .filter((o) => (o.group ?? "") === g)
                  .map((o) => (
                    <OptionRow
                      key={o.value}
                      active={o.value === value}
                      check
                      leading={o.leading}
                      label={typed ? <Highlight text={o.label} query={query} /> : o.label}
                      sub={o.sub}
                      right={o.right}
                      onSelect={() => {
                        onValueChange(o.value);
                        setQuery(o.label);
                        setTyped(false);
                        setOpen(false);
                      }}
                    />
                  ))}
              </div>
            ))
          )}
        </ScrollArea>
      )}
    </div>
  );
}
