"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { useKeepInView } from "../../lib/use-keep-in-view";
import { DateTrigger } from "./date-trigger";
import { Input } from "./input";
import { usePrefersNativePickers } from "../../lib/use-media";
import { SegmentedControl } from "./segmented-control";
import {
  ETH_MONTHS,
  GREG_MONTHS,
  ethMonthLength,
  ethiopianToJDN,
  formatJDN,
  gregorianToJDN,
  isoToJDN,
  jdnToEthiopian,
  jdnToGregorian,
  jdnToIso,
  weekdayOfJDN,
} from "../../lib/calendar";
import type { CalendarSystem } from "../../lib/calendar";

export interface DatePickerProps {
  /** Selected date as ISO `YYYY-MM-DD` (always Gregorian — the calendar toggle only changes how it's shown), or `""`. */
  value: string;
  onValueChange: (iso: string) => void;
  placeholder?: string;
  /**
   * Calendars on offer. `["gc"]` (default) is Gregorian-only — ERP and partner-facing admin screens.
   * `["gc", "ec"]` adds the Gregorian / Ethiopian toggle for SuperApp, POS and government-facing screens.
   */
  calendars?: CalendarSystem[];
  /** ISO date treated as today (highlight). Defaults to the real today. */
  today?: string;
  /**
   * Use the device's native date picker (`<input type="date">`) instead of the panel. `"auto"` (default) does so on
   * touch-first devices — the guideline's mobile rule — unless the Ethiopian calendar is on offer, which native pickers
   * can't show. `true` / `false` force it either way.
   */
  native?: boolean | "auto";
  /** Earliest / latest selectable ISO date (native picker only). */
  min?: string;
  max?: string;
  id?: string;
  className?: string;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface Cell {
  label: number;
  jdn: number;
  muted?: boolean;
}

/**
 * `.date-trigger` + `.date-panel` — one date. Gregorian by default; with `calendars={["gc","ec"]} ` a toggle
 * re-reads the same underlying day in the Ethiopian calendar (13 months, Pagume short). Selection never moves
 * when you switch — only the labels do.
 */
export function DatePicker({ value, onValueChange, placeholder = "Pick a date", calendars = ["gc"], today, native = "auto", min, max, id, className }: DatePickerProps) {
  const touch = usePrefersNativePickers();
  const useNative = native === "auto" ? touch && !calendars.includes("ec") : native;
  const [open, setOpen] = useState(false);
  const [cal, setCal] = useState<CalendarSystem>("gc");
  const todayJdn = isoToJDN(today ?? todayIso());
  const selectedJdn = value ? isoToJDN(value) : null;
  const [focusedJdn, setFocusedJdn] = useState(selectedJdn ?? todayJdn);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useKeepInView(panelRef, open);

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

  function toggleOpen() {
    if (!open) setFocusedJdn(selectedJdn ?? todayJdn);
    setOpen(!open);
  }

  let monthLabel: string;
  const cells: (Cell | null)[] = [];
  if (cal === "ec") {
    const fe = jdnToEthiopian(focusedJdn);
    monthLabel = `${ETH_MONTHS[fe.month - 1]} ${fe.year}`;
    const first = ethiopianToJDN(fe.year, fe.month, 1);
    for (let i = 0; i < weekdayOfJDN(first); i++) cells.push(null);
    for (let d = 1; d <= ethMonthLength(fe.year, fe.month); d++) cells.push({ label: d, jdn: first + d - 1 });
  } else {
    const fg = jdnToGregorian(focusedJdn);
    monthLabel = `${GREG_MONTHS[fg.month - 1]} ${fg.year}`;
    const first = gregorianToJDN(fg.year, fg.month, 1);
    const lead = weekdayOfJDN(first);
    const daysInMonth = jdnToGregorian(gregorianToJDN(fg.month === 12 ? fg.year + 1 : fg.year, fg.month === 12 ? 1 : fg.month + 1, 1) - 1).day;
    const prevDays = jdnToGregorian(first - 1).day;
    for (let i = 0; i < lead; i++) cells.push({ label: prevDays - lead + i + 1, jdn: first - lead + i, muted: true });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ label: d, jdn: first + d - 1 });
  }

  function shiftMonth(dir: 1 | -1) {
    if (cal === "ec") {
      const fe = jdnToEthiopian(focusedJdn);
      let nm = fe.month + dir;
      let ny = fe.year;
      if (nm < 1) {
        nm = 13;
        ny--;
      } else if (nm > 13) {
        nm = 1;
        ny++;
      }
      setFocusedJdn(ethiopianToJDN(ny, nm, 1));
    } else {
      const fg = jdnToGregorian(focusedJdn);
      let nm = fg.month + dir;
      let ny = fg.year;
      if (nm < 1) {
        nm = 12;
        ny--;
      } else if (nm > 12) {
        nm = 1;
        ny++;
      }
      setFocusedJdn(gregorianToJDN(ny, nm, 1));
    }
  }

  if (useNative) {
    return (
      <Input
        id={id}
        type="date"
        aria-label={placeholder}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(!value && "text-text-faint", className)}
      />
    );
  }

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <DateTrigger
        id={id}
        open={open}
        empty={selectedJdn === null}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleOpen();
          }
        }}
      >
        {selectedJdn === null ? placeholder : formatJDN(selectedJdn, cal)}
      </DateTrigger>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Choose a date"
          className="absolute left-0 top-[calc(100%+6px)] z-40 w-[260px] max-w-[calc(100vw-32px)] rounded-popover border border-border bg-surface p-3.5 shadow"
        >
          {calendars.length > 1 && (
            <SegmentedControl
              size="sm"
              aria-label="Calendar system"
              className="mb-2.5"
              value={cal}
              onValueChange={(v) => setCal(v as CalendarSystem)}
              options={calendars.map((c) => ({ value: c, label: c === "gc" ? "Gregorian" : "Ethiopian" }))}
            />
          )}
          <div className="mb-2.5 flex items-center justify-between text-[12.5px] font-bold">
            <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} className="p-0.5 text-[13px] leading-none text-text-faint">
              ‹
            </button>
            <span>{monthLabel}</span>
            <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} className="p-0.5 text-[13px] leading-none text-text-faint">
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-semibold text-text-faint">
                {d}
              </div>
            ))}
            {cells.map((c, i) =>
              !c ? (
                <div key={`b${i}`} />
              ) : (
                <div
                  key={c.jdn}
                  role="button"
                  tabIndex={c.muted ? -1 : 0}
                  aria-disabled={c.muted || undefined}
                  onClick={() => {
                    if (c.muted) return;
                    onValueChange(jdnToIso(c.jdn));
                    setFocusedJdn(c.jdn);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (!c.muted && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onValueChange(jdnToIso(c.jdn));
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "flex aspect-square cursor-pointer items-center justify-center rounded-cell text-[12px] text-text hover:bg-surface-2",
                    c.muted && "cursor-default opacity-50 text-text-faint",
                    c.jdn === selectedJdn && !c.muted && "bg-accent-fill font-bold text-white hover:bg-accent-fill",
                    c.jdn === todayJdn && !c.muted && c.jdn !== selectedJdn && "shadow-today",
                  )}
                >
                  {c.label}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
