"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { PagerPrevIcon, ChevRightIcon } from "./icons";
import { Logo } from "./logo";
import { CountBadge } from "./count-badge";
import { TooltipBubble } from "./tooltip";
import { SIDEBAR_COLLAPSED, SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN, SIDEBAR_SNAP, useAppShell } from "./app-shell";

const CollapsedContext = createContext(false);

/**
 * bookings_web: `brand` is the dashboard look: rounded rows that tint with the organization's brand colour on hover, the current
 * page as a brand-colour gradient pill with a glow and a white bar at its left edge, the open group tinted, and sub-pages
 * indented under a guide line. `default` is the library's own look.
 */
export type SidebarVariant = "default" | "brand";
export const SidebarVariantContext = createContext<SidebarVariant>("default");

export const brandItemClass =
  "relative gap-2.5 rounded-xl py-2 text-[13.5px] [&_svg]:size-[17px] hover:bg-[color:color-mix(in_srgb,var(--color-accent)_8%,transparent)] hover:text-[color:var(--color-accent)]";
export const brandActiveClass =
  "bg-[color:var(--color-accent)] bg-[linear-gradient(135deg,var(--color-accent),color-mix(in_srgb,var(--color-accent)_85%,black))] font-semibold text-[color:var(--brand-primary-text,#fff)] shadow-[0_4px_14px_color-mix(in_srgb,var(--color-accent)_25%,transparent)] hover:bg-[color:var(--color-accent)] hover:text-[color:var(--brand-primary-text,#fff)]";
/** A group header that holds the current page (open or closed). */
export const brandGroupOpenClass = "bg-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)] font-semibold text-[color:var(--color-accent)]";

/** The white bar at the left edge of the current page's pill. */
export function BrandIndicator() {
  return <span aria-hidden="true" className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white/80" />;
}

/**
 * bookings_web: which `SidebarAccordion` is open, so opening one closes the others. `undefined` = nobody has chosen yet (groups keep
 * their own initial state); a key = that group is the open one; `null` = close them all (a plain link was chosen).
 */
export const AccordionGroupContext = createContext<{ openKey: string | null | undefined; setOpenKey: (key: string | null) => void } | null>(null);

export interface SidebarProps {
  /** The expanded header brand (default: the pink wordmark, 16px tall as the guideline sets it). */
  logo?: ReactNode;
  /** The collapsed header brand (default: the standalone "C" mark, 18px). */
  logoMark?: ReactNode;
  /** The footer line. Default "Powered by" + the Cheche wordmark, centred; `false` hides it. */
  footer?: ReactNode | false;
  /** bookings_web: `brand` is the dashboard look (see `SidebarVariant`). Default `default`. */
  variant?: SidebarVariant;
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
export function Sidebar({ logo, logoMark, footer, variant = "default", assetBase, children, className, "aria-label": ariaLabel = "Main navigation" }: SidebarProps) {
  const { collapsed, setCollapsed, width, setWidth, mobileOpen } = useAppShell();
  const [resizing, setResizing] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; w: number } | null>(null);

  // bookings_web: the saved width comes from localStorage after the page loads. A sidebar that hydrates later (inside a Suspense
  // boundary) must still match the server's HTML on its first render, so it starts at the default width and applies the saved one
  // straight after.
  // bookings_web: the menu scrolls whenever it is taller than the sidebar. Collapsed, it stays visible (tooltips and fly-out cards
  // hang outside the rail and a scroll area would clip them) and only scrolls once the icons no longer fit.
  const listRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1);
  });
  useEffect(() => {
    const check = () => {
      const el = listRef.current;
      if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1);
    };
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [openKey, setOpenKey] = useState<string | null | undefined>(undefined);
  const groupValue = useMemo(() => ({ openKey, setOpenKey }), [openKey]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shownWidth = mounted ? width : SIDEBAR_DEFAULT;

  const w = collapsed ? SIDEBAR_COLLAPSED : shownWidth;

  return (
    <SidebarVariantContext.Provider value={variant}>
    <CollapsedContext.Provider value={collapsed}>
      <nav
        ref={ref}
        aria-label={ariaLabel}
        style={{ width: w }}
        className={cn(
          // bookings_web: z-40 (was 2) so the fly-out cards sit above page content such as a table's sticky header (z-3); modals and drawers (z-80) stay above.
          "relative z-40 m-3 mr-0.5 flex flex-none flex-col overflow-visible rounded-[var(--radius-md)] border border-[var(--color-border)] bg-surface shadow-[var(--shadow)]",
          !resizing && "transition-[width] duration-200",
          // Drawer below 760px.
          "max-[760px]:absolute max-[760px]:inset-y-0 max-[760px]:left-0 max-[760px]:z-30 max-[760px]:m-0 max-[760px]:!w-[220px] max-[760px]:rounded-none max-[760px]:border-0 max-[760px]:border-r",
          "max-[760px]:transition-transform max-[760px]:ease-slow",
          mobileOpen ? "max-[760px]:translate-x-0 max-[760px]:shadow-modal" : "max-[760px]:-translate-x-full",
          className,
        )}
      >
        {/* bookings_web: the logo is centred in the header; the collapse toggle is pinned to the right edge so it doesn't push it off-centre. */}
        <div className={cn("relative flex items-center justify-center gap-2 py-4", collapsed ? "px-0" : "px-11")}>
          {collapsed ? (logoMark ?? <Logo variant="icon-outline" width={18} allowBelowMin assetBase={assetBase} alt="Cheche" className="size-[18px] flex-none" />) : (logo ?? <Logo variant="wordmark" width={86} allowBelowMin assetBase={assetBase} alt="Cheche" className="h-4 w-auto flex-none" />)}
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex size-[26px] flex-none items-center justify-center rounded-[var(--radius-full)] border border-[var(--color-border)] bg-surface text-text-soft hover:bg-surface-2",
              collapsed ? "absolute -right-[13px] top-[18px] z-10 shadow-[var(--shadow)]" : "absolute right-2.5 top-1/2 -translate-y-1/2",
              "max-[760px]:hidden",
            )}
          >
            <PagerPrevIcon className={cn("size-[13px] transition-transform duration-200", collapsed && "rotate-180")} />
          </button>
        </div>

        <div ref={listRef} // `[&>*]:shrink-0`: rows keep their height when the menu is taller than the sidebar. Without it the plain links (which clip their
          // content) squeeze together while group headers don't, so the spacing goes uneven; the menu scrolls instead.
          className={cn("flex min-h-0 flex-1 flex-col gap-[3px] px-2.5 py-2.5 [&>*]:shrink-0", (!collapsed || overflowing) && "overflow-y-auto overscroll-contain")}>
          <AccordionGroupContext.Provider value={groupValue}>{children}</AccordionGroupContext.Provider>
        </div>

        {footer !== false && (
          <div className={cn("flex items-center justify-center gap-1.5 py-3 text-[11px] text-text-faint", collapsed ? "px-0" : "px-3.5")}>
            {!collapsed && (
              footer ?? (
                <>
                  <span>Powered by</span>
                  <Logo variant="wordmark" width={58} allowBelowMin assetBase={assetBase} alt="Cheche" className="h-[11px] w-auto flex-none" />
                </>
              )
            )}
          </div>
        )}

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuemin={SIDEBAR_MIN}
          aria-valuemax={SIDEBAR_MAX}
          aria-valuenow={shownWidth}
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
          <span className={cn("h-full w-0.5 rounded-[var(--radius-full)] bg-transparent transition-colors group-hover/rz:bg-border-strong group-focus-visible/rz:bg-[var(--color-accent)]", resizing && "bg-[var(--color-accent)]")} />
        </div>
      </nav>
    </CollapsedContext.Provider>
    </SidebarVariantContext.Provider>
  );
}

export const itemClass = "flex w-full cursor-pointer items-center gap-[11px] overflow-hidden whitespace-nowrap rounded-popover px-3 py-2.5 text-left text-[13px] font-medium text-text-soft hover:bg-surface-2 hover:text-text [&_svg]:size-[18px] [&_svg]:flex-none";
export const activeClass = "bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] font-semibold text-accent-text hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] hover:text-accent-text";

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
  const brand = useContext(SidebarVariantContext) === "brand";
  const group = useContext(AccordionGroupContext);
  const { setMobileOpen } = useAppShell();
  const label = typeof children === "string" ? children : undefined;
  // bookings_web: collapsed, the label shows in a tooltip beside the icon right away (the native `title` waits about a second).
  const cls = cn(itemClass, brand && brandItemClass, active && (brand ? brandActiveClass : activeClass), collapsed && "group/tip relative mx-auto w-10 justify-center overflow-visible p-2.5", disabled && "pointer-events-none opacity-40", className);
  const content = (
    <>
      {brand && active && !collapsed ? <BrandIndicator /> : null}
      {icon}
      {!collapsed && <span className="min-w-0 flex-1 overflow-hidden text-ellipsis">{children}</span>}
      {!collapsed && count !== undefined && <CountBadge inline soft className="ml-auto">{count}</CountBadge>}
      {collapsed && label ? (
        <TooltipBubble side="right" className="max-[760px]:hidden opacity-0 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100">
          {label}
        </TooltipBubble>
      ) : null}
    </>
  );
  // bookings_web: with both `href` and `onClick`, a plain click runs `onClick` (client-side navigation) and a modified click
  // (new tab, ⌘/Ctrl, Shift) falls through to the browser, so the item stays a real link.
  const click = (e?: React.MouseEvent) => {
    if (href && onClick && e && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) e.preventDefault();
    else if (href && onClick) {
      setMobileOpen(false);
      return;
    }
    group?.setOpenKey(null); // choosing a plain link closes any open group (a new-tab click above leaves them as they are)
    onClick?.();
    setMobileOpen(false);
  };
  return href ? (
    <a href={href} aria-current={active ? "page" : undefined} aria-label={collapsed ? label : undefined} className={cls} onClick={click}>
      {content}
    </a>
  ) : (
    <button type="button" aria-current={active ? "page" : undefined} aria-label={collapsed ? label : undefined} disabled={disabled} className={cls} onClick={click}>
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
    <div className={cn("group relative", collapsed && "flex w-full justify-center")} onMouseLeave={() => setOpen(false)}>
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
        <div className="flex min-w-[180px] flex-col overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-surface shadow-[var(--shadow)] max-[760px]:min-w-0 max-[760px]:border-0 max-[760px]:shadow-none">
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
