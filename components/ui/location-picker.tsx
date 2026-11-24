"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Field } from "./field";
import { Input } from "./input";
import { LocateIcon, MapPinIcon, PinIcon } from "./icons";
import { Pill } from "./pill";
import { Select } from "./select";

export interface MapFeature {
  kind: "road" | "park" | "label";
  /** Position on the map in percent; a number is a percentage, a string ("14px") is used as written (road thickness). */
  left: number;
  top: number;
  width?: number | string;
  height?: number | string;
  /** Degrees (roads). */
  rotate?: number;
  /** Text (labels, and the park's caption). */
  text?: string;
}

export interface LocationValue {
  /** Pin position, in degrees. */
  lat: number;
  lng: number;
  street: string;
  city: string;
  subcity: string;
  woreda: string;
  house: string;
  /** What the status pill says: "Drag or tap to pin" → "Pinned" → "Located ± 12 m". */
  status?: "idle" | "pinned" | "located";
}

export interface LocationPickerProps {
  value: LocationValue;
  onValueChange: (value: LocationValue) => void;
  cities: { label: string; value: string }[];
  /** The map backdrop (roads, parks, labels). The guideline draws a simple diagram; swap in a real map by replacing this component's map area. */
  features?: MapFeature[];
  /** "Use my location": resolves to the pin position and the address fields to fill. Omit to hide the button. */
  onLocate?: () => Promise<Partial<LocationValue> & { lat: number; lng: number }>;
  /** What the guideline's diagram map covers: lat/lng of its top-left corner and the span it shows. Ignored with `renderMap`. */
  mapBounds?: { lat: number; lng: number; spanLat: number; spanLng: number };
  /** Swap the diagram for a real map: render it filling the box (`<LeafletMap>` from location-map-leaflet.tsx is the ready-made one). */
  renderMap?: (api: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) => ReactNode;
  className?: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * `.loc` — a map pin plus the address fields Ethiopia actually uses: city, sub-city, woreda and a street or
 * landmark. Clicking the map moves the pin; "Use my location" drops it and fills the fields.
 */
export function LocationPicker({ value, onValueChange, cities, features = [], onLocate, mapBounds = { lat: 9.03, lng: 38.73, spanLat: 0.04, spanLng: 0.05 }, renderMap, className }: LocationPickerProps) {
  const uid = useId();
  const [dropKey, setDropKey] = useState(0);
  const [pulse, setPulse] = useState(false);
  const coords = `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`;
  // The diagram works in percent of its box; convert to and from degrees.
  const x = clamp(((value.lng - mapBounds.lng) / mapBounds.spanLng) * 100, 0, 100);
  const y = clamp(((mapBounds.lat - value.lat) / mapBounds.spanLat) * 100, 0, 100);
  const set = (patch: Partial<LocationValue>) => onValueChange({ ...value, ...patch });

  function onMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = clamp(((e.clientX - r.left) / r.width) * 100, 4, 96);
    const py = clamp(((e.clientY - r.top) / r.height) * 100, 12, 94);
    pick(mapBounds.lat - (py / 100) * mapBounds.spanLat, mapBounds.lng + (px / 100) * mapBounds.spanLng);
  }

  function pick(lat: number, lng: number) {
    set({ lat, lng, status: "pinned" });
    setPulse(false);
    setDropKey((k) => k + 1);
  }

  async function locate() {
    if (!onLocate) return;
    const r = await onLocate();
    onValueChange({ ...value, ...r, status: "located" });
    setDropKey((k) => k + 1);
    setPulse(true);
  }

  const status = value.status ?? "idle";
  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div
        role="application"
        aria-label="Map — click to place the pin"
        onClick={renderMap ? undefined : onMapClick}
        className={cn("relative h-[180px] overflow-hidden rounded-sm border border-border bg-surface-2", !renderMap && "cursor-crosshair bg-[length:28px_28px]")}
        style={
          renderMap
            ? undefined
            : { backgroundImage: "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)" }
        }
      >
        {renderMap?.({ lat: value.lat, lng: value.lng, onPick: pick })}
        {!renderMap && features.map((f, i) =>
          f.kind === "label" ? (
            <span key={i} className="pointer-events-none absolute text-[11px] font-semibold tracking-[0.3px] text-text-faint" style={{ left: `${f.left}%`, top: `${f.top}%` }}>
              {f.text}
            </span>
          ) : (
            <span
              key={i}
              className={cn(
                "absolute border",
                f.kind === "road"
                  ? "rounded-road border-border bg-surface"
                  : "rounded-popover border-[color-mix(in_srgb,var(--color-success)_25%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface-2))]",
              )}
              style={{ left: `${f.left}%`, top: `${f.top}%`, width: typeof f.width === "number" ? `${f.width}%` : f.width, height: typeof f.height === "number" ? `${f.height}%` : f.height, transform: f.rotate ? `rotate(${f.rotate}deg)` : undefined }}
            />
          ),
        )}
        {!renderMap && (
        <>
        <span
          key={`pulse-${dropKey}`}
          aria-hidden="true"
          className={cn("pointer-events-none absolute -ml-[15px] -mt-[15px] size-[30px] rounded-full bg-[color-mix(in_srgb,var(--color-accent)_25%,transparent)]", pulse ? "animate-loc-pulse" : "opacity-0")}
          style={{ left: `${x}%`, top: `${y}%` }}
        />
        <span
          key={`pin-${dropKey}`}
          aria-hidden="true"
          className="pointer-events-none absolute -ml-[15px] -mt-[30px] size-[30px] text-accent drop-shadow-pin transition-[left,top] duration-(--motion-slow) ease-slow animate-pin-drop"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <PinIcon className="block size-full" />
        </span>
        </>
        )}
        <Pill size="sm" dot tone={status === "located" ? "success" : status === "pinned" ? "accent" : "neutral"} className="absolute left-2.5 top-2.5 z-[1000]">
          {status === "located" ? "Located ± 12 m" : status === "pinned" ? "Pinned" : "Drag or tap to pin"}
        </Pill>
        <span className="absolute bottom-2.5 left-2.5 z-[1000] rounded-check border border-border bg-surface px-[7px] py-0.5 font-mono text-[11px] tabular-nums text-text-soft">{coords}</span>
        {onLocate && (
          <Button variant="secondary" className="absolute bottom-2.5 right-2.5 z-[1000] h-[30px] px-2.5 py-1 text-[12.5px]" onClick={locate}>
            <LocateIcon className="size-4" />
            Use my location
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Street or landmark" htmlFor={`${uid}-street`} className="col-span-2">
          <div className="relative">
            <MapPinIcon className="pointer-events-none absolute left-[11px] top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <Input id={`${uid}-street`} className="pl-9" placeholder="e.g. Cameroon St, next to Edna Mall" value={value.street} onChange={(e) => set({ street: e.target.value })} />
          </div>
        </Field>
        <Field label="City" htmlFor={`${uid}-city`}>
          <Select id={`${uid}-city`} placeholder="Select city" options={cities} value={value.city} onValueChange={(v) => set({ city: v })} />
        </Field>
        <Field label="Sub-city" htmlFor={`${uid}-subcity`}>
          <Input id={`${uid}-subcity`} placeholder="e.g. Bole" value={value.subcity} onChange={(e) => set({ subcity: e.target.value })} />
        </Field>
        <Field label="Woreda" htmlFor={`${uid}-woreda`}>
          <Input id={`${uid}-woreda`} inputMode="numeric" placeholder="e.g. 03" value={value.woreda} onChange={(e) => set({ woreda: e.target.value })} />
        </Field>
        <Field
          label={
            <>
              House number <span className="text-[11.5px] font-normal text-text-faint">(optional)</span>
            </>
          }
          htmlFor={`${uid}-house`}
        >
          <Input id={`${uid}-house`} placeholder="e.g. 1142" value={value.house} onChange={(e) => set({ house: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

