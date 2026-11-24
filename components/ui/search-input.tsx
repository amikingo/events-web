"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { ClockIcon, SearchIcon, XIcon } from "./icons";
import { Spinner } from "./spinner";
import { Kbd } from "./kbd";
import { ScrollArea } from "./scroll-area";
import { Highlight, OptionEmpty, OptionGroupLabel, OptionRow } from "./option-list";

export interface SearchItem {
  id: string;
  label: string;
  /** Muted text beside the label ("Customer", "+251 912 ••• 781"). */
  sub?: ReactNode;
  avatar?: ReactNode;
  /** A pill at the far right. */
  right?: ReactNode;
}

export interface SearchInputProps {
  /** Everything searchable. Matches are found on `label`, client-side. */
  items: SearchItem[];
  /** Shown under "Recent" while the field is empty and focused. */
  recent?: SearchItem[];
  onSelect: (item: SearchItem) => void;
  placeholder?: string;
  /** Keyboard hint shown while the field is empty on desktop; pressing the key focuses the field. `false` hides it. */
  shortcut?: string | false;
  /** Debounce before results appear (ms) and the minimum characters — the guideline's 300ms / 2. */
  debounceMs?: number;
  minChars?: number;
  emptyText?: string;
  className?: string;
}

/**
 * `.srch` — the leading-icon input with a clear button, a spinner while results load, a keyboard hint on desktop, and
 * a suggestions panel split into Recent and Results with the match in accent.
 */
export function SearchInput({
  items,
  recent = [],
  onSelect,
  placeholder = "Search…",
  shortcut = "/",
  debounceMs = 300,
  minChars = 2,
  emptyText = "No results",
  className,
}: SearchInputProps) {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    const v = value.trim();
    if (v.length < minChars) {
      setLoading(false);
      setQuery("");
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      setQuery(v);
      setLoading(false);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [value, debounceMs, minChars]);

  useEffect(() => {
    if (!shortcut) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key === shortcut && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcut]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
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

  const results = query ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())) : [];
  const showRecent = open && !value && recent.length > 0;
  const showResults = open && !!query && !loading;

  function pick(item: SearchItem) {
    onSelect(item);
    setValue(item.label);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <SearchIcon className="pointer-events-none absolute left-[11px] top-[18px] size-4 -translate-y-1/2 text-text-faint" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showRecent || showResults}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        className={cn(
          "h-9 w-full rounded-btn border bg-surface pl-9 pr-[74px] type-body text-text placeholder:text-text-faint focus:outline-none",
          open ? "border-accent shadow-focus" : "border-input-border focus:border-accent focus:shadow-focus",
        )}
      />
      <span className="absolute right-1.5 top-[18px] flex -translate-y-1/2 items-center gap-1">
        {loading && <Spinner tone="soft" className="size-3.5" />}
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            className="flex size-6 items-center justify-center rounded-btn text-text-faint hover:text-text"
          >
            <XIcon className="size-3" />
          </button>
        )}
        {!value && shortcut && (
          <Kbd className="bg-surface-2">{shortcut}</Kbd>
        )}
      </span>

      {(showRecent || showResults) && (
        <ScrollArea id={listId} role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-40 max-h-[260px] rounded-sm border border-border bg-surface shadow">
          {showRecent && (
            <>
              <OptionGroupLabel>Recent</OptionGroupLabel>
              {recent.map((r) => (
                <OptionRow key={r.id} leading={<ClockIcon />} label={r.label} sub={r.sub} onSelect={() => pick(r)} />
              ))}
            </>
          )}
          {showResults && (
            <>
              {results.length === 0 ? (
                <OptionEmpty>{emptyText}</OptionEmpty>
              ) : (
                <>
                  <OptionGroupLabel>Results</OptionGroupLabel>
                  {results.map((r) => (
                    <OptionRow key={r.id} leading={r.avatar} label={<Highlight text={r.label} query={query} />} sub={r.sub} right={r.right} onSelect={() => pick(r)} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
