"use client";

import { MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OptionEmpty, OptionRow } from "@/components/ui/option-list";
import { searchPlaces } from "@/lib/place-search";
import type { Place } from "@/lib/place-search";

/**
 * Search a place by name and pick it. It searches only when asked (Enter or the button), as the search service
 * requires, so it isn't the library's `SearchInput`, which searches while you type.
 */
export function PlaceSearch({ country, example, onSelect }: { country: string; example: string; onSelect: (place: Place) => void }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string>();
  const running = useRef<AbortController | null>(null);
  useEffect(() => () => running.current?.abort(), []);

  async function search() {
    const query = text.trim();
    if (query.length < 3) return setError("Type at least three letters.");
    running.current?.abort();
    const controller = new AbortController();
    running.current = controller;
    setError(undefined);
    setSearching(true);
    try {
      const found = await searchPlaces(query, country, controller.signal);
      if (!controller.signal.aborted) setResults(found);
    } catch {
      if (!controller.signal.aborted) {
        setResults(null);
        setError("Search isn't answering. Wait a moment and try again, or click the map.");
      }
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Field label="Find a place" htmlFor="vn-place" error={error} hint="A building, area or street name. Press Enter to search.">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input
              id="vn-place"
              type="search"
              value={text}
              error={!!error}
              placeholder={example}
              autoComplete="off"
              onChange={(e) => {
                setText(e.target.value);
                setError(undefined);
                // Old results belong to the old words.
                setResults(null);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                // Enter searches; it doesn't save the venue.
                e.preventDefault();
                void search();
              }}
            />
          </div>
          <Button type="button" variant="secondary" loading={searching} loadingLabel="Searching" onClick={() => void search()}>
            <Search className="size-4" />
            Search
          </Button>
        </div>
      </Field>
      {results && (
        <div role="listbox" aria-label="Places found" className="overflow-hidden rounded-sm border border-border bg-surface">
          {results.length === 0 ? (
            <OptionEmpty>Nothing found. Try the area or street name, or click the map.</OptionEmpty>
          ) : (
            results.map((place) => (
              <OptionRow
                key={place.id}
                leading={<MapPin />}
                label={place.name}
                sub={place.detail}
                onSelect={() => {
                  setText(place.name);
                  setResults(null);
                  onSelect(place);
                }}
              />
            ))
          )}
        </div>
      )}
      <p className="type-body-sm m-0 text-text-faint">
        Search by{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
          OpenStreetMap
        </a>{" "}
        contributors. What you type is sent to it.
      </p>
    </div>
  );
}
