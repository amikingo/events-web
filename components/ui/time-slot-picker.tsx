"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface TimeSlot {
  /** The value passed to `onValueChange` ("2:30 PM"). */
  value: string;
  /** What the slot shows ("2:30" or "7:30 AM"). */
  label: string;
  /** A second line inside the slot ("5 seats", "Full"). */
  caption?: string;
  /** Taken — struck through and not selectable. */
  off?: boolean;
}

export interface TimeSlotGroup {
  /** "Morning", "Afternoon", "Departures". Omit when a surrounding `<Field label>` already names the slots (the checkout form). */
  label?: string;
  /** Text after the label — a count or route; defaults to "· N free". Pass `null` for none. */
  note?: ReactNode | null;
  slots: TimeSlot[];
}

export interface TimeSlotPickerProps {
  groups: TimeSlotGroup[];
  value: string;
  onValueChange: (value: string) => void;
  /** Summary row under the groups: the booking description on the left, the chosen time on the right. */
  summary?: ReactNode;
  /** Fixed number of columns (checkout uses 4); default is auto-fill at 78px minimum. */
  columns?: number;
  className?: string;
}

/**
 * `.slots-wrap` — slot chips grouped by part of the day (or by departure), one selection, taken slots struck
 * through, and a summary row that confirms the choice.
 */
export function TimeSlotPicker({ groups, value, onValueChange, summary, columns, className }: TimeSlotPickerProps) {
  return (
    <div role="radiogroup" className={cn("flex w-full flex-col gap-3.5", className)}>
      {groups.map((g, i) => {
        const free = g.slots.filter((s) => !s.off).length;
        return (
          <div key={g.label ?? i}>
            {g.label && (
            <div className="mb-2 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.8px] text-text-faint">
              {g.label}
              {g.note !== null && <span className="font-medium normal-case tracking-normal text-text-faint">{g.note ?? `· ${free} free`}</span>}
            </div>
            )}
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: columns ? `repeat(${columns}, 1fr)` : "repeat(auto-fill, minmax(78px, 1fr))" }}
            >
              {g.slots.map((s) => {
                const selected = s.value === value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={s.off}
                    onClick={() => onValueChange(s.value)}
                    className={cn(
                      "select-none rounded-btn border-[1.5px] px-1.5 py-[7px] text-center text-[12.5px] font-medium tabular-nums transition-[border-color,background-color,color]",
                      selected
                        ? "border-accent-fill bg-accent-fill font-semibold text-white"
                        : s.off
                          ? "cursor-not-allowed border-border bg-surface-2 text-text-faint line-through"
                          : "border-border-strong bg-surface text-text hover:border-accent hover:text-accent",
                    )}
                  >
                    {s.label}
                    {s.caption && <small className="block text-[11px] font-medium no-underline opacity-75">{s.caption}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {summary && value && (
        <div className="flex items-center justify-between gap-2.5 rounded-sm bg-surface-2 px-3 py-2.5 text-[12.5px] text-text-soft">
          <span>{summary}</span>
          <b className="font-semibold text-text">{value}</b>
        </div>
      )}
    </div>
  );
}
