"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { useKeepInView } from "../../lib/use-keep-in-view";

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentId: string;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenu.* must be used inside <DropdownMenu>");
  return ctx;
}

export interface DropdownMenuProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Replaces the default `relative inline-block` wrapper classes (e.g. `relative block w-full` for a form select, `static` to anchor the list to an ancestor). */
  className?: string;
}

/** Root. Controls open state itself unless `open`/`onOpenChange` are passed. */
export function DropdownMenu({ children, open, onOpenChange, className }: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const actualOpen = isControlled ? open : uncontrolledOpen;
  const triggerRef = useRef<HTMLElement>(null);
  const contentId = useId();

  // Kept in a ref so `setOpen` has a stable identity — the content's listener effect depends on it.
  const latest = useRef({ isControlled, onOpenChange });
  latest.current = { isControlled, onOpenChange };
  const setOpen = useCallback((next: boolean) => {
    if (!latest.current.isControlled) setUncontrolledOpen(next);
    latest.current.onOpenChange?.(next);
  }, []);

  return (
    <DropdownMenuContext.Provider value={{ open: actualOpen, setOpen, triggerRef, contentId }}>
      <div className={className ?? "relative inline-block"}>{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export interface DropdownMenuTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Use the single child element as the trigger (your own `<Button>`, an `<IconButton>`) instead of wrapping it in another
   * button: the menu's aria attributes, click handler and `className` are merged onto it.
   */
  asChild?: boolean;
}

/** Trigger button — renders a `<button>` around whatever you pass as children (icon, label, both), or decorates the child with `asChild`. */
export function DropdownMenuTrigger({ className, children, onClick, asChild = false, ...props }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef, contentId } = useDropdownMenuContext();
  const aria = { "aria-haspopup": "menu" as const, "aria-expanded": open, "aria-controls": open ? contentId : undefined };
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>;
    return cloneElement(child, {
      ...props,
      ...aria,
      ref: triggerRef,
      className: cn(child.props.className as string | undefined, className),
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        (child.props.onClick as ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined)?.(e);
        onClick?.(e);
        setOpen(!open);
      },
    });
  }
  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      type="button"
      {...aria}
      onClick={(e) => {
        onClick?.(e);
        setOpen(!open);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-btn",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end";
  /** `"menu"` (default) for a list of items, with arrow-key navigation; use `"dialog"` for a panel of form fields. */
  role?: "menu" | "dialog";
  /**
   * Draw the menu in a layer over the page (`position: fixed`, 6px under the trigger, `align` kept) instead of inside the
   * trigger's box, so a scrolling or clipping ancestor — a table's scroll area, an `overflow-hidden` card — can't cut it off.
   * It flips above the trigger when there is no room below and follows the trigger while the page scrolls. Positional
   * classes (`left-0`, `inset-x-0`, `top-*`) don't apply; width classes do.
   */
  portal?: boolean;
  /** With `portal`: make the menu exactly as wide as its trigger (a select's panel), instead of its own width class. */
  matchTriggerWidth?: boolean;
}

const GAP = 6;
const MARGIN = 8;

export function DropdownMenuContent({ className, align = "start", role = "menu", portal = false, matchTriggerWidth = false, style, children, ...props }: DropdownMenuContentProps) {
  const { open, setOpen, triggerRef, contentId } = useDropdownMenuContext();
  const contentRef = useRef<HTMLDivElement>(null);
  useKeepInView(contentRef, open && !portal);
  const [place, setPlace] = useState<CSSProperties | null>(null);

  // Portal: position against the trigger's screen rectangle, flip up when the bottom would leave the viewport, stay inside the side margins.
  useLayoutEffect(() => {
    if (!open || !portal) {
      setPlace(null);
      return;
    }
    const update = () => {
      const t = triggerRef.current?.getBoundingClientRect();
      const c = contentRef.current;
      if (!t || !c) return;
      const vh = window.innerHeight;
      const vw = document.documentElement.clientWidth;
      const h = c.offsetHeight;
      const w = matchTriggerWidth ? t.width : c.offsetWidth;
      const below = vh - t.bottom - GAP;
      const flip = below < h && t.top - GAP > below;
      const top = flip ? Math.max(MARGIN, t.top - GAP - h) : Math.min(t.bottom + GAP, Math.max(MARGIN, vh - MARGIN - h));
      const left = Math.max(MARGIN, Math.min(align === "end" ? t.right - w : t.left, vw - MARGIN - w));
      setPlace({ position: "fixed", top, left, ...(matchTriggerWidth ? { width: t.width } : {}) });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, portal, align, matchTriggerWidth, triggerRef]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    if (role === "menu") {
      contentRef.current?.querySelector<HTMLElement>('[role^="menuitem"]:not(:disabled)')?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, role, setOpen, triggerRef]);

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = [...(contentRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      e.preventDefault();
      items[(to + items.length) % items.length]?.focus();
    };
    if (e.key === "ArrowDown") move(i + 1);
    else if (e.key === "ArrowUp") move(i - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(items.length - 1);
  }

  if (!open) return null;

  const content = (
    <div
      ref={contentRef}
      id={contentId}
      role={role}
      onKeyDown={role === "menu" ? onMenuKeyDown : undefined}
      style={portal ? { ...style, ...(place ?? { position: "fixed", top: 0, left: 0, visibility: "hidden" }) } : style}
      className={cn(
        "z-50 w-[180px] overflow-hidden rounded-sm border border-border bg-surface shadow",
        portal ? "fixed z-[90]" : cn("absolute top-[calc(100%+6px)]", align === "end" ? "right-0" : "left-0"),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
  return portal ? createPortal(content, document.body) : content;
}

export interface DropdownMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

export function DropdownMenuItem({ className, destructive = false, onClick, ...props }: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenuContext();
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-[9px] text-left text-[13.5px] leading-[normal] text-text transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-text-faint",
        "hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:-outline-offset-2",
        destructive && "text-danger-text [&_svg]:text-danger-text",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn("my-1 h-px bg-border", className)} />;
}
