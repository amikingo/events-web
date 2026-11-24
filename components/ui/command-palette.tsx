"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CloseButton } from "./close-button";
import { SearchIcon } from "./icons";

export interface CommandItem {
  id: string;
  title: string;
  /** Muted line under the title. */
  sub?: string;
  /** The group tag on the right ("Navigation", "Actions"). */
  group?: string;
  /** A 14px icon on the 26px tile. */
  icon?: ReactNode;
  /** Extra words that match the search but aren't shown ("dashboard overview home"). */
  keywords?: string;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  onSelect: (item: CommandItem) => void;
  placeholder?: string;
  /** Open on ⌘K / Ctrl+K from anywhere. Default true. */
  hotkey?: boolean;
  /** `viewport` (default) covers the screen; `parent` fills the nearest positioned ancestor (a demo stage). */
  container?: "viewport" | "parent";
}

/**
 * `.cmdk-panel` — the ⌘K command palette: search box, a list that filters as you type (title, sub-line and keywords),
 * ↑ ↓ to move, Enter to run, Esc or a backdrop click to close.
 */
export function CommandPalette({ open, onOpenChange, items, onSelect, placeholder = "Search sections, actions…", hotkey = true, container = "viewport" }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => !q || `${it.keywords ?? ""} ${it.title} ${it.sub ?? ""} ${it.group ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    if (!hotkey) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hotkey, open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setIndex(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  function run(item: CommandItem | undefined) {
    if (!item) return;
    onOpenChange(false);
    onSelect(item);
  }

  const panel = (
    <div className={cn("z-[100] flex items-start justify-center px-4 pb-4 pt-10", container === "viewport" ? "fixed inset-0" : "absolute inset-0")}>
      <div className="absolute inset-0 bg-overlay backdrop-blur-[2px]" onClick={() => onOpenChange(false)} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="relative z-[1] flex w-full max-w-[520px] flex-col overflow-hidden rounded-md border border-border bg-surface shadow-modal">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
          <SearchIcon className="size-[17px] flex-none text-text-faint" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex(Math.min(results.length - 1, index + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex(Math.max(0, index - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                run(results[index]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onOpenChange(false);
              }
            }}
            className="flex-1 border-none bg-transparent type-body text-text placeholder:text-text-faint focus:outline-none"
          />
          <CloseButton aria-label="Close" onClick={() => onOpenChange(false)} />
        </div>
        <div id="cmdk-list" role="listbox" ref={listRef} className="flex max-h-80 flex-col gap-px overflow-y-auto p-1.5">
          {results.map((it, i) => {
            const selected = i === index;
            return (
              <div
                key={it.id}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setIndex(i)}
                onClick={() => run(it)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2.5 py-[9px]",
                  selected ? "bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] text-accent-text" : "text-text",
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-[26px] flex-none items-center justify-center rounded-cell bg-surface-2 text-text-soft [&_svg]:size-3.5">{it.icon}</span>
                  <span className="min-w-0">
                    <span className={cn("block overflow-hidden text-ellipsis whitespace-nowrap text-[13px]", selected ? "font-semibold text-accent" : "font-medium")}>{it.title}</span>
                    {it.sub && <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-text-faint">{it.sub}</span>}
                  </span>
                </span>
                {it.group && <span className="flex-none rounded-check bg-surface-2 px-[7px] py-[3px] text-[11px] font-bold uppercase tracking-[0.4px] text-text-faint">{it.group}</span>}
              </div>
            );
          })}
          {results.length === 0 && <div className="px-4 py-7 text-center text-[12.5px] text-text-faint">No results found</div>}
        </div>
        <div className="flex items-center justify-between gap-2.5 border-t border-border bg-surface-2 px-4 py-2 text-[11px] text-text-faint">
          <span>Navigate with ↑ and ↓, Enter to select</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
  return container === "viewport" && typeof document !== "undefined" ? createPortal(panel, document.body) : panel;
}
