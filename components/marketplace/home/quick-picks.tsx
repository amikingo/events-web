"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { ChevRightIcon } from "../../ui/icons";
import { SegmentedControl } from "../../ui/segmented-control";
import { LandingHeading } from "./landing-section";

export interface PickTab {
  value: string;
  label: string;
  count: number;
  href: string;
  /** Rendered on the server; switching tabs just shows another panel (no fetch, no layout jump). */
  content: ReactNode;
}

/** "What's on?" answered in one tap: this week, today, this weekend, free, online. */
export function QuickPicks({ tabs }: { tabs: PickTab[] }) {
  const [value, setValue] = useState(tabs[0]!.value);
  const active = tabs.find((t) => t.value === value) ?? tabs[0]!;
  return (
    <div>
      <LandingHeading
        id="quick-picks"
        eyebrow="Quick picks"
        title={<>What&rsquo;s on?</>}
        description="This week, tonight, this weekend, or free. One tap."
        action={
          <div className="-mx-4 flex-none overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
            <SegmentedControl aria-label="Show events for" value={value} onValueChange={setValue} options={tabs.map((t) => ({ value: t.value, label: t.label, count: t.count }))} />
          </div>
        }
      />
      <div key={active.value} className="animate-emp-in motion-reduce:animate-none" aria-live="polite">
        {active.content}
      </div>
      <div className="mt-6 flex justify-center">
        <Link href={active.href} className="inline-flex items-center gap-1 rounded-sm type-body-sm font-semibold text-accent-text hover:underline">
          See all {active.label.toLowerCase()} events
          <ChevRightIcon className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
