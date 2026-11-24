"use client";

import { notFound } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Chip } from "../../../components/ui/chip";
import { EmptyState } from "../../../components/ui/empty-state";
import { Input } from "../../../components/ui/input";
import { toast } from "../../../components/ui/toaster";
import { SHOWCASE_ENTRIES } from "../../../lib/showcase/registry";
import { SHOWCASE_CATEGORIES } from "../../../lib/showcase/types";
import type { ShowcaseEntry } from "../../../lib/showcase/types";

function EntrySection({ entry }: { entry: ShowcaseEntry }) {
  const { Demo } = entry;

  async function copy() {
    try {
      await navigator.clipboard.writeText(entry.code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy", { body: "Select the code and copy it by hand." });
    }
  }

  return (
    <section id={entry.id} className="flex scroll-mt-20 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="type-h2 m-0 text-text">{entry.name}</h2>
          <span className="type-body-sm text-text-faint">{entry.category}</span>
        </div>
        <p className="type-body m-0 text-text-soft">{entry.summary}</p>
      </header>

      <div className="flex flex-col gap-2">
        <p className="type-body font-medium m-0 text-text-soft">Where you see it: {entry.scenario}</p>
        <div className="rounded-md border border-border bg-surface p-5">
          <Demo />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <h3 className="type-body font-medium m-0 text-text">Use it when</h3>
          <ul className="type-body m-0 flex list-disc flex-col gap-1 pl-5 text-text-soft">
            {entry.whenToUse.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        {entry.avoid && (
          <div className="flex flex-col gap-1.5">
            <h3 className="type-body font-medium m-0 text-text">Use something else when</h3>
            <ul className="type-body m-0 flex list-disc flex-col gap-1 pl-5 text-text-soft">
              {entry.avoid.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="type-body-sm font-mono text-text-faint">{entry.source}</span>
          <Button variant="secondary" onClick={copy}>
            Copy code
          </Button>
        </div>
        <pre className="m-0 overflow-x-auto rounded-md border border-border bg-surface-2 p-4 font-mono text-[12.5px] leading-[1.6] text-text">
          <code>{entry.code}</code>
        </pre>
      </div>
    </section>
  );
}

export default function ComponentsPage() {
  // The component showcase is a development aid; production builds answer 404 here.
  if (process.env.NODE_ENV === "production") notFound();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SHOWCASE_ENTRIES.filter((e) => {
      if (category !== "All" && e.category !== category) return false;
      if (!q) return true;
      return [e.name, e.summary, e.scenario, e.category].some((s) => s.toLowerCase().includes(q));
    });
  }, [query, category]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-16">
      <header className="flex flex-col gap-2">
        <h1 className="type-h1 m-0 text-text">Components</h1>
        <p className="type-body m-0 text-text-soft">
          Each component is shown inside the screen where it belongs, with when to use it and the code to copy.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Input
          aria-label="Search components"
          placeholder="Search by name or screen, for example “payments”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {["All", ...SHOWCASE_CATEGORIES].map((c) => (
            <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No components match"
          description="Try a different word, or clear the category filter."
          actions={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-12">
          {visible.map((entry) => (
            <EntrySection key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
