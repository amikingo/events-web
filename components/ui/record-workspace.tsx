"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { DestructiveDialog } from "./confirm-dialog";
import { ArrowLeftIcon, ChevIcon, ChevUpIcon, MaximizeIcon, MinimizeIcon, XIcon } from "./icons";
import { RecordForm } from "./record-form";
import type { RecordFormSection } from "./record-form";
import { RecordBody, RecordIdentity, RecordSkeleton, RecordStats } from "./record-view";
import type { RecordIdentityProps, RecordStat } from "./record-view";
import { Tab, TabList, Tabs } from "./tabs";
import { toast, Toaster } from "./toaster";

export type WorkspaceMode = "list" | "panel" | "page" | "form";

/** Where the workspace is, in URL terms. The peek panel is never in the URL; the page, create and edit each are. */
export type RecordLocation = { mode: "list" } | { mode: "page"; id: string | number } | { mode: "create" } | { mode: "edit"; id: string | number };

const locKey = (l: RecordLocation) => `${l.mode}:${"id" in l ? l.id : ""}`;

/** `/customers`, `/customers/C-1042`, `/customers/new`, `/customers/C-1042/edit`. */
export function recordPath(base: string, loc: RecordLocation): string {
  const b = base.replace(/\/$/, "");
  if (loc.mode === "page") return `${b}/${encodeURIComponent(String(loc.id))}`;
  if (loc.mode === "create") return `${b}/new`;
  if (loc.mode === "edit") return `${b}/${encodeURIComponent(String(loc.id))}/edit`;
  return b;
}

/** The inverse of `recordPath`; anything that isn't under `base` is the list. */
export function parseRecordPath(base: string, pathname: string): RecordLocation {
  const b = base.replace(/\/$/, "");
  if (!pathname.startsWith(b)) return { mode: "list" };
  const [first, second] = pathname.slice(b.length).split("/").filter(Boolean).map(decodeURIComponent);
  if (!first) return { mode: "list" };
  if (first === "new") return { mode: "create" };
  return second === "edit" ? { mode: "edit", id: first } : { mode: "page", id: first };
}

export interface WorkspaceApi<T> {
  /** Peek a record in the panel, or its full page with `{ page: true }` — on a given tab with `{ page: true, tab }`. */
  open: (record: T, opts?: { page?: boolean; tab?: string }) => void;
  edit: (record: T) => void;
  create: () => void;
  /** Ask for confirmation before a destructive action; nothing happens until the user confirms. */
  confirm: (opts: { title: string; description: string; confirmLabel: string; onConfirm: () => void }) => void;
}

export interface RecordWorkspaceProps<T> {
  records: T[];
  getId: (record: T) => string | number;
  /** Singular, lower-case ("customer"). */
  noun: string;
  /** The list's name, used in the breadcrumb ("Customers"). */
  listLabel: string;
  /** The list. Wire the three callbacks onto your `<Table>`: click / Enter opens the panel, Ctrl/Cmd + click the page. */
  list: (list: {
    onRowClick: (record: T, e: { ctrlKey: boolean; metaKey: boolean }) => void;
    activeRowId?: string | number;
    highlightIds: Set<string | number>;
    onCreate: () => void;
    /** Pass to `<Table onVisibleRowsChange>` so ↑ ↓ step through the rows as the table currently shows them (searched, filtered, sorted). */
    onVisibleRowsChange: (rows: T[]) => void;
  }) => ReactNode;
  /** Identity block shared by the panel and the page. `edit()` opens the form for this record. */
  identity: (record: T, api: WorkspaceApi<T>) => RecordIdentityProps;
  stats: (record: T) => RecordStat[];
  /** The panel's body: only what the list already knows. */
  panel: (record: T) => ReactNode;
  /** The full page: tabs with real data (loaded with a skeleton), and the side rail. */
  page: {
    tabs: { id: string; label: string; count?: (record: T) => number | undefined }[];
    content: (record: T, tab: string) => ReactNode;
    rail?: (record: T) => ReactNode;
    /** How long the page shows its skeleton while its own data loads. Default 600ms. */
    loadingMs?: number;
  };
  form: {
    sections: RecordFormSection[];
    /** Different sections for edit (create may provision an account, edit changes its role). Defaults to `sections`. */
    editSections?: RecordFormSection[];
    /** Existing values for edit. */
    toValues: (record: T) => Record<string, string>;
    /**
     * Persist and return the saved record — or a Promise of it for an API save, during which the form shows "Saving…".
     * Create returns the new record; it appears on the list and flashes. A rejected Promise keeps the form open with the error.
     */
    onSave: (values: Record<string, string>, existing: T | undefined) => T | Promise<T>;
    /** Toast titles: "Customer created" / "Changes saved" by default. */
    createdMessage?: string;
    savedMessage?: string;
  };
  /**
   * Make the page, create and edit states real routes. Pass the location your router currently has (`parseRecordPath(base, pathname)`)
   * and push the one you're handed back in `onLocationChange` (`recordPath(base, loc)`). Omit both and the workspace keeps its state locally.
   */
  location?: RecordLocation;
  onLocationChange?: (location: RecordLocation) => void;
  /** Height of the stage. Default 580px; use `h-full` to fill a flex content area. */
  className?: string;
  /**
   * Let the list card be as tall as its rows, so the pager sits right under the last row and the table's Filters panel can hang
   * below a short list. While a record peeks in the panel the card is at least 680px so the record has room; the page and the
   * forms keep the normal height (`className`, or 580px).
   */
  fit?: boolean;
  /** The toasts drawn inside the stage. Default on; pass `false` when the app has a root `<Toaster />`, or every toast appears twice. */
  inlineToasts?: boolean;
}

/**
 * The guideline's Detail view: click a row to peek (a 520px panel, no navigation, ↑ ↓ to step, Esc to close); ⤢ opens the
 * full page with tabs and a side rail; create and edit open the same full-page form, and leaving a dirty form asks first.
 * All four states live here so a developer only supplies the list and the record's content.
 */
export function RecordWorkspace<T>({ records, getId, noun, listLabel, list, identity, stats, panel, page, form, location, onLocationChange, className, fit = false, inlineToasts = true }: RecordWorkspaceProps<T>) {
  const [mode, setMode] = useState<WorkspaceMode>("list");
  const [openId, setOpenId] = useState<string | number | null>(null);
  const [tab, setTab] = useState(page.tabs[0]?.id ?? "");
  const [pageLoading, setPageLoading] = useState(false);
  const [formFor, setFormFor] = useState<"create" | string | number>("create");
  const [flash, setFlash] = useState<Set<string | number>>(new Set());
  const [confirmState, setConfirmState] = useState<Parameters<WorkspaceApi<T>["confirm"]>[0] | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState<T[] | null>(null);
  // Stepping follows the table's own order; a record that was filtered out after opening stays reachable at the front.
  const stepList = (() => {
    const base = visible ?? records;
    const current = records.find((r) => getId(r) === openId);
    return current && !base.some((r) => getId(r) === openId) ? [current, ...base] : base;
  })();
  const index = stepList.findIndex((r) => getId(r) === openId);
  const record = index >= 0 ? stepList[index] : undefined;
  const editing = formFor === "create" ? undefined : records.find((r) => getId(r) === formFor);

  const [loadToken, setLoadToken] = useState(0);
  function startLoad() {
    setPageLoading(true);
    setLoadToken((t) => t + 1);
  }
  // The skeleton ends on a timer owned by an effect, so it also survives React re-mounting the component in development.
  useEffect(() => {
    if (!pageLoading) return;
    const t = setTimeout(() => setPageLoading(false), page.loadingMs ?? 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageLoading, loadToken]);

  function open(r: T, opts?: { page?: boolean; tab?: string }) {
    if (document.activeElement instanceof HTMLElement && mode === "list") returnFocus.current = document.activeElement;
    setOpenId(getId(r));
    if (opts?.tab && page.tabs.some((t) => t.id === opts.tab)) setTab(opts.tab);
    if (opts?.page) {
      setMode("page");
      startLoad();
    } else if (mode === "list") setMode("panel");
  }
  function close() {
    setMode("list");
    setOpenId(null);
    requestAnimationFrame(() => returnFocus.current?.focus());
  }
  function step(delta: number) {
    const next = stepList[index + delta];
    if (!next) return;
    setOpenId(getId(next));
    if (mode === "page") startLoad();
  }
  function toPage() {
    if (mode === "panel") {
      setMode("page");
      startLoad();
    } else setMode("panel");
  }
  const api: WorkspaceApi<T> = {
    open,
    edit: (r) => {
      setFormFor(getId(r));
      setMode("form");
    },
    create: () => {
      setFormFor("create");
      setMode("form");
    },
    confirm: setConfirmState,
  };

  useEffect(() => {
    if (mode !== "panel" && mode !== "page") return;
    function onKey(e: KeyboardEvent) {
      const t = e.target instanceof Element ? e.target : document.body;
      if (t.closest("input, textarea, select, [role=menu], [role=dialog], [role=alertdialog]")) return;
      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        step(-1);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const here: RecordLocation = mode === "page" && openId !== null ? { mode: "page", id: openId } : mode === "form" ? (formFor === "create" ? { mode: "create" } : { mode: "edit", id: formFor }) : { mode: "list" };
  const hereKey = locKey(here);
  const reported = useRef(hereKey);
  // A location we just applied from the router: our own state catches up a render later, and must not be reported back as a change.
  const applying = useRef<string | null>(null);
  // Our state changed → tell the router (never for the peek panel, which stays out of the URL).
  useEffect(() => {
    if (applying.current) {
      if (applying.current !== hereKey) return;
      applying.current = null;
    }
    if (!onLocationChange || reported.current === hereKey) return;
    reported.current = hereKey;
    onLocationChange(here);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hereKey]);
  // The router changed (back button, a shared link) → follow it.
  const wantedKey = location ? locKey(location) : null;
  useEffect(() => {
    if (!location || wantedKey === reported.current) return;
    reported.current = wantedKey!;
    applying.current = wantedKey === hereKey ? null : wantedKey;
    if (location.mode === "list") {
      setMode("list");
      setOpenId(null);
    } else if (location.mode === "page") {
      setOpenId(location.id);
      setMode("page");
      startLoad();
    } else {
      setFormFor(location.mode === "create" ? "create" : location.id);
      if (location.mode === "edit") setOpenId(location.id);
      setMode("form");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedKey]);

  function afterSave(saved: T) {
    if (!editing) {
      setFlash(new Set([getId(saved)]));
      setTimeout(() => setFlash(new Set()), 2800);
      toast.success(form.createdMessage ?? `${noun.charAt(0).toUpperCase()}${noun.slice(1)} created`);
    } else toast.success(form.savedMessage ?? "Changes saved");
    setOpenId(getId(saved));
    setMode("page");
    startLoad();
  }
  // A synchronous save finishes in this tick; a Promise keeps the form in its "Saving…" state and a rejection stays on the form.
  function save(values: Record<string, string>): void | Promise<unknown> {
    const result = form.onSave(values, editing);
    if (result && typeof (result as Promise<T>).then === "function") return (result as Promise<T>).then(afterSave);
    afterSave(result as T);
  }

  const stageHeight = fit && mode === "list" ? "h-auto" : fit && mode === "panel" ? "min-h-[680px]" : "h-[580px]";

  const slide = "absolute inset-y-0 right-0 z-[3] flex min-w-0 flex-col border-l border-border bg-surface outline-none transition-[left] duration-(--motion-panel) ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none @container/dv";
  const viewClass = mode === "panel" ? "visible left-[calc(100%-min(520px,100%))] shadow-panel @max-[640px]/stage:left-0 @max-[640px]/stage:border-l-0" : mode === "page" ? "visible left-0 border-l-0" : "invisible left-full";
  const barButton = "size-8";

  return (
    <div
      ref={stage}
      data-mode={mode}
      // A fitted list clips only sideways (the parked panel sits off its right edge) so the Filters panel can hang below a short table.
      className={cn("@container/stage relative rounded-md border border-border bg-surface shadow", stageHeight, fit && mode === "list" ? "overflow-x-clip" : "overflow-hidden", className)}
    >
      <div className={cn("h-full", fit && mode === "list" ? "overflow-visible" : "overflow-auto")} aria-hidden={mode === "page" || mode === "form" || undefined} inert={mode === "page" || mode === "form" ? true : undefined}>
        {list({ onRowClick: (r, e) => open(r, { page: e.ctrlKey || e.metaKey }), activeRowId: mode === "panel" ? (openId ?? undefined) : undefined, highlightIds: flash, onCreate: api.create, onVisibleRowsChange: setVisible })}
      </div>

      <div role="region" aria-label={`${noun} details`} tabIndex={-1} className={cn(slide, viewClass)}>
        {record && (
          <>
            <div className="flex min-h-[53px] flex-none items-center gap-1.5 border-b border-border px-3.5 py-2.5">
              {mode === "page" && (
                <div className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-text-faint">
                  <button type="button" onClick={close} className="-ml-1.5 inline-flex items-center gap-1.5 rounded-btn border-none bg-transparent px-1.5 py-1 text-text-soft hover:bg-surface-2 hover:text-accent">
                    <ArrowLeftIcon className="size-[15px]" />
                    {listLabel}
                  </button>
                  <span>/</span>
                  <b className="truncate font-semibold text-text">{identity(record, api).name}</b>
                </div>
              )}
              <span className="flex-1" />
              <Button variant="secondary" iconOnly className={barButton} aria-label={`Previous ${noun}`} title="Previous (↑)" disabled={index <= 0} onClick={() => step(-1)}>
                <ChevUpIcon className="size-4" />
              </Button>
              <Button variant="secondary" iconOnly className={barButton} aria-label={`Next ${noun}`} title="Next (↓)" disabled={index >= stepList.length - 1} onClick={() => step(1)}>
                <ChevIcon className="size-4" />
              </Button>
              <span className="mx-1 text-[11.5px] tabular-nums text-text-faint">
                {index + 1} of {stepList.length}
              </span>
              <Button variant="secondary" iconOnly className={barButton} aria-label="Toggle full page" title="Full page" onClick={toPage}>
                {mode === "page" ? <MinimizeIcon className="size-4" /> : <MaximizeIcon className="size-4" />}
              </Button>
              {mode === "panel" && (
                <Button variant="secondary" iconOnly className={barButton} aria-label="Close" title="Close (Esc)" onClick={close}>
                  <XIcon className="size-4" />
                </Button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {mode === "page" && pageLoading ? (
                <RecordSkeleton />
              ) : (
                <>
                  <RecordIdentity {...identity(record, api)} />
                  <RecordStats stats={stats(record)} />
                  {mode === "panel" ? (
                    <RecordBody light>{panel(record)}</RecordBody>
                  ) : (
                    <>
                      <Tabs value={tab} onValueChange={setTab} className="sticky top-0 z-[2] mt-3.5 bg-surface px-5">
                        <TabList>
                          {page.tabs.map((t) => (
                            <Tab key={t.id} value={t.id} count={t.count?.(record)} countStyle="pill">
                              {t.label}
                            </Tab>
                          ))}
                        </TabList>
                      </Tabs>
                      <RecordBody rail={page.rail?.(record)}>{page.content(record, tab)}</RecordBody>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {mode === "form" && (
        <div className="absolute inset-0 z-[4] animate-mdl-in motion-reduce:animate-none">
          <RecordForm
            mode={editing ? "edit" : "create"}
            noun={noun}
            backLabel={editing ? (identity(editing, api).name as string) : listLabel}
            recordName={editing ? (identity(editing, api).name as string) : undefined}
            sections={editing && form.editSections ? form.editSections : form.sections}
            initialValues={editing ? form.toValues(editing) : undefined}
            onSubmit={save}
            onCancel={() => setMode(editing ? "page" : "list")}
            container="parent"
          />
        </div>
      )}

      {inlineToasts && <Toaster container="parent" offset={64} compact />}

      <DestructiveDialog
        open={!!confirmState}
        onOpenChange={(o) => !o && setConfirmState(null)}
        title={confirmState?.title ?? ""}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        container="parent"
        onConfirm={() => {
          confirmState?.onConfirm();
          setConfirmState(null);
        }}
      />
    </div>
  );
}
