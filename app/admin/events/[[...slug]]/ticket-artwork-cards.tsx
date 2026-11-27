"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { FileUpload } from "@/components/ui/file-upload";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toaster";
import { formatBytes } from "@/lib/format";
import { QR_SIZES } from "@/lib/ticket-image";
import type { TicketArtwork } from "@/lib/ticket-image";
import { loadArtwork } from "@/lib/ticket-look";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];
/** The shortest side an artwork may have: anything smaller prints badly. */
const MIN_SIDE = 300;

const PLACES = [
  { label: "Top left", x: 0, y: 0 },
  { label: "Top", x: 0.5, y: 0 },
  { label: "Top right", x: 1, y: 0 },
  { label: "Left", x: 0, y: 0.5 },
  { label: "Middle", x: 0.5, y: 0.5 },
  { label: "Right", x: 1, y: 0.5 },
  { label: "Bottom left", x: 0, y: 1 },
  { label: "Bottom", x: 0.5, y: 1 },
  { label: "Bottom right", x: 1, y: 1 },
];

/** The custom layout's settings: the uploaded ticket, then where its QR panel goes and how big it is. */
export function TicketArtworkCards({ value, onChange }: { value: TicketArtwork | null; onChange: (value: TicketArtwork | null) => void }) {
  async function read(file: File) {
    try {
      const bitmap = await createImageBitmap(file);
      const small = Math.min(bitmap.width, bitmap.height) < MIN_SIDE;
      bitmap.close();
      if (small) toast.error("That picture is too small", { body: `Use one at least ${MIN_SIDE} pixels on each side.` });
      else onChange(await loadArtwork(file));
    } catch {
      toast.error("Couldn't read that picture", { body: "Try another one." });
    }
  }

  return (
    <>
      <Card>
        <CardHeader title="Your artwork" subtitle="A ticket you made in a design tool or from a template. Leave a clear space for the QR code." />
        <div className="flex flex-col gap-3">
          <FileUpload
            multiple={false}
            accept={TYPES.join(",")}
            title={value ? "Drop another picture to replace it" : "Drop your ticket picture or browse"}
            hint="PNG, JPEG or WebP up to 10 MB"
            items={value ? [{ id: "artwork", name: `Artwork, ${value.width} × ${value.height}`, size: formatBytes(Math.round((value.image.length * 3) / 4)), status: "done", progress: 100, image: true }] : []}
            onFiles={(files) => {
              const file = files[0];
              if (!file) return;
              if (!TYPES.includes(file.type)) return "Choose a PNG, JPEG or WebP picture.";
              if (file.size > MAX_BYTES) return "The picture must be 10 MB or smaller.";
              void read(file);
            }}
            onRetry={() => undefined}
            onRemove={() => onChange(null)}
          />
          <p className="type-body-sm m-0 text-text-faint">Use only artwork whose licence lets you make event tickets with it.</p>
        </div>
      </Card>

      {value && (
        <Card>
          <CardHeader title="QR code" subtitle="Click the preview where it should go, or pick a place." />
          <div className="flex flex-col gap-5">
            <Field label="Place">
              <div role="group" aria-label="Place" className="flex flex-wrap gap-2">
                {PLACES.map((p) => {
                  const selected = value.x === p.x && value.y === p.y;
                  return (
                    <Chip key={p.label} type="button" selected={selected} aria-pressed={selected} onClick={() => onChange({ ...value, x: p.x, y: p.y })}>
                      {p.label}
                    </Chip>
                  );
                })}
              </div>
            </Field>
            <Field label="Size">
              <SegmentedControl
                aria-label="QR size"
                options={QR_SIZES.map((q) => ({ value: q.value, label: q.label }))}
                value={value.qrSize}
                onValueChange={(v) => onChange({ ...value, qrSize: v as TicketArtwork["qrSize"] })}
              />
            </Field>
          </div>
        </Card>
      )}
    </>
  );
}
