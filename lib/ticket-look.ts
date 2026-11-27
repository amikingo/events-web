"use client";

import { useMemo, useSyncExternalStore } from "react";
import { createStorageStore } from "@/lib/marketplace/storage-store";
import type { StorageStore } from "@/lib/marketplace/storage-store";
import type { TicketArtwork, TicketColor, TicketDesign } from "@/lib/ticket-image";

/**
 * An event's own ticket design, made in the design editor. The API keeps it, and buyers get it
 * (`lib/ticket-design-share.ts`). This file's browser storage is the fallback for a server that can't keep designs
 * yet: such a design applies only to tickets staff view, download and print here.
 */
export interface TicketLook {
  design: TicketDesign;
  /** null: the design's own colours. */
  color: TicketColor | null;
  /** The shape of what's saved; 2 since "Original" colours. */
  version: 2;
  /** Pictures as data URLs, already made small. */
  logo: string | null;
  /** Used instead of the event's cover. */
  background: string | null;
  note: string;
  showPrice: boolean;
  showVenue: boolean;
  showGuest: boolean;
  /** The organizer's own ticket picture, used by the custom design. */
  artwork: TicketArtwork | null;
}

export const DEFAULT_LOOK: TicketLook = { design: "poster", color: null, version: 2, logo: null, background: null, note: "", showPrice: true, showVenue: true, showGuest: true, artwork: null };

const stores = new Map<string, StorageStore<TicketLook | null>>();
const keyOf = (eventId: string) => `ticket-look:${eventId}`;
function storeFor(eventId: string) {
  let store = stores.get(eventId);
  if (!store) {
    store = createStorageStore<TicketLook | null>(keyOf(eventId), null);
    stores.set(eventId, store);
  }
  return store;
}

/** The saved design, `null` when none was saved, `undefined` before the browser has been read. */
export function useTicketLook(eventId: string): TicketLook | null | undefined {
  const store = useMemo(() => storeFor(eventId), [eventId]);
  const stored = useSyncExternalStore<TicketLook | null | undefined>(store.subscribe, store.get, () => undefined);
  return useMemo(() => {
    if (!stored) return stored;
    // Designs saved before "Original" held pink without it being chosen.
    const unpicked = !stored.version && stored.color === "--color-accent-fill";
    return { ...DEFAULT_LOOK, ...stored, ...(unpicked ? { color: null } : null) };
  }, [stored]);
}

/** Saves (or, with null, removes) an event's design. False when the browser had no room for it. */
export function saveTicketLook(eventId: string, look: TicketLook | null): boolean {
  storeFor(eventId).set(look);
  try {
    return window.localStorage.getItem(keyOf(eventId)) === JSON.stringify(look);
  } catch {
    return false;
  }
}

/**
 * An uploaded ticket picture: its longer side brought to between 1,200 and 1,600 pixels (small enough to keep, large
 * enough for a sharp QR). The QR starts at the right of a wide ticket, at the bottom of a tall one.
 */
export async function loadArtwork(file: File): Promise<TicketArtwork> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1600, Math.max(1200, longest)) / longest;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  // See-through parts would turn black in a JPEG.
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-paper").trim();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const wide = canvas.width > canvas.height;
  return { image: canvas.toDataURL("image/jpeg", 0.85), width: canvas.width, height: canvas.height, x: wide ? 1 : 0.5, y: wide ? 0.5 : 1, qrSize: "m" };
}

/** An uploaded picture made small enough to keep: PNG keeps a logo's see-through parts, JPEG suits photos. */
export async function shrinkImage(file: File, maxSide: number, type: "image/png" | "image/jpeg"): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL(type, 0.85);
}
