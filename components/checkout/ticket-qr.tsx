"use client";

import { Download, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { TextLink } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toaster";

/**
 * One ticket's QR (Phase 8). The payload is the ticket's 8-character code and nothing else: never the order reference or
 * token, so a friend given one QR can't see the rest of the order. Always dark on white, whatever the theme, so every
 * scanner reads it; a saved image works offline (the gate checks online). Same library and settings family as
 * bookings' passes (`qrcode`, at least 240 px, a quiet margin).
 */
export function TicketQr({ code, label, size = 120, downloadName }: { code: string; label: string; size?: number; downloadName?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  // Only phones and some browsers can share a file; elsewhere the button isn't shown (Save still works).
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.canShare === "function");
  const fileName = `${downloadName ?? "ticket"}-${code}.png`;

  useEffect(() => {
    let cancelled = false;
    // "M" error correction survives a cracked screen or a glare.
    QRCode.toDataURL(code, { width: Math.max(240, size * 2), margin: 2, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } })
      .then((url) => !cancelled && setSrc(url))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [code, size]);

  function save() {
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /** The device share sheet with the QR image and its code, so one ticket can go to a friend. */
  async function share() {
    if (!src) return;
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      const data: ShareData = { files: [file], title: "Ticket", text: `Ticket code ${code}` };
      if (!navigator.canShare(data)) {
        save();
        return;
      }
      await navigator.share(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Couldn't share the ticket", { body: "Save the image and send it instead." });
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="rounded-sm border border-border bg-paper p-1.5" style={{ width: size + 12, height: size + 12 }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, not a file next/image can optimize
          <img src={src} alt={label} width={size} height={size} className="block" />
        ) : (
          <div className="size-full" aria-hidden="true" />
        )}
      </div>
      <div className="flex items-center gap-3">
        <TextLink onClick={save} disabled={!src}>
          <Download className="mr-1 inline size-3.5" />
          Save
        </TextLink>
        {canShare && (
          <TextLink onClick={() => void share()} disabled={!src}>
            <Share2 className="mr-1 inline size-3.5" />
            Share
          </TextLink>
        )}
      </div>
    </div>
  );
}
