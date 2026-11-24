"use client";

import { useState } from "react";
import type { ImgHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import { ImageIcon } from "./icons";
import { Skeleton } from "./skeleton";

/** `.ld-img` — an image that shows a shimmering placeholder (with a faint picture glyph) until it has loaded, so nothing shifts. */
export function LazyImage({ className, alt, onLoad, ...props }: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn("relative flex h-[120px] w-full items-center justify-center overflow-hidden rounded-tile bg-surface-2 text-text-faint", className)}>
      {!loaded && (
        <>
          <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
          <ImageIcon className="relative size-[22px]" />
        </>
      )}
      <img
        alt={alt}
        loading="lazy"
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={cn("absolute inset-0 size-full object-cover transition-opacity duration-(--motion-base)", loaded ? "opacity-100" : "opacity-0")}
        {...props}
      />
    </div>
  );
}
