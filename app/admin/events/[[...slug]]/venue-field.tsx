"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { VenuePinPicker, venuePinQk } from "@/app/admin/venues/[[...slug]]/venue-pin";
import { useModuleAccess } from "@/components/ability-provider";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import type { ComboboxOption } from "@/components/ui/combobox";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Note } from "@/components/ui/note";
import { TextLink } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toaster";
import { describeApiError } from "@/lib/api/errors";
import { saveVenuePin } from "@/lib/api/venue-locations";
import type { VenuePin } from "@/lib/api/venue-locations";
import { createVenue } from "@/lib/api/venues";
import type { Venue } from "@/lib/api/venues";
import { MODULE_CODES } from "@/lib/constants/modules";
import { venueQk } from "@/lib/query-keys";

/** Picks the new venue's spot in a pop-up, so the map doesn't stretch the event form. Nothing is saved here. */
function PinModal({ pin, name, city, onClose, onUse }: { pin: VenuePin | null; name: string; city: string; onClose: () => void; onUse: (pin: VenuePin | null) => void }) {
  const [draft, setDraft] = useState(pin);
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} aria-label="Pin the venue on the map">
      <ModalHeader title="Pin the venue on the map" onClose={onClose} />
      <ModalBody>
        <VenuePinPicker bare value={draft} name={name} city={city} country="" onChange={setDraft} />
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={!draft && !pin} onClick={() => onUse(draft)}>
          {!draft && pin ? "Save without a pin" : "Use this spot"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * The new venue's few fields, saved on their own (before the event) and then chosen for it. Size and country can be
 * added later on the venue's page.
 */
function NewVenue({ organizationId, venues, onDone, onUse }: { organizationId: string; venues: Venue[]; onDone: () => void; onUse: (venueId: string) => void }) {
  const queryClient = useQueryClient();
  const { can } = useModuleAccess();
  // A pin is a change to the venue, which has its own right.
  const mayPin = can("update", MODULE_CODES.EVENTS);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState<VenuePin | null>(null);
  const [pinning, setPinning] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const same = venues.find((v) => v.is_active && v.name.trim().toLowerCase() === name.trim().toLowerCase());

  const add = useMutation({
    mutationFn: () => createVenue(organizationId, { name: name.trim(), address: address.trim() || null, city: city.trim() || null, country: null, capacity: null }),
    onSuccess: async (venue) => {
      // Into the list at once, so the field can show it; then read the lists again.
      queryClient.setQueryData<Venue[]>(venueQk.everyone(organizationId), (all) => [...(all ?? []), venue]);
      void queryClient.invalidateQueries({ queryKey: venueQk.all(organizationId) });
      onUse(venue.id);
      if (pin) {
        try {
          await saveVenuePin(organizationId, venue.id, pin);
          queryClient.setQueryData(venuePinQk(organizationId, venue.id), { available: true, pin });
        } catch (error) {
          toast.error("The venue was added, but not its map pin", { body: describeApiError(error, "venue") });
        }
      }
      toast.success("Venue added", { body: "It's chosen for this event." });
      onDone();
    },
  });

  function submit() {
    if (add.isPending) return;
    if (!name.trim()) return setNameError("Enter the venue's name.");
    add.mutate();
  }

  /** Enter adds the venue; it never saves the event around it. The pin picker's own boxes handle Enter themselves. */
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    submit();
  };

  return (
    <section aria-label="New venue" className="flex flex-col gap-4 rounded-md border border-border bg-surface-2 p-4">
      <CardHeader className="mb-0" title="New venue" subtitle="Saved as soon as you add it, even if you don't save the event." />
      {add.isError && <ErrorBanner>{describeApiError(add.error, "venue")}</ErrorBanner>}
      <Field label="Name" htmlFor="ev-venue-name" required error={nameError}>
        <Input
          id="ev-venue-name"
          value={name}
          error={!!nameError}
          placeholder="e.g. Skylight Hotel, Grand Ballroom"
          autoComplete="off"
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setNameError(undefined);
          }}
          onKeyDown={onEnter}
        />
      </Field>
      {same && (
        <Note className="mt-0">
          You already have a venue called {same.name}.{" "}
          <TextLink
            onClick={() => {
              onUse(same.id);
              onDone();
            }}
          >
            Use it
          </TextLink>
        </Note>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="City (optional)" htmlFor="ev-venue-city">
          <Input id="ev-venue-city" value={city} placeholder="e.g. Addis Ababa" autoComplete="off" onChange={(e) => setCity(e.target.value)} onKeyDown={onEnter} />
        </Field>
        <Field label="Street address (optional)" htmlFor="ev-venue-address">
          <Input id="ev-venue-address" value={address} placeholder="e.g. Bole Road" autoComplete="off" onChange={(e) => setAddress(e.target.value)} onKeyDown={onEnter} />
        </Field>
      </div>
      {pin && (
        <p className="type-body-sm m-0 text-text-soft" aria-live="polite">
          Pinned at <span className="font-mono text-text">{`${pin.latitude}, ${pin.longitude}`}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {mayPin && (
          <Button type="button" variant="secondary" onClick={() => setPinning(true)}>
            <MapPin className="size-4" />
            {pin ? "Change map pin" : "Add map pin"}
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="secondary" disabled={add.isPending} onClick={onDone}>
            Cancel
          </Button>
          <Button type="button" loading={add.isPending} loadingLabel="Adding" onClick={submit}>
            Add venue
          </Button>
        </div>
      </div>
      {pinning && (
        <PinModal
          pin={pin}
          name={name}
          city={city}
          onClose={() => setPinning(false)}
          onUse={(picked) => {
            setPin(picked);
            setPinning(false);
          }}
        />
      )}
    </section>
  );
}

interface VenueFieldProps {
  organizationId: string;
  /** Every venue of the organization. */
  venues: Venue[];
  /** What can be chosen, the "no venue" choice included. */
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  adding: boolean;
  onAddingChange: (adding: boolean) => void;
}

/** The event's venue: search the saved ones, or add a new one without leaving the form. */
export function VenueField({ organizationId, venues, options, value, onChange, adding, onAddingChange }: VenueFieldProps) {
  const { can } = useModuleAccess();
  return (
    <div className="flex flex-col gap-3">
      {/* Enter in the search box mustn't save the event. */}
      <div onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}>
        <Field label="Venue" htmlFor="ev-venue" hint="Optional. Type to search your venues.">
          <Combobox id="ev-venue" options={options} value={value} onValueChange={onChange} placeholder="Search venues" emptyText="No venue by that name" />
        </Field>
      </div>
      {adding ? (
        <NewVenue organizationId={organizationId} venues={venues} onDone={() => onAddingChange(false)} onUse={onChange} />
      ) : (
        can("create", MODULE_CODES.EVENTS) && (
          <Button type="button" variant="secondary" className="self-start" onClick={() => onAddingChange(true)}>
            <Plus className="size-4" />
            Add a new venue
          </Button>
        )
      )}
    </div>
  );
}
