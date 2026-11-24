"use client";

import { cn } from "../../lib/utils";
import { usePrefersNativePickers } from "../../lib/use-media";
import { DatePicker } from "./date-picker";
import type { DatePickerProps } from "./date-picker";
import { Input } from "./input";

export interface DateTimePickerProps extends Omit<DatePickerProps, "value" | "onValueChange" | "native" | "min" | "max"> {
  /** ISO local date-time `YYYY-MM-DDTHH:mm`, or `""`. */
  value: string;
  onValueChange: (value: string) => void;
  native?: boolean | "auto";
  min?: string;
  max?: string;
}

/**
 * The guideline's one combined "Date & time picker". On touch devices it's the native `datetime-local` picker
 * (RNDateTimePicker on mobile); elsewhere it pairs the date panel with a time field.
 */
export function DateTimePicker({ value, onValueChange, native = "auto", min, max, id, className, ...props }: DateTimePickerProps) {
  const touch = usePrefersNativePickers();
  const useNative = native === "auto" ? touch : native;
  const [date = "", time = ""] = value.split("T");

  if (useNative) {
    return <Input id={id} type="datetime-local" aria-label="Date and time" value={value} min={min} max={max} onChange={(e) => onValueChange(e.target.value)} className={cn(!value && "text-text-faint", className)} />;
  }
  return (
    <div className={cn("grid grid-cols-[1fr_120px] gap-2", className)}>
      <DatePicker {...props} id={id} native={false} value={date} onValueChange={(d) => onValueChange(d ? `${d}T${time || "09:00"}` : "")} />
      <Input type="time" aria-label="Time" value={time} disabled={!date} onChange={(e) => onValueChange(`${date}T${e.target.value}`)} />
    </div>
  );
}
