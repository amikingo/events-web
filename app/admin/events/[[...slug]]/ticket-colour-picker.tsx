"use client";

import { Pipette, Wand2 } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { CheckIcon } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";
import { TICKET_COLORS } from "@/lib/ticket-image";
import type { TicketImageData } from "@/lib/ticket-image";

type Colour = NonNullable<TicketImageData["color"]> | null;

/** One round choice. The ring marks the chosen one. */
function swatchClass(selected: boolean) {
  return [
    "relative flex size-9 flex-none cursor-pointer items-center justify-center rounded-full border border-text-faint transition-transform hover:scale-110 focus-visible:shadow-focus motion-reduce:transition-none",
    selected ? "outline-2 outline-offset-2 outline-accent" : "",
  ].join(" ");
}

/** The tick on a chosen colour; its shadow keeps it visible on pale ones. */
const tick: ReactNode = <CheckIcon className="size-4 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" />;

/**
 * The ticket's colour as a row of swatches: the template's own colours, the ready-made ones, or any other from the
 * browser's colour picker. The component library has no colour swatch, so it lives beside the editor.
 */
export function TicketColourPicker({ value, onChange }: { value: Colour; onChange: (value: Colour) => void }) {
  const custom = value?.startsWith("#") ? value : null;
  const name = value === null ? "Original" : custom ? "Your colour" : (TICKET_COLORS.find((c) => c.value === value)?.label ?? "Original");

  return (
    <Card>
      <CardHeader title="Colour" subtitle="Original keeps the template's own colours." action={<span className="type-body-sm whitespace-nowrap font-medium text-text">{name}</span>} />
      <div role="group" aria-label="Colour" className="flex flex-wrap items-center gap-3 p-0.5">
        <Tooltip content="Original">
          <button type="button" aria-label="Original" aria-pressed={value === null} className={`${swatchClass(value === null)} bg-surface-2 text-text-soft`} onClick={() => onChange(null)}>
            <Wand2 className="size-4" aria-hidden="true" />
          </button>
        </Tooltip>
        <span className="h-6 w-px bg-border" aria-hidden="true" />
        {TICKET_COLORS.map((c) => (
          <Tooltip key={c.value} content={c.label}>
            <button type="button" aria-label={c.label} aria-pressed={value === c.value} className={swatchClass(value === c.value)} style={{ background: `var(${c.value})` }} onClick={() => onChange(c.value)}>
              {value === c.value && tick}
            </button>
          </Tooltip>
        ))}
        <span className="h-6 w-px bg-border" aria-hidden="true" />
        <Tooltip content="Pick any colour">
          {/* The browser's own picker sits invisibly on top of the swatch. */}
          <label className={`${swatchClass(Boolean(custom))} ${custom ? "" : "bg-surface text-text-soft"} focus-within:shadow-focus`} style={custom ? { background: custom } : undefined}>
            {custom ? tick : <Pipette className="size-4" aria-hidden="true" />}
            <input type="color" aria-label="Pick any colour" className="absolute inset-0 size-full cursor-pointer opacity-0" value={custom ?? "#000000"} onChange={(e) => onChange(e.target.value as `#${string}`)} />
          </label>
        </Tooltip>
      </div>
      {custom && <p className="type-body-sm m-0 mt-3 text-text-faint">A very pale colour is darkened on the ticket so the text stays readable.</p>}
    </Card>
  );
}
