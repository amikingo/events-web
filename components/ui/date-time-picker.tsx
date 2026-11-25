"use client";

import { cn } from "../../lib/utils";
import { usePrefersNativePickers } from "../../lib/use-media";
import { DatePicker } from "./date-picker";
import type { DatePickerProps } from "./date-picker";
import { Select } from "./select";

export interface DateTimePickerProps extends Omit<DatePickerProps, "value" | "onValueChange" | "native" | "min" | "max"> {
  /** ISO local date-time `YYYY-MM-DDTHH:mm`, or `""`. */
  value: string;
  onValueChange: (value: string) => void;
  native?: boolean | "auto";
  /** Earliest / latest selectable date part (native date picker only). */
  min?: string;
  max?: string;
}

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

/** "14:05" → { hour: "2", minute: "05", period: "PM" }; empty when there is no time yet. */
function toTwelveHour(time: string): { hour: string; minute: string; period: "AM" | "PM" | "" } {
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return { hour: "", minute: "", period: "" };
  const hours = Number(match[1]);
  return { hour: String(hours % 12 === 0 ? 12 : hours % 12), minute: match[2] ?? "00", period: hours < 12 ? "AM" : "PM" };
}

/** { hour: "2", minute: "05", period: "PM" } → "14:05". */
function toTwentyFourHour(hour: string, minute: string, period: "AM" | "PM"): string {
  const base = Number(hour) % 12;
  return `${String(period === "PM" ? base + 12 : base).padStart(2, "0")}:${minute}`;
}

/**
 * The guideline's one combined "Date & time picker": the date (panel, or the device's native date picker on touch
 * devices) plus a time chosen as hour, minute and AM/PM. Times are always shown in 12-hour form, never by the
 * browser's own time box (which follows the device locale and can show 24-hour time). The value stays
 * `YYYY-MM-DDTHH:mm`.
 */
export function DateTimePicker({ value, onValueChange, native = "auto", min, max, id, className, ...props }: DateTimePickerProps) {
  const touch = usePrefersNativePickers();
  const useNative = native === "auto" ? touch : native;
  const [date = "", time = ""] = value.split("T");
  const current = toTwelveHour(time);
  // A stored minute that isn't on the 5-minute grid stays selectable.
  const minutes = current.minute && !MINUTES.includes(current.minute) ? [...MINUTES, current.minute].sort() : MINUTES;

  const setTime = (next: Partial<{ hour: string; minute: string; period: "AM" | "PM" }>) => {
    const hour = next.hour ?? (current.hour || "9");
    const minute = next.minute ?? (current.minute || "00");
    const period = next.period ?? (current.period || "AM");
    onValueChange(`${date}T${toTwentyFourHour(hour, minute, period)}`);
  };

  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]", className)}>
      <DatePicker
        {...props}
        id={id}
        native={useNative}
        min={min?.split("T")[0]}
        max={max?.split("T")[0]}
        value={date}
        onValueChange={(d) => onValueChange(d ? `${d}T${time || "09:00"}` : "")}
      />
      <div className="flex gap-1" role="group" aria-label="Time">
        <Select
          className="w-[72px]"
          options={HOURS.map((hour) => ({ label: hour, value: hour }))}
          value={current.hour}
          placeholder="Hour"
          disabled={!date}
          onValueChange={(hour) => setTime({ hour })}
        />
        <Select
          className="w-[72px]"
          options={minutes.map((minute) => ({ label: minute, value: minute }))}
          value={current.minute}
          placeholder="Min"
          disabled={!date}
          onValueChange={(minute) => setTime({ minute })}
        />
        <Select
          className="w-[76px]"
          options={[
            { label: "AM", value: "AM" },
            { label: "PM", value: "PM" },
          ]}
          value={current.period}
          placeholder="AM"
          disabled={!date}
          onValueChange={(period) => setTime({ period: period === "PM" ? "PM" : "AM" })}
        />
      </div>
    </div>
  );
}
