"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Note } from "../../../../components/ui/note";
import { cn } from "../../../../lib/utils";

/**
 * A group of related settings in one card: a heading, then rows separated by hairlines.
 * One card per group (not per field) keeps the page calm and lets the rows use the full width.
 */
export function SettingsGroup({
  title,
  description,
  actions,
  footer,
  children,
  className,
}: {
  title: string;
  description?: string;
  /** One control at the top right of the group, such as a secondary button. */
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-0", className)}>
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="type-h3 m-0 text-text">{title}</h2>
          {description && <p className="type-body-sm m-0 text-text-soft">{description}</p>}
        </div>
        {actions && <div className="flex-none">{actions}</div>}
      </div>
      <div className="divide-y divide-border">{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3 rounded-b-md">{footer}</div>}
    </Card>
  );
}

/**
 * One setting. By default the label and its explanation sit on the left and the control on the right.
 * `inline` puts a small control (a switch) level with the label instead. `stacked` gives the control the full width.
 */
export function SettingsRow({
  label,
  description,
  htmlFor,
  inline = false,
  stacked = false,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  htmlFor?: string;
  inline?: boolean;
  stacked?: boolean;
  children: ReactNode;
}) {
  const text = (
    <div className="flex min-w-0 flex-col gap-0.5">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="type-body font-medium text-text">
          {label}
        </label>
      ) : (
        <span className="type-body font-medium text-text">{label}</span>
      )}
      {description && <span className="type-body-sm text-text-soft">{description}</span>}
    </div>
  );

  if (inline) {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        {text}
        <div className="flex flex-none items-center">{children}</div>
      </div>
    );
  }
  return (
    <div className={cn("grid grid-cols-1 gap-3 px-5 py-4", stacked ? "" : "md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8")}>
      {text}
      <div className="min-w-0 md:max-w-md">{children}</div>
    </div>
  );
}

/** Says plainly that the data on a tab is an example, so nobody mistakes it for a live connection. */
export function SampleNote({ children }: { children: ReactNode }) {
  return <Note>{children}</Note>;
}

/**
 * Appears when a form has unsaved changes: it floats at the bottom of the page so Save and Reset are always in reach.
 * Hidden when there is nothing to save. Put it inside the `<form>`.
 */
export function SaveBar({ dirty, saving = false, onReset, saveLabel = "Save changes" }: { dirty: boolean; saving?: boolean; onReset: () => void; saveLabel?: string }) {
  if (!dirty) return null;
  return (
    <div role="status" aria-live="polite" className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 shadow-panel">
      <span className="type-body flex items-center gap-2 text-text">
        <span aria-hidden="true" className="size-2 rounded-full bg-warning" />
        You have unsaved changes
      </span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={onReset} disabled={saving}>
          Reset
        </Button>
        <Button type="submit" loading={saving} loadingLabel="Saving">
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * A working copy of saved values. Edit the draft, `reset()` goes back to what is saved, and `dirty` says whether they differ.
 * When the saved values change (after a save) the draft follows them. Reports dirtiness upward so the page can warn before leaving.
 */
export function useDraft<T extends object>(saved: T, onDirtyChange?: (dirty: boolean) => void) {
  const [draft, setDraft] = useState<T>(saved);
  // When the saved values change (after a save), the draft follows them. Done while rendering, as React recommends, not in an effect.
  const [lastSaved, setLastSaved] = useState<T>(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setDraft(saved);
  }

  const dirty = (Object.keys(saved) as (keyof T)[]).some((k) => draft[k] !== saved[k]);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => setDraft((d) => ({ ...d, [key]: value })), []);
  const reset = useCallback(() => setDraft(saved), [saved]);
  return { draft, set, dirty, reset };
}

export interface TabProps {
  /** Tell the page this tab has unsaved changes, so it can ask before the user leaves. */
  onDirtyChange: (dirty: boolean) => void;
}
