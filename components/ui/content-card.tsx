import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card, CardFooter } from "./card";
import type { CardProps } from "./card";
import { Pill } from "./pill";
import { Skeleton } from "./skeleton";

export interface ContentCardProps extends Omit<CardProps, "title"> {
  /** Small tag on the media ("Spa", "Guide"). */
  tag?: ReactNode;
  /** `brand` gradient (services), `charcoal` gradient (articles), or `image` with `imageSrc` (4:3-cropped photo). Never both. */
  media?: "brand" | "charcoal" | "image";
  imageSrc?: string;
  imageAlt?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Meta line under the description: an icon plus text ("Soreti Spa, Bole · 1.2 km"). */
  meta?: ReactNode;
  metaIcon?: ReactNode;
  /** Footer: a figure or note on the left, one action on the right. */
  footerLeft?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
}

/** Media on top, title, description, meta, a footer with one action. Hoverable by default — the whole card opens the item. */
export function ContentCard({ tag, media = "brand", imageSrc, imageAlt = "", title, description, meta, metaIcon, footerLeft, action, loading, hoverable = true, className, ...props }: ContentCardProps) {
  if (loading) {
    return (
      <Card aria-busy="true" className={cn("flex flex-col overflow-hidden p-0", className)}>
        <Skeleton shape="media" />
        <div className="flex flex-col gap-1.5 px-4 pb-4 pt-3.5">
          <Skeleton shape="title" />
          <Skeleton width="90%" />
          <Skeleton width="40%" />
        </div>
      </Card>
    );
  }
  return (
    <Card hoverable={hoverable} className={cn("flex flex-col overflow-hidden p-0", className)} {...props}>
      <div className={cn("relative h-[120px]", media === "brand" && "bg-gradient-media", media === "charcoal" && "bg-gradient-media-charcoal")}>
        {media === "image" && imageSrc && <img src={imageSrc} alt={imageAlt} className="size-full object-cover" />}
        {tag && <Pill className="absolute left-2.5 top-2.5 bg-white/92 text-accent">{tag}</Pill>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3.5">
        <h4 className="m-0 text-[14px] font-semibold leading-[1.3] text-text">{title}</h4>
        {description && <p className="m-0 text-[12.5px] leading-[1.5] text-text-soft">{description}</p>}
        {meta && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-text-faint [&_svg]:size-[13px]">
            {metaIcon}
            {meta}
          </div>
        )}
      </div>
      {(footerLeft || action) && (
        <CardFooter className="mx-4 mb-4 mt-auto pt-3">
          {footerLeft}
          {action}
        </CardFooter>
      )}
    </Card>
  );
}
