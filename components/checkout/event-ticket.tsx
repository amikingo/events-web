"use client";

import { Download, Printer, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useTicketDesign } from "@/components/checkout/ticket-design";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { formatMomentFull, formatMomentShort } from "@/lib/ethiopian-datetime";
import type { TicketLook } from "@/lib/ticket-look";
import { renderTicketImage, ticketSize } from "@/lib/ticket-image";

export interface EventTicketProps {
  eventName: string;
  /** For the saved file's name. */
  eventSlug: string;
  organizerName: string;
  startsAt: string | null;
  timeZone: string;
  venue?: string | null;
  /** A full address of the event's cover image. */
  coverUrl?: string | null;
  ticketType: string;
  /** Left out when it isn't known. */
  guest?: string | null;
  code: string;
  /** "Ticket 1 of 2". */
  position?: string;
  /** The event's own design (the editor). Without it, the design chosen in the switch is used. */
  look?: TicketLook;
}

/**
 * One ticket in the chosen design. The picture on screen is the very one that's downloaded, shared and printed
 * (`lib/ticket-image.ts`). The QR holds the code only.
 */
export function EventTicket({ eventName, eventSlug, organizerName, startsAt, timeZone, venue, coverUrl, ticketType, guest, code, position, look }: EventTicketProps) {
  const chosen = useTicketDesign();
  const design = look?.design ?? chosen;
  // The editor can hide details and swap the picture.
  const shownVenue = look && !look.showVenue ? null : venue;
  const shownGuest = look && !look.showGuest ? null : guest;
  const picture = look?.background ?? coverUrl;
  const [busy, setBusy] = useState<"share" | null>(null);
  // Only some browsers can share a file; elsewhere the button isn't shown.
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.canShare === "function");
  const when = startsAt ? formatMomentFull(startsAt, timeZone) : "Date to be announced";
  const whenShort = startsAt ? formatMomentShort(startsAt, timeZone) : "Date to be announced";
  const fileName = `${eventSlug}-${code}.png`;
  // Everything drawn, as one key: a change means a new picture, and an old one is never shown for it.
  const wanted = JSON.stringify([design, eventName, organizerName, when, shownVenue, shownGuest, ticketType, code, picture, look?.color, look?.logo, look?.note, look?.artwork]);
  const [drawn, setDrawn] = useState<{ key: string; url: string; blob: Blob } | { key: string; failed: true } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      // Large, with a quiet margin and medium error correction, so a saved or printed ticket still scans.
      const qr = await QRCode.toDataURL(code, { width: 480, margin: 2, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
      const blob = await renderTicketImage(
        { eventName, organizerName, when, whenShort, venue: shownVenue, guest: shownGuest, ticketType, code, coverUrl: picture, qr, color: look?.color, logo: look?.logo, note: look?.note, artwork: look?.artwork, photo: look?.background },
        design,
      );
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setDrawn({ key: wanted, url, blob });
    })().catch(() => !cancelled && setDrawn({ key: wanted, failed: true }));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [wanted, design, eventName, organizerName, when, whenShort, shownVenue, shownGuest, ticketType, code, picture, look?.color, look?.logo, look?.note, look?.artwork, look?.background]);

  const ready = drawn && drawn.key === wanted && "url" in drawn ? drawn : null;
  const failed = drawn?.key === wanted && "failed" in drawn;
  const size = ticketSize(design, look?.artwork);
  const description = [`${ticketType} ticket for ${eventName}`, organizerName, when, shownVenue, shownGuest ? `Guest ${shownGuest}` : null, `Code ${code.split("").join(" ")}`]
    .filter(Boolean)
    .join(". ");

  function download() {
    if (!ready) return;
    const link = document.createElement("a");
    link.href = ready.url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function share() {
    if (!ready) return;
    setBusy("share");
    try {
      const data: ShareData = { files: [new File([ready.blob], fileName, { type: "image/png" })], title: eventName, text: `${eventName}: ticket ${code}` };
      if (navigator.canShare(data)) await navigator.share(data);
      else download();
    } catch (error) {
      // Closing the share sheet isn't a failure.
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Couldn't share the ticket", { body: "Download it and send it instead." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={size.width > size.height ? "mx-auto flex w-full max-w-[720px] flex-col gap-3" : "mx-auto flex w-full max-w-[420px] flex-col gap-3"}>
      {ready ? (
        // eslint-disable-next-line @next/next/no-img-element -- the ticket drawn in this browser
        <img src={ready.url} alt={description} width={size.width} height={size.height} className="block h-auto w-full rounded-md shadow" />
      ) : failed ? (
        <p className="type-body m-0 rounded-md border border-border bg-surface p-6 text-center text-text-soft">
          We couldn&apos;t draw this ticket. Your code is <b className="font-mono text-text">{code}</b>; show it at the door.
        </p>
      ) : (
        <div className="w-full" style={{ aspectRatio: `${size.width} / ${size.height}` }}>
          <Skeleton className="size-full rounded-md" />
        </div>
      )}
      <p className="type-body-sm m-0 text-center text-text-soft">
        Code <b className="font-mono text-text">{code}</b>
        {position ? ` · ${position}` : ""}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="secondary" disabled={!ready} onClick={download}>
          <Download className="size-4" />
          Download
        </Button>
        {canShare && (
          <Button variant="secondary" loading={busy === "share"} loadingLabel="Sharing" disabled={!ready} onClick={() => void share()}>
            <Share2 className="size-4" />
            Share
          </Button>
        )}
        <Button variant="secondary" disabled={!ready} onClick={() => ready && printImage(URL.createObjectURL(ready.blob))}>
          <Printer className="size-4" />
          Print
        </Button>
      </div>
    </div>
  );
}

/** Prints one picture on its own page, through a hidden frame, without touching the page behind it. */
function printImage(url: string) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const style = doc.createElement("style");
  style.textContent = "@page{margin:12mm}body{margin:0;display:flex;justify-content:center}img{max-width:100%;max-height:260mm}";
  const image = doc.createElement("img");
  image.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // Long enough for the print dialog to have read the page.
    window.setTimeout(() => {
      frame.remove();
      URL.revokeObjectURL(url);
    }, 60_000);
  };
  image.src = url;
  doc.head.appendChild(style);
  doc.body.appendChild(image);
}
