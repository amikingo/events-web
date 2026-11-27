"use client";

/**
 * Between the API's ticket design and the one the editor and the tickets draw (`TicketLook`): colour names to design
 * tokens, picture addresses to pictures in memory, and saving a look as settings plus uploads.
 */
import { useEffect, useState } from "react";
import { assetUrl } from "@/lib/api-client";
import { getPublicTicketDesign, removeTicketImage, saveTicketDesign, uploadTicketImage } from "@/lib/api/ticket-designs";
import type { TicketDesign as ApiDesign, TicketImageSlot } from "@/lib/api/ticket-designs";
import { TICKET_DESIGNS } from "@/lib/ticket-image";
import type { TicketColor, TicketDesign } from "@/lib/ticket-image";
import { DEFAULT_LOOK } from "@/lib/ticket-look";
import type { TicketLook } from "@/lib/ticket-look";

/** The API's colour names and the tokens they're painted with. */
const COLOURS: Record<string, TicketColor> = {
  pink: "--color-accent-fill",
  wine: "--color-accent-deep",
  purple: "--color-cbe",
  green: "--color-success-fill",
  amber: "--color-warning-fill",
  red: "--ticket-brick",
  orange: "--ticket-orange",
  blue: "--ticket-blue",
  teal: "--ticket-teal",
  black: "--color-paper-ink",
};

const colourFrom = (value: string | null): TicketColor | null => (value === null ? null : value.startsWith("#") ? (value as TicketColor) : (COLOURS[value] ?? null));
const colourName = (value: TicketColor | null): string | null => (value === null ? null : value.startsWith("#") ? value.toLowerCase() : (Object.keys(COLOURS).find((name) => COLOURS[name] === value) ?? null));

/** A picture from the API, drawn into memory. null when it can't be loaded: the ticket is then drawn without it. */
function loadPicture(path: string, type: "image/png" | "image/jpeg"): Promise<{ data: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    // Asked for with CORS (and its own address, so a cached copy without it isn't reused), or it couldn't be redrawn.
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext("2d")!.drawImage(image, 0, 0);
        resolve({ data: canvas.toDataURL(type, 0.9), width: canvas.width, height: canvas.height });
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = `${assetUrl(path)}?for=ticket`;
  });
}

/** The API's design as the tickets draw it; null when it can't be drawn (the standard designs then apply). */
export async function toLook(design: ApiDesign): Promise<TicketLook | null> {
  const [logo, picture, artwork] = await Promise.all([
    design.logo ? loadPicture(design.logo.url, "image/png") : null,
    design.picture ? loadPicture(design.picture.url, "image/jpeg") : null,
    design.artwork ? loadPicture(design.artwork.url, "image/jpeg") : null,
  ]);
  // A layout this version of the site doesn't know falls back to the poster.
  const known = TICKET_DESIGNS.some((d) => d.value === design.design) || design.design === "custom";
  const name = (known ? design.design : "poster") as TicketDesign;
  if (name === "custom" && !artwork) return null;
  return {
    ...DEFAULT_LOOK,
    design: name,
    color: colourFrom(design.color),
    note: design.note ?? "",
    showPrice: design.show_price,
    showVenue: design.show_venue,
    showGuest: design.show_guest,
    logo: logo?.data ?? null,
    background: picture?.data ?? null,
    artwork: artwork ? { image: artwork.data, width: artwork.width, height: artwork.height, x: design.qr.x, y: design.qr.y, qrSize: design.qr.size } : null,
  };
}

/** A picture in memory as a file to upload. */
function toFile(data: string, name: string): File {
  const [head = "", body = ""] = data.split(",");
  const type = head.slice(head.indexOf(":") + 1, head.indexOf(";"));
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return new File([bytes], `${name}.${type.split("/")[1] ?? "png"}`, { type });
}

const pictures = (look: TicketLook | null): Record<TicketImageSlot, string | null> => ({
  logo: look?.logo ?? null,
  picture: look?.background ?? null,
  artwork: look?.artwork?.image ?? null,
});

/**
 * Saves a look for everyone: new pictures first (the custom design needs its artwork), then the settings, then the
 * pictures that were taken off (artwork can only go once the design is no longer custom). `before` is what the API
 * holds now, so unchanged pictures aren't sent again.
 */
export async function saveSharedLook(organizationId: string, eventId: string, look: TicketLook, before: TicketLook | null): Promise<void> {
  const next = pictures(look);
  const old = pictures(before);
  const slots = Object.keys(next) as TicketImageSlot[];
  for (const slot of slots) {
    const data = next[slot];
    if (data && data !== old[slot]) await uploadTicketImage(organizationId, eventId, slot, toFile(data, slot));
  }
  await saveTicketDesign(organizationId, eventId, {
    design: look.design,
    color: colourName(look.color),
    note: look.note.trim() || null,
    show_price: look.showPrice,
    show_venue: look.showVenue,
    show_guest: look.showGuest,
    qr: look.artwork ? { x: look.artwork.x, y: look.artwork.y, size: look.artwork.qrSize } : { x: 0.5, y: 1, size: "m" },
  });
  for (const slot of slots) {
    if (!next[slot] && old[slot]) await removeTicketImage(organizationId, eventId, slot);
  }
}

/**
 * The design buyers see, by the event's slugs. `look` is null when the organizer saved none (or the server can't say):
 * the buyer then chooses among the standard designs. While `loading`, show neither.
 */
export function usePublicTicketLook(organizationSlug: string | null | undefined, eventSlug: string | null | undefined): { look: TicketLook | null; loading: boolean } {
  const key = organizationSlug && eventSlug ? `${organizationSlug}/${eventSlug}` : null;
  const [result, setResult] = useState<{ key: string; look: TicketLook | null } | null>(null);
  useEffect(() => {
    if (!key) return;
    const [organization, event] = key.split("/");
    const controller = new AbortController();
    getPublicTicketDesign(organization!, event!, controller.signal)
      .then((design) => (design ? toLook(design) : null))
      .catch(() => null)
      .then((look) => {
        if (!controller.signal.aborted) setResult({ key, look });
      });
    return () => controller.abort();
  }, [key]);
  const ready = key !== null && result?.key === key;
  return { look: ready ? result.look : null, loading: !ready };
}
