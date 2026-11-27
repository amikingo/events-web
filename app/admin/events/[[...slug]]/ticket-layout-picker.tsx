"use client";

import { Upload } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectCard } from "@/components/ui/select-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TICKET_DESIGNS, TICKET_SIZE, renderTicketImage } from "@/lib/ticket-image";
import type { TicketDesign, TicketImageData } from "@/lib/ticket-image";

/** The ready-made designs, then the organizer's own artwork. */
export const LAYOUTS: readonly { value: TicketDesign; label: string }[] = [...TICKET_DESIGNS, { value: "custom", label: "Custom" }];

export type TicketPictures = Partial<Record<TicketDesign, string>>;

/** The picker's tabs: wide tickets with a photo, wide drawn ones, and tall ones. */
export type LayoutGroup = "photo" | "graphic" | "tall";

export function groupOf(design: TicketDesign): LayoutGroup {
  const found = TICKET_DESIGNS.find((d) => d.value === design);
  if (!found) return "photo";
  if (TICKET_SIZE[found.value].height > TICKET_SIZE[found.value].width) return "tall";
  return found.picture ? "photo" : "graphic";
}

/** The layouts on one tab: its ready-made designs, then the organizer's own artwork. */
export function layoutsOf(group: LayoutGroup): TicketDesign[] {
  return [...TICKET_DESIGNS.filter((d) => groupOf(d.value) === group).map((d) => d.value), "custom"];
}

/**
 * The ticket drawn in each of the layouts asked for, one after another (the first one first), so pointing at one
 * shows it at once. Redrawn shortly after the details stop changing; a picture stays until its new one is ready.
 */
export function useTicketPictures(ticket: Omit<TicketImageData, "qr">, layouts: TicketDesign[]): { pictures: TicketPictures; failed: boolean } {
  const [pictures, setPictures] = useState<TicketPictures>({});
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(ticket);
  const wanted = [...new Set(layouts)].join(",");
  // The pictures on screen, so replaced ones can be freed.
  const shown = useRef<TicketPictures>({});

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const data = JSON.parse(key) as Omit<TicketImageData, "qr">;
        const qr = await QRCode.toDataURL(data.code, { width: 480, margin: 2, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
        for (const design of wanted.split(",") as TicketDesign[]) {
          // Custom can only be drawn once there is artwork.
          if (design === "custom" && !data.artwork) continue;
          const blob = await renderTicketImage({ ...data, qr }, design);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          setPictures((all) => ({ ...all, [design]: url }));
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key, wanted]);

  // After a new picture is on screen, the one it replaced is freed.
  useEffect(() => {
    for (const [design, url] of Object.entries(shown.current)) {
      if (pictures[design as TicketDesign] !== url) URL.revokeObjectURL(url);
    }
    shown.current = pictures;
  }, [pictures]);

  return { pictures, failed };
}

/**
 * The layouts as small cards, on three tabs. Pointing at one (or reaching it with the
 * keyboard) shows it in the preview; clicking chooses it.
 */
export function TicketLayoutPicker({
  value,
  group,
  pictures,
  onGroupChange,
  onChange,
  onPeek,
}: {
  value: TicketDesign;
  group: LayoutGroup;
  pictures: TicketPictures;
  onGroupChange: (group: LayoutGroup) => void;
  onChange: (value: TicketDesign) => void;
  onPeek: (value: TicketDesign | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        aria-label="Kind of ticket"
        className="self-start"
        options={[
          { value: "photo", label: "Photo" },
          { value: "graphic", label: "Graphic" },
          { value: "tall", label: "Tall" },
        ]}
        value={group}
        onValueChange={(v) => onGroupChange(v as LayoutGroup)}
      />
      <div role="radiogroup" aria-label="Layout" className="grid grid-cols-2 gap-3 min-[1536px]:grid-cols-3 min-[1700px]:grid-cols-4">
        {layoutsOf(group).map((design) => (
          <SelectCard
            key={design}
            title={LAYOUTS.find((d) => d.value === design)!.label}
            selected={value === design}
            onClick={() => onChange(design)}
            onPointerEnter={(e) => e.pointerType === "mouse" && onPeek(design)}
            onPointerLeave={() => onPeek(null)}
            onFocus={() => onPeek(design)}
            onBlur={() => onPeek(null)}
            leading={
              <span className={group === "tall" ? "hidden h-10 w-8 flex-none items-center justify-center sm:flex" : "hidden h-10 w-14 flex-none items-center justify-center sm:flex"} aria-hidden="true">
                {pictures[design] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the ticket drawn in this browser
                  <img src={pictures[design]} alt="" className="max-h-full max-w-full rounded-sm shadow" />
                ) : design === "custom" ? (
                  <Upload className="size-4 text-text-soft" />
                ) : (
                  <Skeleton className={group === "tall" ? "h-10 w-7 rounded-sm" : "h-6 w-14 rounded-sm"} />
                )}
              </span>
            }
          />
        ))}
      </div>
    </div>
  );
}
