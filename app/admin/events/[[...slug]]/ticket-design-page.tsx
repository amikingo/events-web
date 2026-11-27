"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MonitorSmartphone, Upload, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { AvatarUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { assetUrl } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { listTicketTypes } from "@/lib/api/events";
import type { StaffEvent } from "@/lib/api/events";
import { getOrganization } from "@/lib/api/organizations";
import { removeTicketDesign } from "@/lib/api/ticket-designs";
import { formatMomentFull, formatMomentShort } from "@/lib/ethiopian-datetime";
import { formatPrice, isFreePrice } from "@/lib/price";
import { eventQk, organizationQk } from "@/lib/query-keys";
import { TICKET_DESIGNS, ticketSize } from "@/lib/ticket-image";
import type { TicketDesign } from "@/lib/ticket-image";
import { saveSharedLook } from "@/lib/ticket-design-share";
import { DEFAULT_LOOK, saveTicketLook, shrinkImage } from "@/lib/ticket-look";
import type { TicketLook } from "@/lib/ticket-look";
import { ticketDesignQk, useEventTicketDesign } from "@/lib/use-event-ticket-design";
import { TicketArtworkCards } from "./ticket-artwork-cards";
import { TicketColourPicker } from "./ticket-colour-picker";
import { LAYOUTS, TicketLayoutPicker, groupOf, layoutsOf, useTicketPictures } from "./ticket-layout-picker";
import type { LayoutGroup } from "./ticket-layout-picker";

/** The longest note that still fits on one line of a ticket. */
const NOTE_MAX = 60;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];
/** The preview's code: not a real ticket, the door refuses it. */
const SAMPLE_CODE = "SAMPLE00";

/** The whole logo on a white square, as the ticket shows it: the upload's own tile would crop a wide one. */
function useSquare(src: string | null): string | null {
  const [made, setMade] = useState<{ from: string; url: string } | null>(null);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const side = 200;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = side;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-paper").trim();
      ctx.fillRect(0, 0, side, side);
      const scale = Math.min((side - 32) / image.width, (side - 32) / image.height);
      ctx.drawImage(image, (side - image.width * scale) / 2, (side - image.height * scale) / 2, image.width * scale, image.height * scale);
      setMade({ from: src, url: canvas.toDataURL("image/png") });
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return src && made?.from === src ? made.url : null;
}

/** One picture to add, replace or remove: the logo, or a background instead of the cover. */
function PictureField({ title, hint, initials, value, shown = value, maxSide, type, onChange }: { title: string; hint: string; initials: string; value: string | null; shown?: string | null; maxSide: number; type: "image/png" | "image/jpeg"; onChange: (value: string | null) => void }) {
  return (
    <AvatarUpload
      title={title}
      hint={`${hint} PNG, JPEG or WebP up to 5 MB.`}
      initials={initials}
      src={shown ?? undefined}
      hasImage={value !== null}
      accept={TYPES.join(",")}
      onFile={(file) => {
        if (!TYPES.includes(file.type)) return void toast.error("Choose a PNG, JPEG or WebP picture");
        if (file.size > MAX_BYTES) return void toast.error("The picture must be 5 MB or smaller");
        shrinkImage(file, maxSide, type)
          .then(onChange)
          .catch(() => toast.error("Couldn't read that picture", { body: "Try another one." }));
      }}
      onRemove={() => onChange(null)}
    />
  );
}

/** The design editor: settings on the left, the ticket as it will print on the right, the actions in the header. */
function Editor({
  event,
  saved,
  shared,
  browserLook,
  venueName,
  onBack,
}: {
  event: StaffEvent;
  saved: TicketLook | null;
  /** Whether the server keeps the design (buyers see it), or only this browser can. */
  shared: boolean;
  browserLook: TicketLook | null;
  venueName: string | null;
  onBack: () => void;
}) {
  const orgId = event.organization_id;
  const queryClient = useQueryClient();
  const designKey = ticketDesignQk(orgId, event.id);
  // A design made before the server could keep it is offered again, to be saved for buyers.
  const [draft, setDraft] = useState<TicketLook>(() => saved ?? browserLook ?? DEFAULT_LOOK);
  const [resetOpen, setResetOpen] = useState(false);
  const organization = useQuery({ queryKey: organizationQk.detail(orgId), queryFn: ({ signal }) => getOrganization(orgId, signal) });
  const types = useQuery({ queryKey: eventQk.tickets(orgId, event.id), queryFn: ({ signal }) => listTicketTypes(orgId, event.id, signal) });
  // A paid type for the preview when there is one, so "Show the price" has something to show.
  const paid = types.data?.find((t) => t.is_active && !isFreePrice(t.effective_price));
  const sample = paid ?? types.data?.find((t) => t.is_active) ?? types.data?.[0];
  const typeName = sample?.name ?? "General Admission";
  const price = paid ? formatPrice(paid.effective_price, paid.currency) : null;
  const allFree = types.isSuccess && !paid;

  const set = <K extends keyof TicketLook>(key: K, value: TicketLook[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const changed = JSON.stringify(draft) !== JSON.stringify(saved ?? DEFAULT_LOOK);
  // The layout being pointed at: the preview shows it without choosing it.
  const [peek, setPeek] = useState<TicketDesign | null>(null);
  const shown = peek ?? draft.design;
  const shownLabel = LAYOUTS.find((d) => d.value === shown)!.label;
  const custom = draft.design === "custom";
  const usesPicture = TICKET_DESIGNS.some((d) => d.value === draft.design && d.picture);
  // The picker's tab: the chosen design's to begin with.
  const [group, setGroup] = useState<LayoutGroup>(() => groupOf(draft.design));
  // Where this template shows an added picture.
  const pictureHint = usesPicture
    ? event.cover
      ? "Replaces the event's cover."
      : "This event has no cover yet."
    : draft.design === "neo"
      ? "Fills the left panel."
      : draft.design === "pop"
        ? "Shown in a circle."
        : "Shown faintly behind the details.";
  const size = ticketSize(shown, draft.artwork);
  // Custom without a picture yet: nothing to show, and nothing to save.
  const awaiting = shown === "custom" && !draft.artwork;
  // Clicking the chosen artwork moves its QR panel there.
  const placing = custom && shown === "custom" ? draft.artwork : null;

  const organizerName = organization.data?.name ?? "";
  const venue = venueName ?? "Venue name";
  const coverUrl = event.cover ? assetUrl(event.cover.url) : null;
  const ticketType = draft.showPrice && price ? `${typeName} · ${price}` : typeName;
  const logoTile = useSquare(draft.logo);
  const initials = organizerName.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "+";

  const { pictures, failed } = useTicketPictures({
    eventName: event.name,
    organizerName,
    when: event.starts_at ? formatMomentFull(event.starts_at, event.timezone) : "Date to be announced",
    whenShort: event.starts_at ? formatMomentShort(event.starts_at, event.timezone) : "Date to be announced",
    venue: draft.showVenue ? venue : null,
    guest: draft.showGuest ? "Guest name" : null,
    ticketType,
    code: SAMPLE_CODE,
    coverUrl: draft.background ?? coverUrl,
    color: draft.color,
    logo: draft.logo,
    note: draft.note,
    artwork: draft.artwork,
    photo: draft.background,
  }, [draft.design, ...layoutsOf(group)]);
  const picture = awaiting ? undefined : pictures[shown];

  const store = useMutation({
    mutationFn: (look: TicketLook) => saveSharedLook(orgId, event.id, look, saved),
    onSuccess: (_result, look) => {
      queryClient.setQueryData(designKey, { shared: true, look });
      saveTicketLook(event.id, null);
      toast.success("Design saved", { body: "Buyers now get this design on their tickets." });
    },
    onError: (error) => {
      toast.error("Couldn't save the design", { body: describeApiError(error, "event") });
      // Part of it may have been saved: read what the server holds now.
      void queryClient.invalidateQueries({ queryKey: designKey });
    },
  });
  const remove = useMutation({
    mutationFn: () => removeTicketDesign(orgId, event.id),
    onSuccess: () => {
      queryClient.setQueryData(designKey, { shared: true, look: null });
      saveTicketLook(event.id, null);
      setDraft(DEFAULT_LOOK);
      toast.info("Design removed");
    },
    onError: (error) => toast.error("Couldn't remove the design", { body: describeApiError(error, "event") }),
  });

  function save() {
    if (shared) store.mutate(draft);
    else if (saveTicketLook(event.id, draft)) toast.success("Design saved", { body: "Tickets you print or download here now use it." });
    else toast.error("Couldn't save the design", { body: "This browser is out of room. Use smaller pictures." });
  }

  const note = !shared
    ? "Saved in this browser only. Buyers still choose from the standard designs, because the server can't store ticket designs yet."
    : saved
      ? "Buyers get the saved design on their tickets, and no other."
      : browserLook
        ? "This design is only in this browser. Save it so buyers get it."
        : "Save a design and buyers get that one only. Until then they choose from the standard designs.";

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">Ticket design</h1>
          <p className="type-body m-0 text-text-soft">For {event.name}. The preview changes as you edit.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {changed && <span className="type-body-sm mr-1 text-text-soft">Unsaved changes</span>}
          <Button type="button" variant="secondary" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back to event
          </Button>
          {saved && (
            <Button type="button" variant="secondary" onClick={() => setResetOpen(true)}>
              Remove design
            </Button>
          )}
          <Button type="button" loading={store.isPending} loadingLabel="Saving" disabled={(custom && !draft.artwork) || remove.isPending || (saved !== null && !changed)} onClick={save}>
            Save design
          </Button>
        </div>
      </div>

      {/* The columns keep their width in every layout, so nothing moves under the pointer while peeking. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,580px)]">
        {/* Phones see the ticket first; from a laptop up it sits on the right and stays in view. */}
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
          <Card>
            <CardHeader title="Layout" subtitle="Point at one to see it, click to choose it." />
            <TicketLayoutPicker
              value={draft.design}
              group={group}
              pictures={pictures}
              onGroupChange={setGroup}
              onChange={(v) => set("design", v)}
              // Only beside the settings: above them (a narrow screen), a changing height would move the cards.
              onPeek={(v) => setPeek(v && window.matchMedia("(min-width: 1024px)").matches ? v : null)}
            />
          </Card>

          {custom ? (
            <TicketArtworkCards value={draft.artwork} onChange={(v) => set("artwork", v)} />
          ) : (
            <>
              <TicketColourPicker value={draft.color} onChange={(v) => set("color", v)} />

              <Card>
                <CardHeader title="Pictures" subtitle="Both are optional." />
                <div className="flex flex-col divide-y divide-border">
                  <div className="pb-5">
                    <PictureField title="Your picture" hint={pictureHint} initials="+" value={draft.background} maxSide={1600} type="image/jpeg" onChange={(v) => set("background", v)} />
                  </div>
                  <div className="pt-5">
                    <PictureField title="Logo" hint="Shown on a white background." initials={initials} value={draft.logo} shown={logoTile} maxSide={440} type="image/png" onChange={(v) => set("logo", v)} />
                  </div>
                </div>
              </Card>
            </>
          )}

          <Card>
            <CardHeader title="Details" subtitle="What else the ticket says." />
            <div className="flex flex-col gap-5">
              <Field label="Note" htmlFor="ticket-note" hint={`Optional, one line. ${custom ? "Printed under the code" : 'Replaces "Show this QR or the code at the door"'}. ${draft.note.length}/${NOTE_MAX}`}>
                <Input id="ticket-note" value={draft.note} maxLength={NOTE_MAX} onChange={(e) => set("note", e.target.value)} placeholder="Bring a photo ID" autoComplete="off" />
              </Field>
              <div className="flex flex-col gap-3">
                {!allFree && <Switch checked={draft.showPrice} onCheckedChange={(v) => set("showPrice", v)} label="Show the price" />}
                {!custom && <Switch checked={draft.showVenue} onCheckedChange={(v) => set("showVenue", v)} label="Show the venue" />}
                <Switch checked={draft.showGuest} onCheckedChange={(v) => set("showGuest", v)} label="Show the guest's name" />
              </div>
            </div>
          </Card>
        </div>

        <aside className="order-1 flex min-w-0 flex-col gap-3 lg:sticky lg:top-0 lg:order-2">
          <div className="flex flex-col gap-4 rounded-md border border-border bg-surface-2 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="type-label m-0 text-text-soft">Preview</h2>
              <Pill tone="neutral">{peek && peek !== draft.design ? `Showing ${shownLabel}` : "Sample code"}</Pill>
            </div>
            {/* A tall ticket is held to the window's height, so all of it shows while you edit. */}
            <div className="mx-auto w-full" style={size.width > size.height ? undefined : { maxWidth: `clamp(220px, calc((100dvh - 390px) * ${size.width / size.height}), 360px)` }}>
              {awaiting ? (
                <EmptyState size="sm" icon={<Upload />} title="No artwork yet" description="Upload your ticket picture to see it here." />
              ) : picture ? (
                // eslint-disable-next-line @next/next/no-img-element -- the ticket drawn in this browser
                <img
                  src={picture}
                  alt={`${shownLabel} ticket preview for ${event.name}, code ${SAMPLE_CODE}`}
                  width={size.width}
                  height={size.height}
                  className={placing ? "block h-auto w-full cursor-crosshair rounded-md shadow" : "block h-auto w-full rounded-md shadow"}
                  onClick={(e) => {
                    if (!placing) return;
                    const box = e.currentTarget.getBoundingClientRect();
                    set("artwork", { ...placing, x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height });
                  }}
                />
              ) : failed ? (
                <p className="type-body m-0 text-center text-text-soft">We couldn&apos;t draw the preview. Remove the pictures and try again.</p>
              ) : (
                <div className="w-full" style={{ aspectRatio: `${size.width} / ${size.height}` }}>
                  <Skeleton className="size-full rounded-md" />
                </div>
              )}
            </div>
            <p className="type-body-sm m-0 text-center text-text-faint">The sample code won&apos;t open the door.</p>
          </div>
          <Note icon={shared ? <Users /> : <MonitorSmartphone />} className="mt-0 max-w-none">
            {note}
          </Note>
        </aside>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Remove this design?"
        description={shared ? "Buyers go back to choosing from the standard designs." : "Tickets go back to the standard designs."}
        confirmLabel="Remove design"
        cancelLabel="Keep it"
        onConfirm={() => {
          setResetOpen(false);
          if (shared) return remove.mutate();
          saveTicketLook(event.id, null);
          setDraft(DEFAULT_LOOK);
          toast.info("Design removed");
        }}
      />
    </div>
  );
}

/** /events/{id}/design: the event's ticket design, on its own full page. */
export function TicketDesignPage({ event, venueName, onBack }: { event: StaffEvent; venueName: string | null; onBack: () => void }) {
  const design = useEventTicketDesign(event.organization_id, event.id);
  if (design.loading) return <Skeleton shape="block" height={420} />;
  if (design.error && !design.shared) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load the ticket design"
        description={describeApiError(design.error, "event")}
        actions={
          <>
            <Button variant="secondary" onClick={onBack}>
              Back to event
            </Button>
            <Button onClick={design.retry}>Try again</Button>
          </>
        }
      />
    );
  }
  return <Editor key={event.id} event={event} saved={design.look} shared={design.shared} browserLook={design.browserLook} venueName={venueName} onBack={onBack} />;
}
