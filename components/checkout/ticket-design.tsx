"use client";

import { useId } from "react";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { createStorageStore, useStorageStore } from "@/lib/marketplace/storage-store";
import { TICKET_DESIGNS } from "@/lib/ticket-image";
import type { StandardDesign } from "@/lib/ticket-image";

/** The buyer's choice among the standard designs, remembered in this browser; used while an event has no saved design. */
const store = createStorageStore<StandardDesign>("ticket-design", "poster");

export function useTicketDesign(): StandardDesign {
  const stored = useStorageStore(store);
  return TICKET_DESIGNS.some((d) => d.value === stored) ? stored! : "poster";
}

/** One switch for every ticket on the page. */
export function TicketDesignPicker({ className }: { className?: string }) {
  const design = useTicketDesign();
  const id = useId();
  return (
    <div className={className}>
      <Field label="Ticket design" htmlFor={id}>
        <Select id={id} options={TICKET_DESIGNS.map((d) => ({ value: d.value, label: d.label }))} value={design} onValueChange={(v) => store.set(v as StandardDesign)} />
      </Field>
    </div>
  );
}
