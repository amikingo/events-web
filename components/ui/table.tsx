"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Checkbox } from "./checkbox";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { LoadMore } from "./load-more";
import { TableSkeletonRows, StackSkeleton } from "./table-skeleton";
import { ScrollArea } from "./scroll-area";
import { TextLink } from "./text-link";
import { StackRows } from "./table-stack";
import type { StackRole } from "./table-stack";
import { useMediaQuery } from "../../lib/use-media";
import { CountBadge } from "./count-badge";
import { ExpandButton, ExpandedRow } from "./table-expand";
import type { TableExpandable } from "./table-expand";
import { toast } from "./toaster";
import { Chip } from "./chip";
import { CheckIcon, ChevIcon, FilterIcon, MoreIcon, PagerFirstIcon, PagerLastIcon, PagerNextIcon, PagerPrevIcon, SearchIcon, SortIcon, ViewIcon } from "./icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import {
  FilterPanel,
  appliedChips,
  countActive,
  emptyFilters,
  matchesFilters,
  normalizeFilters,
} from "./table-filters";
import type { FilterField, FilterValues, SavedView } from "./table-filters";
import { inferFilters } from "./table-filters";

export type {
  DateRange,
  DateRangeFilter,
  FilterField,
  FilterValue,
  FilterValues,
  MultiSelectFilter,
  NumberRange,
  NumberRangeFilter,
  SavedView,
} from "./table-filters";

export type SortDirection = "asc" | "desc";

export interface ColumnDef<T> {
  key: string;
  header: ReactNode;
  /** Reads the cell value straight off the row when no `render` is given. */
  accessor?: (row: T) => ReactNode;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  /** Custom comparator for client-side sort; defaults to a generic string/number compare on the accessor value. */
  sortFn?: (a: T, b: T) => number;
  width?: string;
  /** `.num` column — right-aligned, tabular figures. */
  numeric?: boolean;
  /** `.primary` column — the row's main label, rendered at text/500 instead of text-soft/400. Exactly one column should set this. */
  primary?: boolean;
  /** On a phone (stacked cards): `title` is the card heading (default: the `primary` column), `badge` sits beside it (a status pill), `hidden` leaves the column out. Everything else becomes a key–value line. */
  mobile?: StackRole;
  /** The raw value the automatic Filters panel and the search box read, for a column whose `accessor` returns an element (a status pill) or a formatted string. */
  filterValue?: (row: T) => string | number;
  /** `false` keeps this column out of the automatic Filters panel. */
  filter?: false;
  className?: string;
}

/**
 * A row action. `view: true` renders as a standalone eye-icon button (the one action
 * the guideline allows outside the "⋯" menu) — every other action collapses into "⋯",
 * even when there's only one of them, once a `view` action is also present.
 *
 * Destructive actions (delete / archive / remove) are intentionally not modeled here:
 * per the guideline's row-actions rule they live only on the row's detail page, inside
 * its own "⋯" menu, behind a confirmation step (see ui/confirm-dialog.tsx, DestructiveDialog).
 */
export interface RowAction<T> {
  key: string;
  label: string;
  icon?: ReactNode;
  view?: boolean;
  onClick: (row: T) => void;
  disabled?: (row: T) => boolean;
}

export interface QuickFilter<T> {
  label: string;
  value: string;
  predicate: (row: T) => boolean;
}

export interface TableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  getRowId: (row: T) => string | number;

  /**
   * `.tbl-toolbar` — title, search box, quick-filter chips. **Defaults to `true`**,
   * same as `pagination`: pass `toolbar={false}` to opt out rather than the other
   * way around. Renders only the pieces you give it (title, search, quick filters,
   * `toolbarActions`) — an all-empty toolbar renders nothing.
   *
   * The "Filters" button and its panel come from `filters` below.
   */
  toolbar?: boolean;
  title?: ReactNode;
  /** Default true (only matters while `toolbar` is true). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Uncontrolled by default; pass both to drive search yourself (e.g. server-side). */
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  /** Defaults to a case-insensitive substring match across every column's accessor value. */
  searchFn?: (row: T, query: string) => boolean;
  /** `.tbl-toolbar-sub` single-select filter-chip row (`#flt-quick-row`). Omit to render no chip row at all. */
  quickFilters?: QuickFilter<T>[];
  quickFilterValue?: string;
  onQuickFilterChange?: (value: string) => void;
  /**
   * Describes the fields in the guideline's "Filters" panel (`.flt-panel`): multi-selects,
   * a date range, a min–max number pair. Pass them and the Filters button (with its
   * applied-count badge), the panel (saved views, fields, Reset / Apply), and the
   * applied-filter chip row with "Clear all" all appear — `<Table>` also does the filtering.
   * Edits stay in the panel until Apply.
   */
  filters?: FilterField<T>[] | false;
  /** Controlled applied filters. Pass with `onFilterChange` to drive filtering yourself (e.g. server-side). */
  filterValues?: FilterValues;
  onFilterChange?: (values: FilterValues) => void;
  /** Ready-made views shown as chips at the top of the Filters panel, after the built-in "All" view. */
  savedViews?: SavedView[];
  /** Label of the built-in view that clears everything. Default "All". */
  allViewLabel?: string;
  /** Called when someone saves the current combination as a new view ("+ Save current as view"). Views are also kept in the table's own state. */
  onSaveView?: (view: SavedView) => void;
  /** Slot for page-specific controls next to the search box — a primary "+ New" button, etc. */
  toolbarActions?: ReactNode;

  /** Checkbox column + bulk action bar. Default false — opt in per table. */
  selectable?: boolean;
  selectedIds?: Set<string | number>;
  onSelectionChange?: (ids: Set<string | number>) => void;
  bulkActions?: (selectedRows: T[]) => ReactNode;

  rowActions?: (row: T) => RowAction<T>[];

  /**
   * `.tbl-expand` — rows open into their own nested data (line items, a short breakdown). Never for the row's own fields: those live in the detail view.
   * Only one row is open at a time. Phones show the stacked cards, which don't expand.
   */
  expandable?: TableExpandable<T>;
  /** Click or Enter on a row (Ctrl/Cmd + click passes `e.metaKey`/`e.ctrlKey` so the caller can open the full page). Rows get a pointer cursor and a keyboard focus bar. */
  onRowClick?: (row: T, e: { ctrlKey: boolean; metaKey: boolean }) => void;
  /** Called with every row that currently passes search, filters and sort (all pages), in display order — so a detail view can step through exactly what the user sees. */
  onVisibleRowsChange?: (rows: T[]) => void;
  /** The record currently open in a detail panel — its row stays tinted. */
  activeRowId?: string | number;
  /** Rows to flash green for a moment (a record that was just created). */
  highlightIds?: Set<string | number>;

  /** Uncontrolled by default (sorts `data` client-side); pass to drive server-side sort instead. */
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSortChange?: (column: string, direction: SortDirection) => void;

  /** Mandatory per the guideline — every table ships pagination + rows-per-page unless a developer opts out. */
  pagination?: boolean;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  /** Server-side pagination: pass the current page's rows in `data`, plus these, and handle the callbacks yourself. */
  page?: number;
  onPageChange?: (page: number) => void;
  rowsPerPage?: number;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  totalRows?: number;

  /** `.dense` — 34px rows for ledgers/reconciliation. Never mix with default density on one screen. */
  dense?: boolean;
  /**
   * Phones: stack each row into a compact card with key–value lines and load more on scroll instead of numbered pages
   * (the guideline's responsive table). Default true; wide tables otherwise scroll sideways with the first column pinned.
   */
  stackOnMobile?: boolean;
  /** Appends a "Loading more…" row under the table while the next page is being fetched (infinite append). */
  loadingMore?: boolean;
  /** Server mode + stacked cards: called when the end of the list scrolls into view and more rows exist (append them to `data`). */
  onLoadMore?: () => void;
  loading?: boolean;
  /** Shown when there is no data at all — the first-run moment ("No bookings yet" + the primary action that creates one). */
  emptyState?: ReactNode;
  /** Replaces the built-in "No results for …" / "Nothing matches these filters" states, which appear when a search or filter empties the table. */
  noResultsState?: ReactNode;
  className?: string;
}

function defaultCompare<T>(column: ColumnDef<T>, a: T, b: T): number {
  const av = column.accessor?.(a);
  const bv = column.accessor?.(b);
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av ?? "").localeCompare(String(bv ?? ""));
}

/** Guideline's pager algorithm: 1, 2, ..., current-1, current, current+1, ..., last — collapsed to one "…" per gap. */
function buildPageList(current: number, pages: number): (number | "…")[] {
  const list: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (pages <= 6 || p === 1 || p === pages || Math.abs(p - current) <= 1) {
      list.push(p);
    } else if (list[list.length - 1] !== "…") {
      list.push("…");
    }
  }
  return list;
}

// Phone + server paging: the page hands over one page of rows at a time, so the Table keeps the pages it has received.
type StackPages<T> = Record<number, T[]>;

/**
 * The pages after `data` arrived for `page`. Page 1 starts the list over (a new search, filter or sort comes back as
 * page 1); any other page is added next to the ones already loaded. Returns `prev` itself when nothing changed, so a
 * render that hands over the same rows does not update state again.
 */
function receiveStackPage<T>(prev: StackPages<T>, page: number, data: T[]): StackPages<T> {
  const same = (existing: T[] | undefined) =>
    existing !== undefined && (existing === data || (existing.length === 0 && data.length === 0));
  if (page <= 1) {
    const keys = Object.keys(prev);
    if (keys.length === 1 && keys[0] === "1" && same(prev[1])) return prev;
    return { 1: data };
  }
  if (same(prev[page])) return prev;
  return { ...prev, [page]: data };
}

/** Every loaded page in page order, each row once (a page that arrived twice, or overlaps, adds nothing new). */
function flattenStackPages<T>(pages: StackPages<T>, getRowId: (row: T) => string | number): T[] {
  const seen = new Set<string | number>();
  const rows: T[] = [];
  for (const key of Object.keys(pages).map(Number).sort((a, b) => a - b)) {
    for (const row of pages[key]!) {
      const id = getRowId(row);
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push(row);
    }
  }
  return rows;
}

/** The page to ask for next, or null when the last page is already loaded. */
function nextStackPage(loadedPageCount: number, totalRows: number, rowsPerPage: number): number | null {
  const pageCount = Math.max(1, Math.ceil(totalRows / Math.max(1, rowsPerPage)));
  const next = loadedPageCount + 1;
  return next <= pageCount ? next : null;
}

export function Table<T>({
  columns,
  data,
  getRowId,
  toolbar = true,
  title,
  searchable = true,
  searchPlaceholder = "Search…",
  searchQuery,
  onSearchChange,
  searchFn,
  quickFilters,
  quickFilterValue,
  onQuickFilterChange,
  filters,
  filterValues,
  onFilterChange,
  savedViews,
  allViewLabel = "All",
  onSaveView,
  toolbarActions,
  selectable = false,
  selectedIds,
  onSelectionChange,
  bulkActions,
  rowActions,
  expandable,
  onRowClick,
  onVisibleRowsChange,
  activeRowId,
  highlightIds,
  sortColumn,
  sortDirection = "asc",
  onSortChange,
  pagination = true,
  rowsPerPageOptions: rowsPerPageOptionsProp = [5, 10, 25],
  defaultRowsPerPage = 10,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  totalRows,
  dense = false,
  stackOnMobile = true,
  onLoadMore,
  loadingMore = false,
  loading = false,
  emptyState,
  noResultsState,
  className,
}: TableProps<T>) {
  const isServerPaged = totalRows !== undefined;
  const isServerSorted = onSortChange !== undefined && sortColumn !== undefined;
  const isServerFiltered = isServerPaged;

  const [internalSortCol, setInternalSortCol] = useState<string | undefined>(sortColumn);
  const [internalSortDir, setInternalSortDir] = useState<SortDirection>(sortDirection);
  const [internalPage, setInternalPage] = useState(page ?? 1);
  const [internalRpp, setInternalRpp] = useState(rowsPerPage ?? defaultRowsPerPage);
  const [internalSelected, setInternalSelected] = useState<Set<string | number>>(new Set());
  const [internalQuery, setInternalQuery] = useState("");
  const [internalQuickFilter, setInternalQuickFilter] = useState(quickFilters?.[0]?.value ?? "");
  const [rppOpen, setRppOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const isPhone = useMediaQuery("(max-width: 639px)");
  const stacked = stackOnMobile && isPhone;
  const [stackCount, setStackCount] = useState(0);
  // The pinned first column only gets its divider once the table has scrolled sideways under it.
  const [scrolledX, setScrolledX] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // No `filters` given: offer the panel anyway, built from the columns and data (client-side tables only — a server-side one can't know every value).
  const inferred = isServerFiltered || filters !== undefined ? null : inferFilters(columns, data);
  // Inline `columns` / `data` change identity every render; keep the same fields while their shape is unchanged.
  const inferredRef = useRef<{ sig: string; fields: FilterField<T>[] }>({ sig: "", fields: [] });
  if (inferred) {
    const sig = JSON.stringify(inferred.map((f) => [f.key, f.type, "options" in f ? f.options : null]));
    if (sig !== inferredRef.current.sig) inferredRef.current = { sig, fields: inferred };
  }
  const filterFields = useMemo(() => (filters === false ? [] : (filters ?? (inferred ? inferredRef.current.fields : []))), [filters, inferred ? inferredRef.current.fields : null]); // eslint-disable-line react-hooks/exhaustive-deps

  const [internalApplied, setInternalApplied] = useState<FilterValues>(() => emptyFilters(filterFields));
  const [draftFilters, setDraftFilters] = useState<FilterValues>(() => filterValues ?? emptyFilters(filterFields));
  const [customViews, setCustomViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState("all");
  /** Rows seen while selected, so bulk actions still get them after server-side paging drops them from `data`. */
  const selectedRowCache = useRef(new Map<string | number, T>());

  const activeSortCol = isServerSorted ? sortColumn : internalSortCol;
  const activeSortDir = isServerSorted ? sortDirection : internalSortDir;
  const activePage = isServerPaged ? page ?? internalPage : internalPage;
  const activeRpp = rowsPerPage ?? internalRpp;
  // The size in use is always on offer (a default of 20 with options 5 / 10 / 25), so the menu never hides the current value.
  const rowsPerPageOptions = Array.from(new Set([...rowsPerPageOptionsProp, activeRpp])).sort((a, b) => a - b);
  const activeSelected = selectedIds ?? internalSelected;
  const activeQuery = searchQuery ?? internalQuery;
  const activeQuickFilter = quickFilterValue ?? internalQuickFilter;
  const appliedFilters = useMemo(
    () => normalizeFilters(filterFields, filterValues ?? internalApplied),
    [filterFields, filterValues, internalApplied],
  );
  const appliedCount = countActive(filterFields, appliedFilters);
  const chips = appliedChips(filterFields, appliedFilters);
  const views: SavedView[] = [{ id: "all", label: allViewLabel, filters: {} }, ...(savedViews ?? []), ...customViews];

  function commitFilters(next: FilterValues) {
    const normalized = normalizeFilters(filterFields, next);
    if (onFilterChange) onFilterChange(normalized);
    else setInternalApplied(normalized);
    setDraftFilters(normalized);
    goToPage(1);
  }

  function applyView(id: string) {
    const view = views.find((v) => v.id === id);
    if (!view) return;
    commitFilters(view.filters);
    setSearchQuery(view.search ?? "");
    setQuickFilter(view.quickFilter ?? quickFilters?.[0]?.value ?? "");
    setActiveViewId(id);
    setFiltersOpen(false);
  }

  function saveView(name: string) {
    const view: SavedView = {
      id: `custom-${customViews.length}`,
      label: name || `Custom view ${customViews.length + 1}`,
      filters: appliedFilters,
      search: activeQuery,
      quickFilter: activeQuickFilter,
    };
    setCustomViews((cur) => [...cur, view]);
    onSaveView?.(view);
    // Needs a <Toaster /> somewhere in the app; without one it is silently skipped.
    toast.success("View saved", { body: `“${view.label}” is ready under Saved views.`, compact: true, ms: 3200 });
    setActiveViewId(view.id);
    setFiltersOpen(false);
  }

  function clearAll() {
    commitFilters({});
    setSearchQuery("");
    setQuickFilter(quickFilters?.[0]?.value ?? "");
    setActiveViewId("all");
  }

  function setSearchQuery(next: string) {
    if (onSearchChange) onSearchChange(next);
    else setInternalQuery(next);
    goToPage(1);
  }

  function setQuickFilter(next: string) {
    if (onQuickFilterChange) onQuickFilterChange(next);
    else setInternalQuickFilter(next);
    goToPage(1);
  }

  const defaultSearchFn = (row: T, query: string) =>
    columns.some((c) => String(c.filterValue?.(row) ?? c.accessor?.(row) ?? "").toLowerCase().includes(query.toLowerCase()));

  const filtered = useMemo(() => {
    if (isServerFiltered) return data;
    let rows = data;
    if (quickFilters && activeQuickFilter) {
      const qf = quickFilters.find((f) => f.value === activeQuickFilter);
      if (qf) rows = rows.filter(qf.predicate);
    }
    if (filterFields.length) rows = rows.filter((row) => matchesFilters(row, filterFields, appliedFilters));
    if (searchable && activeQuery.trim()) {
      const match = searchFn ?? defaultSearchFn;
      rows = rows.filter((row) => match(row, activeQuery.trim()));
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isServerFiltered, quickFilters, activeQuickFilter, filterFields, appliedFilters, searchable, activeQuery, searchFn]);

  const sorted = useMemo(() => {
    if (isServerSorted || !activeSortCol) return filtered;
    const column = columns.find((c) => c.key === activeSortCol);
    if (!column) return filtered;
    const compare = column.sortFn ?? ((a: T, b: T) => defaultCompare(column, a, b));
    const result = [...filtered].sort(compare);
    if (activeSortDir === "desc") result.reverse();
    return result;
  }, [filtered, columns, activeSortCol, activeSortDir, isServerSorted]);

  const visibleCb = useRef(onVisibleRowsChange);
  visibleCb.current = onVisibleRowsChange;
  // Report only when the rows really changed. A caller with inline `columns` / `searchFn` gets a new `sorted` array on
  // every render, and reporting each one made the record workspace re-render the table forever ("Maximum update
  // depth exceeded"). Fix from bookings_web.
  const lastVisible = useRef<T[] | null>(null);
  useEffect(() => {
    const prev = lastVisible.current;
    if (prev && prev.length === sorted.length && prev.every((row, i) => row === sorted[i])) return;
    lastVisible.current = sorted;
    visibleCb.current?.(sorted);
  }, [sorted]);

  const pageCount = pagination
    ? Math.max(1, Math.ceil((isServerPaged ? totalRows! : sorted.length) / activeRpp))
    : 1;

  // Phone + server paging: the page hands over one page of rows at a time, so keep the pages already received
  // and ask for the next one (through `onPageChange`) when the end of the list scrolls into view. A page that
  // passes its own `onLoadMore` appends to `data` itself and is left alone. (From bookings_web.)
  const stackedServer = stacked && isServerPaged && !onLoadMore;
  const [stackPages, setStackPages] = useState<StackPages<T>>({});
  const [awaitingPage, setAwaitingPage] = useState<number | null>(null);
  const stackPagesRef = useRef(stackPages);
  stackPagesRef.current = stackPages;
  const getRowIdRef = useRef(getRowId);
  getRowIdRef.current = getRowId;
  const sawLoading = useRef(false);
  /** The rows on screen when the next page was asked for: until `data` is a different array, the page has not arrived. */
  const dataAtRequest = useRef<T[] | null>(null);
  useEffect(() => {
    if (loading) sawLoading.current = true;
  }, [loading]);
  useEffect(() => {
    // Between pages `data` is stale or empty, so only a finished load counts.
    if (!stackedServer || loading) return;
    if (activePage > 1) {
      // Still the previous page's rows (a page that keeps them while the next one loads): not the page we asked for.
      if (data === dataAtRequest.current) return;
      // A page that never reports `loading` shows an empty list while the next page loads: that is not an empty page.
      if (data.length === 0 && !sawLoading.current) return;
    }
    sawLoading.current = false;
    setStackPages((prev) => receiveStackPage(prev, activePage, data));
  }, [stackedServer, loading, activePage, data]);
  useEffect(() => {
    if (activePage === 1) setAwaitingPage(null);
  }, [activePage]);
  useEffect(() => {
    if (!stackedServer) {
      setStackPages((prev) => (Object.keys(prev).length ? {} : prev));
      setAwaitingPage(null);
    } else if (activePage !== 1) {
      // Entering the phone layout partway through the pages: the list starts from the first page.
      if (onPageChange) onPageChange(1);
      else setInternalPage(1);
    }
  }, [stackedServer]); // eslint-disable-line react-hooks/exhaustive-deps
  const stackRows = useMemo(
    () => (stackedServer ? flattenStackPages(stackPages, (row) => getRowIdRef.current(row)) : []),
    [stackedServer, stackPages],
  );
  const stackLoadedPages = Math.max(0, ...Object.keys(stackPages).map(Number));
  const stackWaiting = awaitingPage !== null && awaitingPage > 1 && stackPages[awaitingPage] === undefined;

  const pageRows = useMemo(() => {
    if (stacked) {
      if (isServerPaged) return stackedServer && stackRows.length ? stackRows : sorted;
      return sorted.slice(0, Math.max(activeRpp, stackCount));
    }
    if (!pagination || isServerPaged) return sorted;
    const start = (activePage - 1) * activeRpp;
    return sorted.slice(start, start + activeRpp);
  }, [sorted, pagination, isServerPaged, activePage, activeRpp, stacked, stackCount, stackedServer, stackRows]);

  // Stacked cards load more as you scroll; a new search / filter / sort starts the list over.
  useEffect(() => {
    setStackCount(0);
  }, [activeQuery, activeQuickFilter, appliedFilters, activeSortCol, activeSortDir]);
  const stackNextPage = nextStackPage(stackLoadedPages || activePage, totalRows ?? 0, activeRpp);
  const stackHasMore =
    stacked &&
    (isServerPaged
      ? onLoadMore
        ? data.length < (totalRows ?? 0)
        : pageRows.length < (totalRows ?? 0) && stackNextPage !== null
      : pageRows.length < sorted.length);
  function loadMoreStacked() {
    if (!isServerPaged) {
      setStackCount((c) => Math.max(c, activeRpp) + activeRpp);
      return;
    }
    if (onLoadMore) {
      onLoadMore();
      return;
    }
    if (stackWaiting || stackNextPage === null) return;
    dataAtRequest.current = data;
    sawLoading.current = false;
    setAwaitingPage(stackNextPage);
    if (onPageChange) onPageChange(stackNextPage);
    else setInternalPage(stackNextPage);
  }

  const totalCount = isServerPaged ? totalRows! : sorted.length;
  const rangeStart = totalCount === 0 ? 0 : (activePage - 1) * activeRpp + 1;
  const rangeEnd = Math.min(activePage * activeRpp, totalCount);

  function handleSort(column: ColumnDef<T>) {
    if (!column.sortable) return;
    const nextDir: SortDirection =
      activeSortCol === column.key && activeSortDir === "asc" ? "desc" : "asc";
    if (isServerSorted || onSortChange) {
      onSortChange?.(column.key, nextDir);
    } else {
      setInternalSortCol(column.key);
      setInternalSortDir(nextDir);
    }
  }

  function goToPage(next: number) {
    const clamped = Math.min(Math.max(1, next), pageCount);
    if (onPageChange) onPageChange(clamped);
    else setInternalPage(clamped);
  }

  function setRowsPerPage(next: number) {
    if (onRowsPerPageChange) onRowsPerPageChange(next);
    else setInternalRpp(next);
    goToPage(1);
  }

  function setSelected(next: Set<string | number>) {
    if (onSelectionChange) onSelectionChange(next);
    else setInternalSelected(next);
  }

  function toggleRow(id: string | number, checked: boolean) {
    const next = new Set(activeSelected);
    const row = pageRows.find((r) => getRowId(r) === id);
    if (checked) {
      next.add(id);
      if (row) selectedRowCache.current.set(id, row);
    } else {
      next.delete(id);
      selectedRowCache.current.delete(id);
    }
    setSelected(next);
  }

  function toggleAllOnPage(checked: boolean) {
    const next = new Set(activeSelected);
    for (const row of pageRows) {
      const id = getRowId(row);
      if (checked) {
        next.add(id);
        selectedRowCache.current.set(id, row);
      } else {
        next.delete(id);
        selectedRowCache.current.delete(id);
      }
    }
    setSelected(next);
  }

  const pageIds = pageRows.map(getRowId);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => activeSelected.has(id));
  const someOnPageSelected = pageIds.some((id) => activeSelected.has(id)) && !allOnPageSelected;
  const selectedRows = selectable
    ? [...activeSelected].flatMap((id) => {
        const row = data.find((r) => getRowId(r) === id) ?? selectedRowCache.current.get(id);
        return row ? [row] : [];
      })
    : [];

  const thPadding = dense ? "px-3 py-2" : "px-4 py-[11px]";
  const tdPadding = dense ? "px-3 py-[7px]" : "px-4 py-[13px]";
  const tdFont = dense ? "text-[12.5px]" : "text-[13px]";
  const pageList = buildPageList(activePage, pageCount);
  const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0) + (expandable ? 1 : 0);

  /** The view button and "⋯" menu for a row — the table's last cell, or the top-right of a stacked card. */
  function renderRowActions(row: T) {
    const actions = rowActions?.(row) ?? [];
    const viewAction = actions.find((a) => a.view);
    const menuActions = actions.filter((a) => a !== viewAction);
    return (
      <div className="inline-flex items-center gap-1.5">
        {viewAction && (
          <Button
            type="button"
            variant="secondary"
            iconOnly
            aria-label={viewAction.label}
            disabled={viewAction.disabled?.(row)}
            onClick={() => viewAction.onClick(row)}
            className="size-8"
          >
            <ViewIcon className="size-4" />
          </Button>
        )}
        {menuActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="More" className="inline-flex size-8 items-center justify-center rounded-btn border border-border bg-surface-2 text-text hover:bg-border">
              <MoreIcon className="size-4" />
            </DropdownMenuTrigger>
            {/* `portal`: the menu is drawn over the page, so the table's scroll area can't cut it off on the last rows. */}
            <DropdownMenuContent align="end" portal className="w-40">
              {menuActions.map((action) => (
                <DropdownMenuItem
                  key={action.key}
                  disabled={action.disabled?.(row)}
                  onClick={() => action.onClick(row)}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  // Empty states: first-run (consumer's), no search results, or no filter matches — chips show the cause, one action clears it.
  const firstQuick = quickFilters?.[0]?.value ?? "";
  const quickActive = !!quickFilters && activeQuickFilter !== firstQuick;
  const searching = searchable && activeQuery.trim().length > 0;
  const filtersActive = appliedCount > 0 || quickActive;
  const nounTitle = typeof title === "string" ? title.toLowerCase() : "results";
  function clearFiltersOnly() {
    commitFilters({});
    setQuickFilter(firstQuick);
    setActiveViewId("all");
  }
  const emptyContent: ReactNode =
    searching || filtersActive ? (
      (noResultsState ?? (
        searching ? (
          <EmptyState
            animate
            size="sm"
            tone="charcoal"
            icon={<SearchIcon />}
            title={
              <>
                No results for <code>{activeQuery.trim()}</code>
              </>
            }
            description="Check the spelling or try a shorter term."
            actions={
              <Button variant="secondary" className="h-[30px] px-[11px] py-[5px] text-[13px]" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            animate
            size="sm"
            tone="charcoal"
            icon={<FilterIcon />}
            title={`No ${nounTitle} match these filters`}
            description="Try removing one, or clear them all."
            chips={
              <>
                {quickActive && (
                  <Chip selected onRemove={() => setQuickFilter(firstQuick)} removeLabel="Remove filter">
                    {quickFilters?.find((f) => f.value === activeQuickFilter)?.label}
                  </Chip>
                )}
                {chips.map((chip) => (
                  <Chip key={chip.id} selected onRemove={() => commitFilters(chip.remove(appliedFilters))} removeLabel={`Remove ${chip.label}`}>
                    {chip.label}
                  </Chip>
                ))}
              </>
            }
            actions={
              <Button variant="secondary" className="h-[30px] px-[11px] py-[5px] text-[13px]" onClick={clearFiltersOnly}>
                Clear filters
              </Button>
            }
          />
        )
      ))
    ) : (
      (emptyState ?? <EmptyState size="sm" title="Nothing here yet" />)
    );

  const showToolbarTop = toolbar && (title || searchable || filterFields.length > 0 || toolbarActions);
  const showToolbarSub = toolbar && quickFilters && quickFilters.length > 0;
  const showChipsRow = toolbar && chips.length > 0;

  return (
    <div className={cn("w-full min-w-0 rounded-md border border-border bg-surface shadow", className)}>
      {showToolbarTop && (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-4 py-3.5">
          {title && (
            <div className="mr-auto text-[14px] font-semibold text-text">
              {title}
              <small className="block text-[11.5px] font-normal text-text-faint">
                {totalCount} {totalCount === 1 ? "result" : "results"}
              </small>
            </div>
          )}
          {searchable && (
            <div className="relative w-[260px]">
              <SearchIcon className="pointer-events-none absolute left-[11px] top-1/2 size-4 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                aria-label={typeof searchPlaceholder === "string" ? searchPlaceholder : "Search"}
                value={activeQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-btn border border-input-border bg-surface pl-9 pr-3 type-body text-text placeholder:text-text-faint focus:outline-none focus:border-accent focus:shadow-focus"
              />
            </div>
          )}
          {filterFields.length > 0 && (
            <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DropdownMenuTrigger
                className="h-9 gap-2 rounded-btn border border-border bg-surface-2 px-4 type-button text-text hover:bg-border"
              >
                <FilterIcon className="size-4" />
                Filters
                {appliedCount > 0 && (
                  <CountBadge inline soft>
                    {appliedCount}
                  </CountBadge>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" role="dialog" aria-label="Filters" className="w-[300px] overflow-visible">
                <FilterPanel
                  fields={filterFields}
                  draft={normalizeFilters(filterFields, draftFilters)}
                  onDraftChange={setDraftFilters}
                  views={views}
                  activeViewId={activeViewId}
                  onApplyView={applyView}
                  onSaveView={saveView}
                  onReset={() => setDraftFilters(emptyFilters(filterFields))}
                  onApply={() => {
                    commitFilters(draftFilters);
                    setFiltersOpen(false);
                  }}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {toolbarActions}
        </div>
      )}

      {selectable && selectedRows.length > 0 && bulkActions && (
        <div className="flex items-center gap-2.5 border-b border-[color-mix(in_srgb,var(--color-accent)_25%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))] px-4 py-2.5 text-[13px] text-text">
          <span>
            <b className="font-bold text-accent">{selectedRows.length}</b> selected
          </span>
          <div className="flex flex-1 items-center justify-end gap-2">{bulkActions(selectedRows)}</div>
        </div>
      )}

      {showToolbarSub && (
        <div className="flex flex-wrap items-center gap-2.5 px-4 pb-3.5 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {quickFilters!.map((f) => (
              <Chip key={f.value} selected={activeQuickFilter === f.value} onClick={() => setQuickFilter(f.value)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {showChipsRow && (
        <div className="flex flex-wrap items-center gap-2.5 px-4 pb-3.5 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <Chip key={chip.id} selected onRemove={() => commitFilters(chip.remove(appliedFilters))} removeLabel={`Remove ${chip.label}`}>
                {chip.label}
              </Chip>
            ))}
          </div>
          <TextLink onClick={clearAll} className="ml-auto">
            Clear all
          </TextLink>
        </div>
      )}

      {/* The card itself isn't overflow-hidden (the Filters panel and its pickers must be able to hang below a short table), so the scroll area rounds its own corners where it touches the card edge. */}
      {stacked ? (
        // Fetching a later page keeps the cards already on screen; only a first load (or a new search / filter) shows the skeleton.
        loading && !(activePage > 1 && pageRows.length > 0) ? (
          <StackSkeleton />
        ) : pageRows.length === 0 ? (
          <div>{emptyContent}</div>
        ) : (
          <StackRows
            rows={pageRows}
            columns={columns}
            getRowId={getRowId}
            selectable={selectable}
            isSelected={(id) => activeSelected.has(id)}
            onToggle={(row, next) => toggleRow(getRowId(row), next)}
            renderActions={rowActions ? (row) => renderRowActions(row) : undefined}
            expandable={expandable}
            onRowClick={onRowClick}
            activeRowId={activeRowId}
            highlightIds={highlightIds}
            hasMore={stackHasMore}
            loadingMore={stackWaiting || loadingMore}
            onEndReached={loadMoreStacked}
          />
        )
      ) : (
      <ScrollArea
        direction="x"
        onScroll={(e) => setScrolledX(e.currentTarget.scrollLeft > 0)}
        className={cn(
          !showToolbarTop && !showToolbarSub && !showChipsRow && !(selectable && selectedRows.length > 0 && bulkActions) && "rounded-t-[calc(var(--radius-md)-1px)]",
          !pagination && "rounded-b-[calc(var(--radius-md)-1px)]",
        )}
      >
        <table className={cn("w-full border-separate border-spacing-0", tdFont)}>
          <thead>
            <tr>
              {selectable && (
                <th className={cn(thPadding, "sticky left-0 z-[3] w-11 whitespace-nowrap border-b border-border bg-surface-2 pr-0 text-left")}>
                  <Checkbox
                    aria-label="Select all rows on this page"
                    checked={allOnPageSelected}
                    indeterminate={someOnPageSelected}
                    onCheckedChange={toggleAllOnPage}
                  />
                </th>
              )}
              {expandable && <th className={cn(thPadding, "w-10 border-b border-border bg-surface-2 pr-0")} aria-label="Expand" />}
              {columns.map((column, ci) => (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    thPadding,
                    "text-[11px]",
                    "whitespace-nowrap border-b border-border bg-surface-2 text-left font-bold uppercase tracking-[.5px] text-text-faint",
                    ci === 0 && cn("sticky z-[3]", scrolledX && "shadow-pin", selectable ? "left-11" : "left-0"),
                    column.numeric && "text-right",
                    column.sortable && "cursor-pointer select-none",
                    activeSortCol === column.key && "text-accent",
                    column.className,
                  )}
                  onClick={() => handleSort(column)}
                >
                  {column.header}
                  {column.sortable && (
                    <SortIcon
                      className={cn(
                        "ml-1 inline-block size-3 align-[-2px] transition-[transform,opacity]",
                        activeSortCol === column.key ? "opacity-100" : "opacity-45",
                        activeSortCol === column.key && activeSortDir === "desc" && "rotate-180",
                      )}
                    />
                  )}
                </th>
              ))}
              {rowActions && (
                <th className={cn(thPadding, "w-px whitespace-nowrap border-b border-border bg-surface-2")} aria-hidden="true" />
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeletonRows columns={columns} selectable={selectable} rowActions={!!rowActions} padding={tdPadding} />
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={colCount}>{emptyContent}</td>
              </tr>
            ) : (
              pageRows.map((row, rowIndex) => {
                const id = getRowId(row);
                const checked = activeSelected.has(id);
                const isLast = rowIndex === pageRows.length - 1;

                const open = expandable && expandedId === id;

                return (
                  <Fragment key={id}>
                  <tr
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? (e) => onRowClick(row, e) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              onRowClick(row, e);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "transition-colors hover:[&>td]:bg-surface-2",
                      onRowClick && "cursor-pointer outline-none focus-visible:[&>td]:bg-surface-2 focus-visible:[&>td:first-child]:shadow-row-focus",
                      activeRowId === id && "[&>td]:bg-surface-2",
                      highlightIds?.has(id) && "[&>td]:animate-flash-new",
                      checked && "[&>td]:bg-[color-mix(in_srgb,var(--color-accent)_7%,var(--color-surface))] [&>td.primary]:text-accent",
                    )}
                  >
                    {selectable && (
                      <td className={cn(tdPadding, "sticky left-0 z-[1] w-11 bg-surface pr-0", !isLast && "border-b border-border")}>
                        <Checkbox
                          aria-label={`Select row ${id}`}
                          checked={checked}
                          onCheckedChange={(next) => toggleRow(id, next)}
                        />
                      </td>
                    )}
                    {expandable && (
                      <td className={cn(tdPadding, "w-10 pr-0", !isLast && "border-b border-border")}>
                        <ExpandButton expanded={!!open} label={expandable.label ?? "Toggle line items"} onToggle={() => setExpandedId(open ? null : id)} />
                      </td>
                    )}
                    {columns.map((column, ci) => (
                      <td
                        key={column.key}
                        className={cn(
                          tdPadding,
                          ci === 0 && cn("sticky z-[1] bg-surface", scrolledX && "shadow-pin", selectable ? "left-11" : "left-0"),
                          !isLast && "border-b border-border",
                          column.primary ? "primary font-medium text-text" : "text-text-soft",
                          column.numeric && "text-right tabular-nums",
                          column.className,
                        )}
                      >
                        {column.render ? column.render(row) : column.accessor?.(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className={cn(tdPadding, "w-px whitespace-nowrap text-right", !isLast && "border-b border-border")}>
                        {renderRowActions(row)}
                      </td>
                    )}
                  </tr>
                  {open && <ExpandedRow row={row} expandable={expandable} colSpan={colCount} />}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </ScrollArea>
      )}

      {loadingMore && !stacked && <LoadMore />}

      {pagination && !stacked && (
        <div className="flex flex-wrap items-center gap-3.5 border-t border-border px-4 py-2.5 text-[12.5px] text-text-faint">
          <div className="relative flex items-center gap-2">
            <span>Rows per page</span>
            {/* `static` so the option list anchors to the whole "Rows per page" group (`.rpp .select-panel{left:0;right:0}`), not just the trigger. */}
            <DropdownMenu open={rppOpen} onOpenChange={setRppOpen} className="static">
              <DropdownMenuTrigger
                className={cn(
                  "h-[30px] gap-1.5 rounded-btn border border-input-border bg-surface px-2 text-[12.5px] text-text",
                  rppOpen && "border-accent shadow-focus",
                )}
              >
                <span>{activeRpp}</span>
                <ChevIcon className={cn("size-4 text-text-faint transition-transform", rppOpen && "rotate-180")} />
              </DropdownMenuTrigger>
              {/* Opens upward: the footer sits at the bottom of the card, often at the bottom of the page. */}
              <DropdownMenuContent className="inset-x-0 bottom-[calc(100%+6px)] top-auto w-auto min-w-20">
                {rowsPerPageOptions.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    className={cn(
                      "justify-between",
                      option === activeRpp && "bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))] font-semibold text-accent-text",
                    )}
                    onClick={() => setRowsPerPage(option)}
                  >
                    {option}
                    {option === activeRpp && <CheckIcon className="!size-3.5 !text-accent" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <span className="ml-auto tabular-nums">
            {totalCount === 0 ? "0 of 0" : `${rangeStart}–${rangeEnd} of ${totalCount}`}
          </span>

          <div className="flex items-center gap-1">
            {pageCount > 3 && (
              <Button
                variant="secondary"
                iconOnly
                aria-label="First page"
                title="First page"
                disabled={activePage <= 1}
                onClick={() => goToPage(1)}
                className="size-[30px]"
              >
                <PagerFirstIcon className="size-3.5" />
              </Button>
            )}
            <Button
              variant="secondary"
              iconOnly
              aria-label="Previous"
              disabled={activePage <= 1}
              onClick={() => goToPage(activePage - 1)}
              className="size-[30px]"
            >
              <PagerPrevIcon className="size-3.5" />
            </Button>
            {pageList.map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="flex h-[30px] min-w-[30px] cursor-default items-center justify-center px-2 text-[12.5px] font-medium text-text-soft">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p)}
                  className={cn(
                    "h-[30px] min-w-[30px] rounded-btn px-2 text-[12.5px] font-medium text-text-soft hover:bg-surface-2 hover:text-text",
                    p === activePage && "bg-accent-fill font-semibold text-white hover:bg-accent-fill hover:text-white",
                  )}
                >
                  {p}
                </button>
              ),
            )}
            <Button
              variant="secondary"
              iconOnly
              aria-label="Next"
              disabled={activePage >= pageCount}
              onClick={() => goToPage(activePage + 1)}
              className="size-[30px]"
            >
              <PagerNextIcon className="size-3.5" />
            </Button>
            {pageCount > 3 && (
              <Button
                variant="secondary"
                iconOnly
                aria-label="Last page"
                title="Last page"
                disabled={activePage >= pageCount}
                onClick={() => goToPage(pageCount)}
                className="size-[30px]"
              >
                <PagerLastIcon className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
