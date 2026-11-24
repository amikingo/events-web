"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMapInstance, Marker } from "leaflet";
import { cn } from "../../lib/utils";

export interface LeafletMapProps {
  lat: number;
  lng: number;
  /** Called when the user clicks the map. Omit it for a read-only map (a venue's location): the pin never moves. */
  onPick?: (lat: number, lng: number) => void;
  zoom?: number;
  /** Tile server. Default is OpenStreetMap's public one — fine for demos; use your own provider (and its attribution) in production. */
  tileUrl?: string;
  attribution?: string;
  /** Draw the guideline's pin at `lat`/`lng`. Turn it off for a map that only shows an area. Default true. */
  pin?: boolean;
  /** Accessible name of the map region. */
  label?: string;
  className?: string;
}

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

/** The guideline's pin (accent teardrop with a surface-coloured dot), as inline SVG so no marker image files are needed — Leaflet's default icons break under bundlers. */
const PIN = `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="var(--color-accent)" stroke="var(--color-surface)" stroke-width="1.5"/><circle cx="12" cy="10" r="2.6" fill="var(--color-surface)"/></svg>`;

/**
 * A real map for `<LocationPicker renderMap>`, and for showing where something is: Leaflet on OpenStreetMap tiles with
 * the guideline's pin. It fills its parent (give the parent a size and `position: relative`).
 *
 * Page-friendly: the scroll wheel scrolls the page (the +/- buttons and a double-click zoom), and on touch screens one
 * finger scrolls the page while two fingers pan the map. Dark mode inverts the tiles (`.cheche-map`, tokens.css).
 * Leaflet reads `window`, so it is loaded inside the effect and never runs on the server. This is the only file that
 * needs `leaflet` (`npm i leaflet`).
 */
export function LeafletMap({ lat, lng, onPick, zoom = 15, tileUrl = OSM_TILES, attribution = OSM_ATTRIBUTION, pin = true, label = "Map", className }: LeafletMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMapInstance | null>(null);
  const marker = useRef<Marker | null>(null);
  const latest = useRef({ lat, lng, onPick });
  latest.current = { lat, lng, onPick };

  // Create the map once (and again only if the tile source or the pin switch changes).
  useEffect(() => {
    let cancelled = false;
    let created: LeafletMapInstance | undefined;

    import("leaflet").then((L) => {
      if (cancelled || !host.current) return;
      const start = latest.current;
      created = L.map(host.current, { center: [start.lat, start.lng], zoom, scrollWheelZoom: false, dragging: !L.Browser.mobile });
      L.tileLayer(tileUrl, { maxZoom: 19, attribution }).addTo(created);
      if (pin) {
        marker.current = L.marker([start.lat, start.lng], { icon: L.divIcon({ html: PIN, className: "cheche-map-pin", iconSize: [40, 40], iconAnchor: [20, 38] }), keyboard: false, interactive: false }).addTo(created);
      }
      created.on("click", (e) => latest.current.onPick?.(e.latlng.lat, e.latlng.lng));
      map.current = created;
    });

    return () => {
      cancelled = true;
      created?.remove();
      map.current = null;
      marker.current = null;
    };
    // `zoom` is only the starting zoom: changing it later must not throw the map away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileUrl, attribution, pin]);

  // Follow `lat`/`lng` when the parent moves the pin (a click, "Use my location").
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    m.setView([lat, lng], m.getZoom(), { animate: true });
    marker.current?.setLatLng([lat, lng]);
  }, [lat, lng]);

  return <div ref={host} role="region" aria-label={label} className={cn("cheche-map size-full", onPick && "cursor-crosshair", className)} />;
}
