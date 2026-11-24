"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card } from "./card";
import { ChevRightIcon } from "./icons";
import { IconTile } from "./icon-tile";

export interface ActionCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** `row` is label + chevron; `tile` stacks vertically for home-screen grids and drops the chevron. */
  layout?: "row" | "tile";
  href?: string;
}

/** The whole card is the button: icon tile, label, optional sub-label, chevron that nudges and turns accent on hover. Always lifts on hover. */
export function ActionCard({ icon, title, subtitle, layout = "row", href, className, ...props }: ActionCardProps) {
  const tile = layout === "tile";
  const body = (
    <>
      <IconTile size="md" className={cn(tile && "size-11 rounded-md! [&_svg]:size-[22px]")}>
        {icon}
      </IconTile>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-text">{title}</div>
        {subtitle && <div className="text-[11.5px] text-text-faint">{subtitle}</div>}
      </div>
      {!tile && <ChevRightIcon className="size-4 flex-none text-text-faint transition-[transform,color] group-hover:translate-x-[3px] group-hover:text-accent" />}
    </>
  );
  const cls = cn("group flex", tile ? "flex-col items-start gap-3 p-4" : "items-center gap-3.5 px-4 py-3.5", className);
  return href ? (
    <Card hoverable className={cls} {...props}>
      <a href={href} className="contents">
        {body}
      </a>
    </Card>
  ) : (
    <Card
      hoverable
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      className={cls}
      {...props}
    >
      {body}
    </Card>
  );
}
