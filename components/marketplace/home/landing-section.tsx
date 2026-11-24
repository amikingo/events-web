import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { ChevRightIcon } from "../../ui/icons";
import { Container } from "../section";
import { landingType } from "./landing-type";
import { Reveal } from "./reveal";

/** Eyebrow + display heading + intro, with an optional "see all" link. Landing page only. */
export function LandingHeading({ id, eyebrow, title, description, href, linkLabel = "See all", action, className }: { id: string; eyebrow?: string; title: ReactNode; description?: ReactNode; href?: string; linkLabel?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:mb-10 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 max-w-[720px]">
        {eyebrow && <p className={cn("m-0 text-accent-text", landingType.eyebrow)}>{eyebrow}</p>}
        <h2 id={id} className={cn("m-0 mt-2 text-text", landingType.title)}>
          {title}
        </h2>
        {description && <p className={cn("m-0 mt-3 text-text-soft", landingType.lead)}>{description}</p>}
      </div>
      {action}
      {href && (
        <Link href={href} className="inline-flex flex-none items-center gap-1 self-start rounded-full border border-border bg-surface px-4 py-2 type-body-sm font-semibold text-text transition-colors hover:border-border-strong md:self-auto">
          {linkLabel}
          <ChevRightIcon className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

export function LandingSection({ id, eyebrow, title, description, href, linkLabel, className, children }: { id: string; eyebrow?: string; title: ReactNode; description?: ReactNode; href?: string; linkLabel?: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn("py-14 sm:py-20", className)}>
      <Container>
        <Reveal>
          <LandingHeading id={id} eyebrow={eyebrow} title={title} description={description} href={href} linkLabel={linkLabel} />
        </Reveal>
        <Reveal delay={120}>{children}</Reveal>
      </Container>
    </section>
  );
}
