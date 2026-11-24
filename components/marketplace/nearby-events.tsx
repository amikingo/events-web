"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { exploreHref } from "../../lib/marketplace/query";
import type { City, CityId, EventSummary } from "../../types/marketplace";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { LocateIcon, MapPinIcon } from "../ui/icons";
import { Select } from "../ui/select";
import { toast } from "../ui/toaster";
import { EventGrid } from "./section";

function nearestCity(lat: number, lng: number, cities: City[]): City {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dist = (c: City) => {
    const dLat = rad(c.lat - lat);
    const dLng = rad(c.lng - lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(c.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
  };
  return [...cities].sort((a, b) => dist(a) - dist(b))[0]!;
}

/**
 * "Near you": defaults to Addis Ababa, switch city by hand or use the browser's location to pick the closest city.
 * The location never leaves the browser.
 */
export function NearbyEvents({ cities, byCity, now }: { cities: City[]; byCity: Partial<Record<CityId, EventSummary[]>>; now: string }) {
  const [city, setCity] = useState<CityId>("addis-ababa");
  const [locating, setLocating] = useState(false);
  const selectId = useId();
  const events = byCity[city] ?? [];
  const cityName = cities.find((c) => c.id === city)?.name ?? "";

  function locate() {
    if (!("geolocation" in navigator)) {
      toast.warning("Location isn't available in this browser", { body: "Choose your city from the list instead." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = nearestCity(pos.coords.latitude, pos.coords.longitude, cities);
        setCity(c.id);
        setLocating(false);
        toast.success(`Showing events near ${c.name}`);
      },
      () => {
        setLocating(false);
        toast.warning("We couldn't get your location", { body: "Choose your city from the list instead." });
      },
      { timeout: 8000, maximumAge: 600_000 },
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          City
        </label>
        <Select id={selectId} value={city} onValueChange={(v) => setCity(v as CityId)} options={cities.map((c) => ({ value: c.id, label: c.name }))} className="w-48" />
        <Button variant="secondary" onClick={locate} loading={locating} loadingLabel="Locating">
          <LocateIcon className="size-4" />
          Use my location
        </Button>
        <Link href={exploreHref({ city })} className="ml-auto rounded-sm type-body-sm font-semibold text-accent-text hover:underline">
          All events in {cityName}
        </Link>
      </div>
      {events.length ? (
        <EventGrid events={events} now={now} scroll />
      ) : (
        <EmptyState
          icon={<MapPinIcon />}
          tone="charcoal"
          title={`No upcoming events in ${cityName}`}
          description="Try another city, or browse everything coming up."
          actions={
            <Button asChild variant="secondary">
              <Link href="/events">Browse all events</Link>
            </Button>
          }
          animate
        />
      )}
    </div>
  );
}
