"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { useKeepInView } from "../../lib/use-keep-in-view";
import { DateTrigger } from "./date-trigger";
import { Button } from "./button";

/** Inclusive date range as ISO `YYYY-MM-DD` strings. `end` is null while the user is still picking it. */
export interface DateRange {
  start: string | null;
  end: string | null;
}

export interface DateRangePickerProps {
  value: DateRange;
  onValueChange: (range: DateRange) => void;
  /** Shown in the trigger while no range is applied. */
  placeholder?: string;
  /** ISO date treated as "today" — highlights it and anchors the presets. Defaults to the real today. */
  today?: string;
  /** Which edge of the trigger the panel lines up with. The guideline opens it from the left; use `"end"` when the picker sits near the right edge of the screen (the Filters panel does). */
  align?: "start" | "end";
  id?: string;
  className?: string;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => new Date(`${s}T00:00:00`);
const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
/** "Nov 2" / "Nov 2, 2026". */
export const formatDate = (s: string, withYear = false) => {
  const d = parse(s);
  const short = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return withYear ? `${short}, ${d.getFullYear()}` : short;
};
const monthStart = (s: string) => `${s.slice(0, 7)}-01`;
const shiftMonth = (s: string, n: number) => {
  const d = parse(s);
  d.setMonth(d.getMonth() + n, 1);
  return iso(d);
};

/** Format a range the way the guideline's trigger and applied-filter chips do ("Nov 2 – Nov 8, 2026"). */
export function formatDateRange(range: DateRange, withYear = true): string {
  const { start, end } = range;
  if (start && end) return `${formatDate(start)} – ${formatDate(end, withYear)}`;
  if (start) return `${formatDate(start, withYear)} – …`;
  return "";
}

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7", label: "Next 7 days" },
  { key: "month", label: "This month" },
  { key: "30", label: "Next 30 days" },
] as const;

/**
 * `.drp` — range picker. A date-trigger opens a panel with presets on the left, a month grid
 * on the right and a "range · N days / Clear / Apply" footer. Like the guideline, picks update
 * `value` live; Apply only closes the panel (and stays disabled until a full range is chosen).
 */
export function DateRangePicker({ value, onValueChange, placeholder = "Select a range", today, align = "start", id, className }: DateRangePickerProps) {
  const todayIso = today ?? iso(new Date());
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<string | null>(null);
  const [month, setMonth] = useState(monthStart(value.start ?? todayIso));
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useKeepInView(panelRef, open);

  function openPanel() {
    setPreset(null);
    setMonth(monthStart(value.start ?? todayIso));
    setOpen(true);
  }

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

  function pick(day: string) {
    setPreset(null);
    const { start, end } = value;
    if (!start || end) onValueChange({ start: day, end: null });
    else if (day < start) onValueChange({ start: day, end: null });
    else onValueChange({ start, end: day });
  }

  function applyPreset(key: (typeof PRESETS)[number]["key"]) {
    let start = todayIso;
    let end = todayIso;
    if (key === "7") end = addDays(start, 6);
    else if (key === "30") end = addDays(start, 29);
    else if (key === "month") {
      start = monthStart(todayIso);
      end = addDays(shiftMonth(start, 1), -1);
    }
    setPreset(key);
    onValueChange({ start, end });
    setMonth(monthStart(start));
  }

  const first = parse(month);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const blanks = first.getDay();
  const complete = !!(value.start && value.end);
  const days = value.start && value.end ? Math.round((parse(value.end).getTime() - parse(value.start).getTime()) / 864e5) + 1 : 0;
  const hasValue = !!value.start;

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <DateTrigger
        id={id}
        open={open}
        empty={!hasValue}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (open) setOpen(false);
            else openPanel();
          }
        }}
      >
        {hasValue ? formatDateRange(value) : placeholder}
      </DateTrigger>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Choose a date range"
          className={cn("absolute top-[calc(100%+6px)] z-40 flex w-max max-w-[calc(100vw-32px)] flex-col rounded-popover border border-border bg-surface shadow", align === "end" ? "right-0" : "left-0")}
        >
          {/* Phones: open rightwards from the field (never off the left edge) and, under 480px, stack the presets above the calendar so the panel is one 242px column. */}
          <div className="flex max-[480px]:flex-col">
            <div className="flex w-[136px] flex-none flex-col gap-px border-r border-border px-1.5 py-2 max-[480px]:w-0 max-[480px]:min-w-full max-[480px]:flex-row max-[480px]:flex-wrap max-[480px]:border-b max-[480px]:border-r-0">
              {PRESETS.map((p) => (
                <div
                  key={p.key}
                  role="option"
                  tabIndex={0}
                  aria-selected={preset === p.key}
                  onClick={() => applyPreset(p.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      applyPreset(p.key);
                    }
                  }}
                  className={cn(
                    "cursor-pointer rounded-btn px-2.5 py-[7px] text-[12.5px] text-text hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2",
                    preset === p.key && "bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))] font-semibold text-accent-text",
                  )}
                >
                  {p.label}
                </div>
              ))}
            </div>
            <div className="w-[210px] flex-none box-content px-4 py-3.5">
              <div className="mb-2 flex items-center justify-between text-[12.5px] font-bold">
                <button type="button" aria-label="Previous" onClick={() => setMonth(shiftMonth(month, -1))} className="px-1 py-0.5 text-[16px] leading-none text-text-faint">
                  ‹
                </button>
                <span>{first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                <button type="button" aria-label="Next" onClick={() => setMonth(shiftMonth(month, 1))} className="px-1 py-0.5 text-[16px] leading-none text-text-faint">
                  ›
                </button>
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-center text-[11px] font-semibold text-text-faint">
                    {d}
                  </div>
                ))}
                {Array.from({ length: blanks }, (_, i) => (
                  <div key={`b${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = addDays(month, i);
                  const col = (blanks + i) % 7;
                  const isStart = day === value.start;
                  const isEnd = day === value.end;
                  const inRange = !!(value.start && value.end && day > value.start && day < value.end);
                  return (
                    <div
                      key={day}
                      role="button"
                      tabIndex={0}
                      onClick={() => pick(day)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          pick(day);
                        }
                      }}
                      className={cn(
                        "flex h-[30px] cursor-pointer items-center justify-center rounded-cell text-[12px] text-text hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2",
                        inRange && "rounded-none bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))]",
                        inRange && col === 0 && "rounded-l-cell",
                        inRange && col === 6 && "rounded-r-cell",
                        (isStart || isEnd) && "bg-accent-fill font-bold text-white hover:bg-accent-fill",
                        isStart && !isEnd && !!value.end && (col === 6 ? "rounded-cell" : "rounded-r-none"),
                        isEnd && !isStart && (col === 0 ? "rounded-cell" : "rounded-l-none"),
                        day === todayIso && !isStart && !isEnd && "shadow-today",
                      )}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-3.5 py-2.5 text-[12.5px] text-text-soft">
            <span className="mr-auto min-w-0 tabular-nums">
              {complete ? (
                <>
                  <b className="font-semibold text-text">{formatDateRange(value)}</b> · {days} {days === 1 ? "day" : "days"}
                </>
              ) : value.start ? (
                "Pick an end date"
              ) : (
                "No dates selected"
              )}
            </span>
            <Button
              variant="secondary"
              className="h-[30px] px-2.5 py-1 text-[12.5px]"
              onClick={() => {
                onValueChange({ start: null, end: null });
                setPreset(null);
              }}
            >
              Clear
            </Button>
            <Button
              className="h-[30px] px-2.5 py-1 text-[12.5px]"
              disabled={!complete}
              onClick={() => setOpen(false)}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
