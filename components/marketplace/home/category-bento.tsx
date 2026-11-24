import Link from "next/link";
import { exploreHref } from "../../../lib/marketplace/query";
import { cn } from "../../../lib/utils";
import type { Category, CoverPattern } from "../../../types/marketplace";
import { ChevRightIcon } from "../../ui/icons";
import { EventCover } from "../event-cover";
import { landingType } from "./landing-type";

/**
 * Categories as an asymmetric grid: the busiest category leads as a 2×2 tile, the rest fill around it. With six
 * categories that is three full rows on desktop; on phones an odd last tile spans the row so nothing is left empty.
 */
export function CategoryBento({ categories }: { categories: (Category & { count: number; cover: CoverPattern })[] }) {
  const sorted = [...categories].sort((a, b) => b.count - a.count);
  return (
    <ul className="m-0 grid list-none auto-rows-[150px] grid-cols-2 gap-3 p-0 sm:auto-rows-[170px] md:grid-cols-3 md:gap-4">
      {sorted.map((c, i) => {
        const lead = i === 0;
        return (
          <li key={c.id} className={cn(lead && "col-span-2 row-span-2", !lead && i === sorted.length - 1 && (sorted.length - 1) % 2 === 1 && "max-md:col-span-2")}>
            <Link href={exploreHref({ category: c.id })} className="group relative isolate flex h-full flex-col justify-end overflow-hidden rounded-lg p-4 sm:p-5">
              <div className="absolute inset-0 -z-10 transition-transform duration-(--motion-slow) ease-(--ease-slow) group-hover:scale-[1.06] motion-reduce:transition-none">
                <EventCover seed={`cat-${c.id}`} pattern={c.cover} category={c.id} />
              </div>
              <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[color-mix(in_srgb,var(--color-paper-ink)_85%,transparent)] via-[color-mix(in_srgb,var(--color-paper-ink)_25%,transparent)] to-transparent" />
              <span className={cn("text-white", lead ? landingType.tile : landingType.card)}>{c.name}</span>
              {lead && <span className={cn("mt-2 max-w-[360px] text-white/80", landingType.lead)}>{c.description}</span>}
              <span className="mt-1 flex items-center justify-between gap-2 type-body-sm text-white/75">
                {c.count === 1 ? "1 event" : `${c.count} events`}
                <span className="flex size-7 items-center justify-center rounded-full bg-white/15 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <ChevRightIcon className="size-3.5" />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
