"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Field } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { InputAddon, InputGroup } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { TextLink } from "@/components/ui/text-link";
import type { PriceWindow, TicketTypeInput } from "@/lib/api/events";
import { formatMomentShort } from "@/lib/ethiopian-datetime";
import { PRICE_PATTERN, formatPrice, isFreePrice } from "@/lib/price";
import { isoToZonedLocal, zonedLocalToIso } from "@/lib/timezone";

/** One scheduled price as typed: wall-clock times in the event's timezone. */
export interface WindowRow {
  key: string;
  startsAt: string;
  endsAt: string;
  price: string;
}
export type RowErrors = Record<string, { startsAt?: string; endsAt?: string; price?: string; row?: string }>;

export const MAX_WINDOWS = 20;
/** Room for the "Hour" placeholder in each time box (as on the event form). Placement only. */
const TIME_FIT = "[&_[role=group]>*]:w-[92px]";

export const newRow = (): WindowRow => ({ key: crypto.randomUUID(), startsAt: "", endsAt: "", price: "" });

export const rowsFrom = (windows: PriceWindow[], timeZone: string): WindowRow[] =>
  windows.map((w) => ({
    key: w.id,
    startsAt: isoToZonedLocal(w.starts_at, timeZone),
    endsAt: isoToZonedLocal(w.ends_at, timeZone),
    price: w.price.replace(/\.00$/, ""),
  }));

/** By start, rows without one last (they're still being typed). */
export const sortRows = (rows: WindowRow[]) => [...rows].sort((a, b) => (a.startsAt || "9999").localeCompare(b.startsAt || "9999"));

/** The API's rules, checked before saving: a start, a price, an end after the start, and no two prices at once. */
export function checkRows(rows: WindowRow[]): RowErrors {
  const errors: RowErrors = {};
  const set = (key: string, patch: RowErrors[string]) => (errors[key] = { ...errors[key], ...patch });
  for (const r of rows) {
    if (!r.startsAt) set(r.key, { startsAt: "Pick when this price starts." });
    if (!r.price.trim()) set(r.key, { price: "Enter an amount, or 0 for free." });
    else if (!PRICE_PATTERN.test(r.price.trim())) set(r.key, { price: "Enter an amount like 500 or 500.50." });
    if (r.startsAt && r.endsAt && r.endsAt <= r.startsAt) set(r.key, { endsAt: "The end must be after the start." });
  }
  // Walking by start, a row overlaps when it begins before an earlier one has ended. "" ends never.
  let reach: string | null = null;
  for (const r of sortRows(rows).filter((r) => r.startsAt)) {
    if (reach !== null && (reach === "" || r.startsAt < reach)) set(r.key, { row: "This price overlaps another scheduled price." });
    if (reach !== "" && (reach === null || !r.endsAt || r.endsAt > reach)) reach = r.endsAt;
  }
  return errors;
}

/** What's sent: the whole list, sorted by start (the API's `price_windows.N` then points at the Nth of these). */
export function toWindowsInput(rows: WindowRow[], timeZone: string): NonNullable<TicketTypeInput["price_windows"]> {
  return sortRows(rows).map((r) => ({
    starts_at: zonedLocalToIso(r.startsAt, timeZone)!,
    ...(r.endsAt ? { ends_at: zonedLocalToIso(r.endsAt, timeZone)! } : {}),
    price: r.price.trim(),
  }));
}

/** The schedule in words, one line per stretch of time: the regular price fills the gaps. */
function preview(rows: WindowRow[], regular: string, currency: string, timeZone: string): string[] {
  const complete = sortRows(rows).filter((r) => r.startsAt && PRICE_PATTERN.test(r.price.trim()));
  if (complete.length === 0 || Object.keys(checkRows(complete)).length > 0) return [];
  const at = (local: string) => formatMomentShort(zonedLocalToIso(local, timeZone)!, timeZone);
  const base = formatPrice(regular || "0", currency);
  const lines = [`Before ${at(complete[0]!.startsAt)}: ${base}`];
  complete.forEach((r, i) => {
    const price = formatPrice(r.price, currency);
    const next = complete[i + 1];
    if (!r.endsAt) {
      lines.push(`From ${at(r.startsAt)}: ${price}, until you change it`);
      return;
    }
    lines.push(`${at(r.startsAt)} to ${at(r.endsAt)}: ${price}`);
    if (!next) lines.push(`From ${at(r.endsAt)}: ${base}`);
    else if (next.startsAt > r.endsAt) lines.push(`${at(r.endsAt)} to ${at(next.startsAt)}: ${base}`);
  });
  return lines;
}

/** The "Scheduled prices" section of the ticket-type form (Phase 11). */
export function PriceWindowsEditor({
  rows,
  errors,
  regularPrice,
  currency,
  timeZone,
  onChange,
}: {
  rows: WindowRow[];
  errors: RowErrors;
  regularPrice: string;
  currency: string;
  timeZone: string;
  onChange: (rows: WindowRow[]) => void;
}) {
  const update = (key: string, patch: Partial<WindowRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const lines = preview(rows, regularPrice, currency, timeZone);

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 border-t border-border p-0 pt-4">
      <div className="flex flex-col gap-0.5">
        <p className="type-body m-0 font-semibold text-text">Scheduled prices</p>
        <p className="type-body-sm m-0 text-text-soft">
          A different price for a set time, in {timeZone.replace(/_/g, " ")} time. The price is fixed when the tickets are reserved. {isFreePrice(regularPrice) ? "Outside these times the ticket is free." : ""}
        </p>
      </div>

      {rows.map((r, i) => {
        const e = errors[r.key] ?? {};
        return (
          <div key={r.key} className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="type-body-sm m-0 font-semibold text-text">Scheduled price {i + 1}</p>
              <IconButton type="button" icon={<Trash2 />} aria-label={`Remove scheduled price ${i + 1}`} onClick={() => onChange(rows.filter((x) => x.key !== r.key))} />
            </div>
            {e.row && (
              <p role="alert" className="type-body-sm m-0 text-danger">
                {e.row}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <Field label="Starts" htmlFor={`pw-start-${r.key}`} required error={e.startsAt}>
                <DateTimePicker className={TIME_FIT} id={`pw-start-${r.key}`} value={r.startsAt} onValueChange={(v) => update(r.key, { startsAt: v })} />
              </Field>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Field label="Ends" htmlFor={`pw-end-${r.key}`} error={e.endsAt} hint={r.endsAt ? "Optional." : "Until you change it."}>
                  <DateTimePicker className={TIME_FIT} id={`pw-end-${r.key}`} value={r.endsAt} onValueChange={(v) => update(r.key, { endsAt: v })} min={r.startsAt || undefined} />
                </Field>
                {/* The picker can't be emptied by itself. */}
                {r.endsAt && (
                  <div>
                    <TextLink soft onClick={() => update(r.key, { endsAt: "" })}>
                      Remove the end
                    </TextLink>
                  </div>
                )}
              </div>
            </div>
            <Field label="Price" htmlFor={`pw-price-${r.key}`} required error={e.price} hint="0 means free." className="sm:max-w-[240px]">
              <InputGroup
                id={`pw-price-${r.key}`}
                inputMode="decimal"
                value={r.price}
                error={!!e.price}
                onChange={(ev) => update(r.key, { price: ev.target.value.replace(/[^\d.]/g, "") })}
                suffix={<InputAddon variant="suffix">{currency}</InputAddon>}
                autoComplete="off"
              />
            </Field>
          </div>
        );
      })}

      <div>
        <Button type="button" variant="secondary" disabled={rows.length >= MAX_WINDOWS} onClick={() => onChange([...rows, newRow()])}>
          <Plus className="size-4" />
          Add scheduled price
        </Button>
        {rows.length >= MAX_WINDOWS && <p className="type-body-sm m-0 mt-2 text-text-faint">A ticket type can have {MAX_WINDOWS} scheduled prices.</p>}
      </div>

      {lines.length > 0 && (
        <Note className="mt-0">
          <span className="flex flex-col gap-1">
            {lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </Note>
      )}
    </fieldset>
  );
}
