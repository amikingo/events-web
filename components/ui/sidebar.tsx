"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { PagerPrevIcon, ChevRightIcon } from "./icons";
import { Logo } from "./logo";
import { CountBadge } from "./count-badge";
import { SIDEBAR_COLLAPSED, SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN, SIDEBAR_SNAP, useAppShell } from "./app-shell";

const CollapsedContext = createContext(false);

export interface SidebarProps {
  /** The expanded header brand (default: the pink wordmark, 16px tall as the guideline sets it). */
  logo?: ReactNode;
  /** The collapsed header brand (default: the standalone "C" mark, 18px). */
  logoMark?: ReactNode;
  /** The footer line. Default "Powered by Cheche"; `false` hides it. */
  footer?: ReactNode | false;
  /** Folder the default brand artwork is served from (see `Logo`). */
  assetBase?: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

/**
 * `.app-sidebar` — a card with the brand, the nav items and a footer. A round toggle collapses it to 68px (icon-only);
 * the right edge is a drag handle (180–320px, double-click resets, dragging under 120px collapses). Below 760px it is a
 * slide-over drawer opened from the top bar.
 */
export function Sidebar({ logo, logoMark, footer, assetBase, children, className, "aria-label": ariaLabel = "Main navigation" }: SidebarProps) {
  const { collapsed, setCollapsed, width, setWidth, mobileOpen } = useAppShell();
  const [resizing, setResizing] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; w: number } | null>(null);

  const w = collapsed ? SIDEBAR_COLLAPSED : width;

  // The menu only scrolls once it is taller than the sidebar. While it fits it stays `overflow: visible`, because a group's
  // fly-out hangs outside the sidebar and any scroll region would clip it.
  const listRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1);
  });
  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setOverflowing(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <CollapsedContext.Provider value={collapsed}>
      <nav
        ref={ref}
        aria-label={ariaLabel}
        style={{ width: w }}
        className={cn(
          // z-[5]: above the page's sticky table headers (z-[3]) and the record stage (z-[4]), so a fly-out is never cut by them; below menus (z-50) and modals (z-[80]).
          "relative z-[5] m-3 mr-0.5 flex flex-none flex-col overflow-visible rounded-md border border-border bg-surface shadow",
          !resizing && "transition-[width] duration-(--motion-base)",
          // Drawer below 760px.
          "max-[760px]:absolute max-[760px]:inset-y-0 max-[760px]:left-0 max-[760px]:z-30 max-[760px]:m-0 max-[760px]:!w-[220px] max-[760px]:rounded-none max-[760px]:border-0 max-[760px]:border-r",
          "max-[760px]:transition-transform max-[760px]:ease-slow",
          mobileOpen ? "max-[760px]:translate-x-0 max-[760px]:shadow-modal" : "max-[760px]:-translate-x-full",
          className,
        )}
      >
        <div className={cn("flex items-center justify-between gap-2 py-4", collapsed ? "justify-center px-0" : "px-3.5")}>
          {collapsed ? (logoMark ?? <Logo variant="icon-outline" width={18} allowBelowMin assetBase={assetBase} alt="Cheche" className="size-[18px] flex-none" />) : (logo ?? <Logo variant="wordmark" width={86} allowBelowMin assetBase={assetBase} alt="Cheche" className="h-4 w-auto flex-none" />)}
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex size-[26px] flex-none items-center justify-center rounded-full border border-border bg-surface text-text-soft hover:bg-surface-2",
              collapsed && "absolute -right-[13px] top-[18px] z-10 shadow",
              "max-[760px]:hidden",
            )}
          >
            <PagerPrevIcon className={cn("size-[13px] transition-transform duration-(--motion-base)", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* `[&>*]:shrink-0` keeps every row its full height when the list is taller than the sidebar; the list scrolls instead of squeezing rows. */}
        <div ref={listRef} className={cn("flex min-h-0 flex-1 flex-col gap-[3px] px-2.5 py-2.5 [&>*]:shrink-0", overflowing && "overflow-y-auto overscroll-contain")}>
          {children}
        </div>

        {footer !== false && (
          <div className={cn("flex items-center gap-1.5 py-3 text-[11px] text-text-faint", collapsed ? "justify-center px-0" : "px-3.5")}>
            <span className="size-4 flex-none rounded-check bg-accent" aria-hidden="true" />
            {!collapsed && (footer ?? <span>Powered by <b className="font-bold text-text-soft">Cheche</b></span>)}
          </div>
        )}

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuemin={SIDEBAR_MIN}
          aria-valuemax={SIDEBAR_MAX}
          aria-valuenow={width}
          tabIndex={0}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            drag.current = { x: e.clientX, w: ref.current?.getBoundingClientRect().width ?? width };
            e.currentTarget.setPointerCapture(e.pointerId);
            setResizing(true);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const next = drag.current.w + (e.clientX - drag.current.x);
            if (next < SIDEBAR_SNAP) setCollapsed(true);
            else {
              setCollapsed(false);
              setWidth(next);
            }
          }}
          onPointerUp={(e) => {
            if (!drag.current) return;
            drag.current = null;
            e.currentTarget.releasePointerCapture(e.pointerId);
            setResizing(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            if (!collapsed) setWidth(ref.current?.getBoundingClientRect().width ?? width, true);
          }}
          onDoubleClick={() => {
            setCollapsed(false);
            setWidth(SIDEBAR_DEFAULT, true);
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 40 : 16;
            const next = e.key === "ArrowLeft" ? width - step : e.key === "ArrowRight" ? width + step : e.key === "Home" ? SIDEBAR_MIN : e.key === "End" ? SIDEBAR_MAX : e.key === "Enter" ? SIDEBAR_DEFAULT : null;
            if (next === null) return;
            e.preventDefault();
            setCollapsed(false);
            setWidth(next, true);
          }}
          className={cn("group/rz absolute bottom-3 right-[-7px] z-[5] flex w-2.5 cursor-col-resize touch-none justify-center outline-none [@media(pointer:coarse)]:hidden max-[760px]:hidden", collapsed ? "top-[52px]" : "top-3")}
        >
          <span className={cn("h-full w-0.5 rounded-full bg-transparent transition-colors group-hover/rz:bg-border-strong group-focus-visible/rz:bg-accent", resizing && "bg-accent")} />
        </div>
      </nav>
    </CollapsedContext.Provider>
  );
}

const itemClass = "flex w-full cursor-pointer items-center gap-[11px] overflow-hidden whitespace-nowrap rounded-popover px-3 py-2.5 text-left text-[13px] font-medium text-text-soft hover:bg-surface-2 hover:text-text [&_svg]:size-[18px] [&_svg]:flex-none";
const activeClass = "bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] font-semibold text-accent-text hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] hover:text-accent-text";

export interface SidebarItemProps {
  icon?: ReactNode;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  /** A soft inline count after the label ("Payments 2"). */
  count?: number;
  className?: string;
}

/** `.sb-item` — icon + label row. Active = accent tint + 600. Collapsed, it shrinks to a centered 40px icon button (label kept as its accessible name). */
export function SidebarItem({ icon, children, active, disabled, href, onClick, count, className }: SidebarItemProps) {
  const collapsed = useContext(CollapsedContext);
  const { setMobileOpen } = useAppShell();
  const label = typeof children === "string" ? children : undefined;
  const cls = cn(itemClass, active && activeClass, collapsed && "mx-auto w-10 justify-center p-2.5", disabled && "pointer-events-none opacity-40", className);
  const content = (
    <>
      {icon}
      {!collapsed && <span className="min-w-0 flex-1 overflow-hidden text-ellipsis">{children}</span>}
      {!collapsed && count !== undefined && <CountBadge inline soft className="ml-auto">{count}</CountBadge>}
    </>
  );
  const click = () => {
    onClick?.();
    setMobileOpen(false);
  };
  return href ? (
    <a href={href} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} className={cls} onClick={click}>
      {content}
    </a>
  ) : (
    <button type="button" aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} disabled={disabled} className={cls} onClick={click}>
      {content}
    </button>
  );
}

export interface SidebarGroupProps {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  /** The sub-items — `<SidebarItem>`s. Only two or more related items get a group; a single item stays a plain top-level link. */
  children: ReactNode;
}

/**
 * A top-level item with sub-items: hover (or focus) the row and they fly out to the right with a small arrow on the
 * parent. In the mobile drawer the sub-items expand inline instead.
 */
export function SidebarGroup({ icon, label, active, children }: SidebarGroupProps) {
  const collapsed = useContext(CollapsedContext);
  const [open, setOpen] = useState(false);
  return (
    <div className="group relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? label : undefined}
        aria-label={collapsed ? label : undefined}
        onClick={() => setOpen(!open)}
        className={cn(itemClass, active && activeClass, collapsed && "mx-auto w-10 justify-center p-2.5")}
      >
        {icon}
        {!collapsed && <span className="min-w-0 flex-1 overflow-hidden text-ellipsis">{label}</span>}
        {!collapsed && <ChevRightIcon className="!size-3.5 ml-auto text-text-faint group-hover:text-text" />}
      </button>
      <div
        role="menu"
        className={cn(
          "absolute left-full top-[-6px] z-[60] pl-2 group-focus-within:block group-hover:block",
          open ? "block" : "hidden",
          "max-[760px]:static max-[760px]:pl-3 max-[760px]:group-hover:hidden max-[760px]:group-focus-within:hidden",
          open && "max-[760px]:!block",
        )}
      >
        <div className="flex min-w-[180px] flex-col overflow-hidden rounded-sm border border-border bg-surface shadow max-[760px]:min-w-0 max-[760px]:border-0 max-[760px]:shadow-none">
          <FlyoutItems>{children}</FlyoutItems>
        </div>
      </div>
    </div>
  );
}

/** Sub-items render square and tight inside the flyout, and always show their label (even when the sidebar is collapsed). */
function FlyoutItems({ children }: { children: ReactNode }) {
  return (
    <CollapsedContext.Provider value={false}>
      <div className="[&>*]:!w-full [&>*]:!rounded-none [&>*]:!px-3 [&>*]:!py-[9px] [&>*]:!text-[13.5px]">{children}</div>
    </CollapsedContext.Provider>
  );
}
