"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { Chip } from "./chip";
import { Field } from "./field";
import { Input } from "./input";
import { MultiSelect } from "./multi-select";
import type { MultiSelectOption } from "./multi-select";
import { DateRangePicker, formatDate, formatDateRange } from "./date-range-picker";
import type { DateRange } from "./date-range-picker";
import { XIcon } from "./icons";
import { TextLink } from "./text-link";

export type { DateRange } from "./date-range-picker";

export interface NumberRange {
  min: number | null;
  max: number | null;
}

interface FilterBase<T> {
  /** Unique key; also the key of this filter's entry in `FilterValues`. */
  key: string;
  label: string;
  /** Reads the value this filter tests off a row. */
  getValue: (row: T) => string | number;
}

/** `.ms` multi-select — a row matches when its value is one of the selected options (or nothing is selected). */
export interface MultiSelectFilter<T> extends FilterBase<T> {
  type: "multiselect";
  options: MultiSelectOption[];
  placeholder?: string;
  getValue: (row: T) => string;
}

/** `.drp` date range — `getValue` returns an ISO `YYYY-MM-DD` date. */
export interface DateRangeFilter<T> extends FilterBase<T> {
  type: "daterange";
  placeholder?: string;
  /** ISO date treated as today (highlight + presets). Defaults to the real today. */
  today?: string;
  getValue: (row: T) => string;
}

/** `.flt-amt` min – max pair of number inputs. */
export interface NumberRangeFilter<T> extends FilterBase<T> {
  type: "numberrange";
  /** Appended to the applied chip ("1000–5000 ETB") and put in the label. */
  unit?: string;
  getValue: (row: T) => number;
}

export type FilterField<T> = MultiSelectFilter<T> | DateRangeFilter<T> | NumberRangeFilter<T>;
export type FilterValue = string[] | DateRange | NumberRange;
export type FilterValues = Record<string, FilterValue>;

/** A named combination of search + quick filter + panel filters, shown as a chip at the top of the Filters panel. */
export interface SavedView {
  id: string;
  label: string;
  filters: FilterValues;
  search?: string;
  quickFilter?: string;
}

export function emptyValue<T>(field: FilterField<T>): FilterValue {
  if (field.type === "multiselect") return [];
  if (field.type === "daterange") return { start: null, end: null };
  return { min: null, max: null };
}

export function emptyFilters<T>(fields: FilterField<T>[]): FilterValues {
  return Object.fromEntries(fields.map((f) => [f.key, emptyValue(f)]));
}

/** Fills in an empty value for every field missing from `values` (e.g. a view that only sets one filter). */
export function normalizeFilters<T>(fields: FilterField<T>[], values: FilterValues): FilterValues {
  return Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? emptyValue(f)]));
}

function isActive<T>(field: FilterField<T>, value: FilterValue | undefined): boolean {
  if (!value) return false;
  if (field.type === "multiselect") return (value as string[]).length > 0;
  if (field.type === "daterange") return !!(value as DateRange).start;
  const r = value as NumberRange;
  return r.min != null || r.max != null;
}

export function countActive<T>(fields: FilterField<T>[], values: FilterValues): number {
  return fields.filter((f) => isActive(f, values[f.key])).length;
}

export function matchesFilters<T>(row: T, fields: FilterField<T>[], values: FilterValues): boolean {
  return fields.every((field) => {
    const value = values[field.key];
    if (!isActive(field, value)) return true;
    if (field.type === "multiselect") return (value as string[]).includes(field.getValue(row));
    if (field.type === "daterange") {
      const d = field.getValue(row);
      const { start, end } = value as DateRange;
      return (!start || d >= start) && (!end || d <= end);
    }
    const n = field.getValue(row);
    const { min, max } = value as NumberRange;
    return (min == null || n >= min) && (max == null || n <= max);
  });
}

export interface AppliedChip {
  id: string;
  label: string;
  /** Returns `values` with just this chip's filter (or this one option of a multiselect) cleared. */
  remove: (values: FilterValues) => FilterValues;
}

/** One chip per applied multiselect option, and one each for an applied date range / number range. */
export function appliedChips<T>(fields: FilterField<T>[], values: FilterValues): AppliedChip[] {
  const chips: AppliedChip[] = [];
  for (const field of fields) {
    const value = values[field.key];
    if (!isActive(field, value)) continue;
    if (field.type === "multiselect") {
      for (const v of value as string[]) {
        chips.push({
          id: `${field.key}:${v}`,
          label: field.options.find((o) => o.value === v)?.label ?? v,
          remove: (cur) => ({ ...cur, [field.key]: (cur[field.key] as string[]).filter((x) => x !== v) }),
        });
      }
    } else if (field.type === "daterange") {
      const range = value as DateRange;
      chips.push({
        id: field.key,
        label: range.end && range.end !== range.start ? formatDateRange(range, false) : formatDate(range.start!),
        remove: (cur) => ({ ...cur, [field.key]: { start: null, end: null } }),
      });
    } else {
      const { min, max } = value as NumberRange;
      const text = min != null && max != null ? `${min}–${max}` : min != null ? `≥${min}` : `≤${max}`;
      chips.push({
        id: field.key,
        label: `${text}${field.unit ? ` ${field.unit}` : ""}`,
        remove: (cur) => ({ ...cur, [field.key]: { min: null, max: null } }),
      });
    }
  }
  return chips;
}

export interface FilterPanelProps<T> {
  fields: FilterField<T>[];
  draft: FilterValues;
  onDraftChange: (values: FilterValues) => void;
  views: SavedView[];
  activeViewId: string;
  onApplyView: (id: string) => void;
  onSaveView: (name: string) => void;
  onReset: () => void;
  onApply: () => void;
}

/**
 * `.flt-panel` body — saved views, then one field per filter, then the Reset / Apply footer
 * (`.mdl-foot`). Edits stay in `draft` until Apply, like the guideline ("everything else waits
 * for a deliberate action").
 */
export function FilterPanel<T>({ fields, draft, onDraftChange, views, activeViewId, onApplyView, onSaveView, onReset, onApply }: FilterPanelProps<T>) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  function confirmSave() {
    onSaveView(name.trim());
    setName("");
    setNaming(false);
  }

  return (
    <>
      <div className="flex flex-col gap-3.5 px-4 py-3.5">
        <Field label="Saved views">
          <div className="flex flex-wrap items-center gap-2">
            {views.map((view) => (
              <Chip key={view.id} selected={view.id === activeViewId} onClick={() => onApplyView(view.id)}>
                {view.label}
              </Chip>
            ))}
          </div>
          {naming ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                aria-label="Name this view"
                placeholder="Name this view"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmSave();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    setNaming(false);
                  }
                }}
                className="h-8"
              />
              <Button className="h-8 px-3" onClick={confirmSave}>
                Save
              </Button>
              <Button variant="secondary" iconOnly aria-label="Cancel" className="size-8" onClick={() => setNaming(false)}>
                <XIcon className="size-3.5" />
              </Button>
            </div>
          ) : (
            <TextLink className="self-start" onClick={() => setNaming(true)}>
              + Save current as view
            </TextLink>
          )}
        </Field>

        {fields.map((field) => {
          const id = `flt-${field.key}`;
          if (field.type === "multiselect") {
            return (
              <Field key={field.key} label={field.label} htmlFor={id}>
                <MultiSelect
                  id={id}
                  options={field.options}
                  placeholder={field.placeholder ?? `Any ${field.label.toLowerCase()}`}
                  value={(draft[field.key] as string[] | undefined) ?? []}
                  onValueChange={(v) => onDraftChange({ ...draft, [field.key]: v })}
                />
              </Field>
            );
          }
          if (field.type === "daterange") {
            return (
              <Field key={field.key} label={field.label} htmlFor={id}>
                <DateRangePicker
                  id={id}
                  align="end"
                  today={field.today}
                  placeholder={field.placeholder ?? "Any date"}
                  value={(draft[field.key] as DateRange | undefined) ?? { start: null, end: null }}
                  onValueChange={(v) => onDraftChange({ ...draft, [field.key]: v })}
                />
              </Field>
            );
          }
          const range = (draft[field.key] as NumberRange | undefined) ?? { min: null, max: null };
          const set = (patch: Partial<NumberRange>) => onDraftChange({ ...draft, [field.key]: { ...range, ...patch } });
          const parse = (s: string) => (s === "" ? null : Number(s));
          return (
            <Field key={field.key} label={field.unit ? `${field.label} (${field.unit})` : field.label} htmlFor={id}>
              <div className="flex items-center gap-2">
                <Input id={id} type="number" min={0} placeholder="Min" value={range.min ?? ""} onChange={(e) => set({ min: parse(e.target.value) })} className="w-0 flex-1" />
                <span className="flex-none text-[12.5px] text-text-faint">–</span>
                <Input aria-label={`${field.label} max`} type="number" min={0} placeholder="Max" value={range.max ?? ""} onChange={(e) => set({ max: parse(e.target.value) })} className="w-0 flex-1" />
              </div>
            </Field>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2.5 rounded-b-sm border-t border-border bg-surface px-5 py-3.5">
        <Button variant="secondary" onClick={onReset}>
          Reset
        </Button>
        <Button onClick={onApply}>Apply</Button>
      </div>
    </>
  );
}

/** The column facts `inferFilters` reads (a subset of the table's `ColumnDef`). */
export interface InferableColumn<T> {
  key: string;
  header: ReactNode;
  accessor?: (row: T) => ReactNode;
  /** The raw value to filter on, for columns whose accessor returns a pill or other element. */
  filterValue?: (row: T) => string | number;
  /** `false` keeps the column out of the Filters panel. */
  filter?: false;
  primary?: boolean;
  /** A right-aligned figures column: never offered as a list of text values. */
  numeric?: boolean;
}

const MAX_OPTIONS = 8;

/**
 * The Filters panel a table offers when you don't describe one: a multi-select for every column with 2–8 distinct text
 * values, a date range for ISO-date columns, a min–max pair for number columns. The first (primary) column — the row's
 * name — is left out, as are columns that return elements (give those a `filterValue`).
 */
export function inferFilters<T>(columns: InferableColumn<T>[], data: T[]): FilterField<T>[] {
  if (data.length === 0) return [];
  const fields: FilterField<T>[] = [];
  for (const c of columns) {
    if (c.filter === false || c.primary) continue;
    const read = (row: T) => (c.filterValue ? c.filterValue(row) : c.accessor?.(row));
    const values = data.map(read);
    const label = typeof c.header === "string" ? c.header : c.key;
    if (values.every((v) => typeof v === "number" && Number.isFinite(v))) {
      fields.push({ type: "numberrange", key: c.key, label, getValue: (row) => read(row) as number });
    } else if (values.every((v) => typeof v === "string" && v !== "")) {
      const strings = values as string[];
      if (strings.every((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))) {
        fields.push({ type: "daterange", key: c.key, label, getValue: (row) => read(row) as string });
        continue;
      }
      // Formatted figures ("58,300", "2,550 ETB") are not categories; give the column a numeric `filterValue` to filter it by range.
      if (c.numeric || strings.every((v) => /^[\d.,\s]+[A-Za-z]{0,4}$/.test(v))) continue;
      const distinct = [...new Set(strings)].sort((a, b) => a.localeCompare(b));
      if (distinct.length >= 2 && distinct.length <= MAX_OPTIONS) {
        fields.push({ type: "multiselect", key: c.key, label, placeholder: `Any ${label.toLowerCase()}`, options: distinct.map((v) => ({ label: v, value: v })), getValue: (row) => read(row) as string });
      }
    }
  }
  return fields;
}
