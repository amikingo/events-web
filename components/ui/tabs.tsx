"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CountBadge } from "./count-badge";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  id: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);
const useTabs = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("<Tab> / <TabPanel> must be used inside <Tabs>");
  return ctx;
};

export interface TabsProps {
  /** The selected tab (controlled). Leave it out and pass `defaultValue` for tabs nothing else needs to know about. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** The tab selected at first when uncontrolled. */
  defaultValue?: string;
  children: ReactNode;
  className?: string;
}

/** Groups a `<TabList>` and its `<TabPanel>`s and holds the selected value. Controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`). */
export function Tabs({ value, onValueChange, defaultValue, children, className }: TabsProps) {
  const id = useId();
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const change = (next: string) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  return (
    <TabsContext.Provider value={{ value: current, onValueChange: change, id }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

/** `.tabs-row` — the underlined tab strip. Arrow keys, Home and End move between tabs. */
export function TabList({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  // A strip wider than its container scrolls sideways (no scrollbar) and fades out at the edge that has more.
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setFade(el.scrollWidth > el.clientWidth + 1 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    const tabs = [...(ref.current?.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)') ?? [])];
    const i = tabs.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next]?.focus();
    tabs[next]?.click();
  }
  return (
    <div ref={ref} role="tablist" onKeyDown={onKeyDown} className={cn("mb-4 flex overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", fade && "[mask-image:linear-gradient(90deg,black_calc(100%-28px),transparent)]", className)} {...props}>
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  /** A count after the label (`.count.inline`): the accent form for what needs action, `soft` for the rest. */
  count?: number;
  countSoft?: boolean;
  /** `pill` is the record page's quieter count (`.dv-n`): grey capsule, accent-tinted when its tab is active. */
  countStyle?: "badge" | "pill";
  className?: string;
}

/** `.tab-item` — 13px / 600 label, 2px accent underline when active. */
export function Tab({ value, children, disabled, count, countSoft = true, countStyle = "badge", className }: TabProps) {
  const { value: current, onValueChange, id } = useTabs();
  const active = current === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${id}-tab-${value}`}
      aria-selected={active}
      aria-controls={`${id}-panel-${value}`}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={cn(
        "mr-5 flex-none whitespace-nowrap border-b-2 px-1 py-[9px] text-[13px] font-semibold leading-[normal] transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-accent text-accent" : "border-transparent text-text-faint hover:text-text disabled:hover:text-text-faint",
        className,
      )}
    >
      {children}
      {count !== undefined && countStyle === "pill" && (
        <span className={cn("ml-1.5 rounded-full px-[7px] py-px text-[11px] font-semibold tabular-nums", active ? "bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] text-accent-text" : "bg-surface-2 text-text-faint")}>{count}</span>
      )}
      {count !== undefined && countStyle === "badge" && (
        <CountBadge inline soft={countSoft} className="align-[1px]">
          {count}
        </CountBadge>
      )}
    </button>
  );
}

/** `.tab-panel` — shown only while its tab is selected. 12.5px / soft / 1.6 line-height. */
export function TabPanel({ value, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { value: current, id } = useTabs();
  if (current !== value) return null;
  return (
    <div role="tabpanel" id={`${id}-panel-${value}`} aria-labelledby={`${id}-tab-${value}`} className={cn("text-[12.5px] leading-[1.6] text-text-soft", className)} {...props}>
      {children}
    </div>
  );
}
