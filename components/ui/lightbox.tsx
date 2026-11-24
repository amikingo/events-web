"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { ChevIcon, DownloadIcon, XIcon } from "./icons";
import { Overlay } from "./modal";

export interface LightboxItem {
  /** Image URL; omit for the gradient placeholder (documents, missing media). */
  src?: string;
  alt?: string;
  caption?: ReactNode;
  /** `document` draws the paper-page placeholder instead of an image. */
  kind?: "image" | "document";
}

export interface LightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** The muted line beside the title ("3 of 5"). */
  meta?: ReactNode;
  items: LightboxItem[];
  /** Starting slide. */
  index?: number;
  onDownload?: (item: LightboxItem, index: number) => void;
  container?: "viewport" | "parent";
}

/** Image / document preview on the dark backdrop: title and actions on top, the media, caption and dots below. Arrow keys move between items. */
export function Lightbox({ open, onOpenChange, title, meta, items, index = 0, onDownload, container }: LightboxProps) {
  const [current, setCurrent] = useState(index);
  useEffect(() => {
    if (open) setCurrent(index);
  }, [open, index]);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setCurrent((c) => Math.min(c + 1, items.length - 1));
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(c - 1, 0));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, items.length]);

  const item = items[current];
  const actionClass = "flex size-8 items-center justify-center rounded-sm border border-white/[0.18] bg-white/[0.12] text-white hover:bg-white/20";
  const navClass = "absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-sm bg-white/90 text-paper-ink disabled:opacity-40";

  return (
    <Overlay open={open} onOpenChange={onOpenChange} dark container={container}>
      <div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Preview"} tabIndex={-1} className="relative z-[1] flex w-full max-w-[640px] animate-mdl-in flex-col gap-3 text-white motion-reduce:animate-none">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-[13.5px] font-semibold">
            {title}{meta && <small className="block text-[11.5px] font-normal opacity-70">{meta}</small>}
          </div>
          <div className="flex gap-2">
          {onDownload && item && (
            <button type="button" aria-label="Download" className={actionClass} onClick={() => onDownload(item, current)}>
              <DownloadIcon className="size-4" />
            </button>
          )}
          <button type="button" aria-label="Close" data-autofocus className={actionClass} onClick={() => onOpenChange(false)}>
            <XIcon className="size-4" />
          </button>
          </div>
        </div>
        <div className="relative flex h-[260px] items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-accent-soft to-accent">
          {item?.kind === "document" && <DocumentPage />}
          {item?.src && <img src={item.src} alt={item.alt ?? ""} className="absolute inset-0 size-full object-cover" />}
          {items.length > 1 && (
            <>
              <button type="button" aria-label="Previous" disabled={current === 0} onClick={() => setCurrent(current - 1)} className={cn(navClass, "left-3")}>
                <ChevIcon className="size-4 rotate-90" />
              </button>
              <button type="button" aria-label="Next" disabled={current === items.length - 1} onClick={() => setCurrent(current + 1)} className={cn(navClass, "right-3")}>
                <ChevIcon className="size-4 -rotate-90" />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-[12.5px] opacity-85">{item?.caption}</p>
          {items.length > 1 && (
            <div className="flex gap-[5px]">
              {items.map((_, i) => (
                <button key={i} type="button" aria-label={`Show item ${i + 1}`} onClick={() => setCurrent(i)} className={cn("size-1.5 rounded-full", i === current ? "bg-white" : "bg-white/35")} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

/** `.lb-doc` — the paper page shown for documents; stays white in dark mode like the page it stands for. */
function DocumentPage() {
  return (
    <div aria-hidden="true" className="flex h-[180px] w-[140px] flex-col gap-[7px] rounded-sm bg-paper p-3.5 shadow-paper">
      <i className="block h-[9px] w-3/5 rounded-line bg-paper-ink" />
      <i className="block h-[7px] rounded-line bg-paper-line" />
      <i className="block h-[7px] rounded-line bg-paper-line" />
      <i className="block h-[7px] w-[70%] rounded-line bg-paper-line" />
      <i className="block h-[7px] w-2/5 rounded-line bg-accent" />
    </div>
  );
}
