"use client";

import { useQuery } from "@tanstack/react-query";
import { LocateFixed, MapPinOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LeafletMap } from "@/components/ui/location-map-leaflet";
import { Note } from "@/components/ui/note";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { getVenuePin } from "@/lib/api/venue-locations";
import type { VenuePin } from "@/lib/api/venue-locations";
import { parsePin, roundPin } from "@/lib/map-pin";
import { placeSearchEnabled } from "@/lib/place-search";
import { CITIES } from "@/mocks/marketplace/reference";
import { PlaceSearch } from "./place-search";

export const venuePinQk = (organizationId: string, venueId: string) => ["venue-pin", organizationId, venueId] as const;

/** The server can't keep pins yet (older server, or its database isn't ready), or this role may not read venues. */
const cannotPin = (error: unknown) => error instanceof ApiError && (error.status >= 500 || error.status === 403 || error.code === "route_not_found");

/** A venue's pin. `available` false: the server can't keep pins for now. Without a venue (a new one) there is none yet. */
export function useVenuePin(organizationId: string, venueId: string | null) {
  const query = useQuery({
    queryKey: venuePinQk(organizationId, venueId ?? ""),
    queryFn: async ({ signal }) => {
      try {
        return { available: true, pin: await getVenuePin(organizationId, venueId!, signal) };
      } catch (error) {
        if (cannotPin(error)) return { available: false, pin: null };
        throw error;
      }
    },
    enabled: venueId !== null,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return {
    loading: venueId !== null && query.isPending,
    // An unreadable pin is treated as unavailable, so saving the venue can't wipe it.
    available: venueId === null || (query.data?.available ?? false),
    pin: query.data?.pin ?? null,
  };
}

/** Where the map opens without a pin: the typed city when it's one we know, else Addis Ababa. */
function startOf(city: string) {
  const known = CITIES.find((c) => c.name.toLowerCase() === city.trim().toLowerCase()) ?? CITIES[0]!;
  return { latitude: known.lat, longitude: known.lng };
}

/**
 * Choosing the spot: search a place, click the map, use this device's location, or paste coordinates or a Google Maps
 * address. `bare` leaves out its card, for use inside a box that already has a border.
 */
export function VenuePinPicker({ value, name, city, country, bare = false, onChange }: { value: VenuePin | null; name: string; city: string; country: string; bare?: boolean; onChange: (pin: VenuePin | null) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [locating, setLocating] = useState(false);
  const centre = value ?? startOf(city);

  function place(pin: VenuePin | null) {
    setText("");
    setError(undefined);
    onChange(pin);
  }

  /** Reads what was typed or pasted; leaves the pin alone when it holds no spot. */
  function read(input: string) {
    if (!input.trim()) return setError(undefined);
    const pin = parsePin(input);
    if (pin) return place(pin);
    setError(/goo\.gl|maps\.app/i.test(input) ? "Short links don't carry the spot. Open the link, then copy the address from the browser bar." : "Paste coordinates like 9.0108, 38.7613, or a Google Maps address.");
  }

  function locate() {
    if (!navigator.geolocation) return void toast.error("This browser can't find your location");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (found) => {
        setLocating(false);
        place(roundPin(found.coords.latitude, found.coords.longitude));
      },
      () => {
        setLocating(false);
        toast.error("Couldn't find your location", { body: "Allow location for this site, or click the map instead." });
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const parts = (
    <div className="flex flex-col gap-4">
      {placeSearchEnabled && <PlaceSearch country={country} example={name.trim() ? `e.g. ${name.trim()}` : "e.g. Skylight Hotel"} onSelect={(found) => place(found.pin)} />}
      <div className="relative z-0 h-[320px] overflow-hidden rounded-sm border border-border bg-surface-2">
        <LeafletMap
          lat={centre.latitude}
          lng={centre.longitude}
          zoom={value ? 16 : 12}
          pin={value !== null}
          onPick={(latitude, longitude) => place(roundPin(latitude, longitude))}
          label="Map. Click where the venue is."
        />
      </div>
      <p className="type-body-sm m-0 text-text-soft" aria-live="polite">
        {value ? (
          <>
            Pinned at <span className="font-mono text-text">{`${value.latitude}, ${value.longitude}`}</span>
          </>
        ) : (
          "No pin yet. Search for the venue, or click the map where it is."
        )}
      </p>
      <Field label="Coordinates or Google Maps address" htmlFor="vn-pin" error={error} hint="Optional. Paste it, then press Enter or leave the box.">
        <Input
          id="vn-pin"
          value={text}
          error={!!error}
          placeholder="9.0108, 38.7613"
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            setError(undefined);
          }}
          onBlur={() => read(text)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            // Enter places the pin; it doesn't save the venue.
            e.preventDefault();
            read(text);
          }}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" loading={locating} loadingLabel="Finding you" onClick={locate}>
          <LocateFixed className="size-4" />
          Use my location
        </Button>
        {value && (
          <Button type="button" variant="secondary" onClick={() => place(null)}>
            <MapPinOff className="size-4" />
            Remove pin
          </Button>
        )}
      </div>
    </div>
  );
  return bare ? parts : <Card>{parts}</Card>;
}

/** On the venue's page: its pin on a map. */
export function VenuePinPreview({ organizationId, venueId, name }: { organizationId: string; venueId: string; name: string }) {
  const { loading, available, pin } = useVenuePin(organizationId, venueId);
  if (loading) return <Skeleton shape="block" height={240} />;
  if (!available) return <Note className="mt-0">The map pin can&apos;t be read yet.</Note>;
  if (!pin) return <Note className="mt-0">No pin yet. Edit the venue to place it on the map, so guests see the exact spot.</Note>;
  return (
    <div className="relative z-0 h-[260px] overflow-hidden rounded-md border border-border bg-surface-2">
      <LeafletMap lat={pin.latitude} lng={pin.longitude} zoom={16} label={`Map of ${name}`} />
    </div>
  );
}
