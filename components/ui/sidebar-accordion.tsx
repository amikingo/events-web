"use client";

import { useContext, useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { useAppShell } from "./app-shell";
import { ChevIcon } from "./icons";
import { AccordionGroupContext, BrandIndicator, SidebarVariantContext, activeClass, brandActiveClass, brandGroupOpenClass, brandItemClass, itemClass } from "./sidebar";

export interface SidebarAccordionItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** The page the user is on. */
  active?: boolean;
  onSelect: () => void;
}

export interface SidebarAccordionProps {
  icon?: ReactNode;
  label: string;
  /** The sub-pages. Two or more; a single page stays a plain `SidebarItem`. */
  items: SidebarAccordionItem[];
  /** Open when first shown. Default: open if one of the items is the current page. */
  defaultOpen?: boolean;
}

/**
 * A top-level item with sub-pages. Open sidebar: the sub-pages expand in place, indented under the parent, with an arrow that
 * turns over. Collapsed sidebar (icons only): hover, focus or tap the icon and a small card opens beside it with the parent's
 * name as its title and the sub-pages below. Use inside a `<Sidebar>`.
 */
export function SidebarAccordion({ icon, label, items, defaultOpen }: SidebarAccordionProps) {
  const { collapsed, setMobileOpen } = useAppShell();
  const listId = useId();
  const hasActive = items.some((i) => i.active);

  const [open, setOpen] = useState(defaultOpen ?? hasActive);
  // bookings_web: the collapsed fly-out card has its own state. Sharing `open` made it pop up whenever the group was open inline
  // (collapsing the sidebar on one of its pages, or arriving on one of them), with nothing to close it.
  const [popOpen, setPopOpen] = useState(false);
  // bookings_web: one group open at a time. Opening a group (or arriving on one of its pages) announces it; the others close.
  const group = useContext(AccordionGroupContext);
  const brand = useContext(SidebarVariantContext) === "brand";
  const groupKey = useId();
  const announced = group?.openKey;
  useEffect(() => {
    if (announced !== undefined && announced !== groupKey) setOpen(false);
  }, [announced, groupKey]);
  const setOpenKey = group?.setOpenKey;
  useEffect(() => {
    if (hasActive) setOpenKey?.(groupKey);
  }, [hasActive, groupKey, setOpenKey]);
  const toggleInline = () => {
    const next = !open;
    setOpen(next);
    if (next) setOpenKey?.(groupKey);
  };
  // The card is also shown by CSS while the pointer is over it or something inside has focus, and a click leaves both true.
  // After choosing a page it stays hidden until the pointer leaves and comes back.
  const [dismissed, setDismissed] = useState(false);
  // Arriving on one of the sub-pages (from search, a link or Back) opens the group. Done while rendering, not in an effect.
  const [sawActive, setSawActive] = useState(hasActive);
  if (hasActive !== sawActive) {
    setSawActive(hasActive);
    if (hasActive) setOpen(true);
  }

  const select = (item: SidebarAccordionItem) => {
    item.onSelect();
    if (collapsed) {
      setPopOpen(false); // the card closes; an inline group stays as it is
      setDismissed(true);
    }
    setMobileOpen(false);
  };

  if (collapsed) {
    return (
      <div
        className="group relative flex w-full justify-center"
        onMouseLeave={(e) => {
          setPopOpen(false);
          setDismissed(false);
          // A click leaves focus on the icon or a page in the card, and the card also shows while something inside has focus:
          // let go of it when the pointer leaves, so the card closes. (Keyboard users never trigger this.)
          const focused = document.activeElement;
          if (focused instanceof HTMLElement && e.currentTarget.contains(focused)) focused.blur();
        }}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={popOpen}
          aria-label={label}
          // bookings_web: no `title` tooltip here: the card that opens beside the icon already names the group, and the
          // browser tooltip would be drawn over its first row.
          onClick={() => setPopOpen((o) => !o)}
          className={cn(itemClass, brand && brandItemClass, hasActive && (brand ? brandActiveClass : activeClass), "mx-auto w-10 justify-center p-2.5")}
        >
          {icon}
        </button>
        <div
          role="menu"
          aria-label={label}
          className={cn("absolute left-full top-[-6px] z-[60] pl-2 group-focus-within:block group-hover:block", popOpen ? "block" : "hidden", dismissed && "!hidden")}
        >
          <div className="flex w-56 flex-col gap-0.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-surface p-2 shadow-[var(--shadow)]">
            <div className="flex items-center gap-2 px-2 pb-1.5 pt-1 text-[13px] font-semibold text-accent-text [&_svg]:size-4 [&_svg]:flex-none">
              {icon}
              <span className="min-w-0 truncate">{label}</span>
            </div>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                aria-current={item.active ? "page" : undefined}
                onClick={() => select(item)}
                className={cn(itemClass, brand && brandItemClass, "py-2", item.active && (brand ? brandActiveClass : activeClass))}
              >
                {brand && item.active ? <BrandIndicator /> : null}
                {item.icon}
                <span className="min-w-0 flex-1 overflow-hidden text-ellipsis">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={toggleInline}
        // bookings_web: the header is highlighted only to show where you are: a closed group that holds the current page.
        // An open group is just open (its current page is marked below), so two groups never look selected at once.
        className={cn(itemClass, // brand: a group is tinted whenever it holds the current page (open or closed); an open group without it is only bold.
          brand ? cn(brandItemClass, hasActive ? brandGroupOpenClass : open && "font-semibold text-text") : hasActive && !open && activeClass)}
      >
        {icon}
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis">{label}</span>
        <ChevIcon className={cn("!size-3.5 ml-auto flex-none transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div id={listId} inert={!open || undefined} className="overflow-hidden">
          <ul className={cn("m-0 flex list-none flex-col gap-0.5 p-0 pt-0.5", brand && "ml-[19px] mt-0.5 border-l border-[var(--color-border)] pl-3 pt-0")}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={item.active ? "page" : undefined}
                  onClick={() => select(item)}
                  className={cn(itemClass, brand ? cn(brandItemClass, "py-1.5", item.active && brandActiveClass) : cn("py-2 pl-[38px]", item.active && "font-semibold text-accent-text hover:text-accent-text"))}
                >
                  {brand && item.active ? <BrandIndicator /> : null}
                  {item.icon}
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
