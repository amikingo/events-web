"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { CloseButton } from "./close-button";
import { CheckThinIcon } from "./icons";

/* ───────────────────────── overlay (shared by Modal, BottomSheet, Drawer, Lightbox) ───────────────────────── */

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export interface OverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Escape and a backdrop click close it. Alerts pass `false`: the user must acknowledge. Default true. */
  dismissible?: boolean;
  /** `viewport` (default) portals to `<body>` and locks page scroll; `parent` fills the nearest positioned ancestor (a demo stage, a phone frame). */
  container?: "viewport" | "parent";
  /** The darker 88% backdrop with a 4px blur, for image and document previews. */
  dark?: boolean;
  /** How the content sits: centered (modals), bottom (sheets) or right (drawers). */
  placement?: "center" | "bottom" | "right";
  className?: string;
}

/**
 * The backdrop and the behavior every overlay shares: 60% near-black with a 2px blur (the command palette's), Escape and
 * backdrop dismissal, focus moved inside and trapped, focus returned to the trigger on close, page scroll locked.
 */
export function Overlay({ open, onOpenChange, children, dismissible = true, container = "viewport", dark = false, placement = "center", className }: OverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = rootRef.current;
    // Focus lands on the primary action (marked data-autofocus), else the first control, else the dialog itself.
    const target = root?.querySelector<HTMLElement>("[data-autofocus]") ?? root?.querySelector<HTMLElement>(FOCUSABLE) ?? root?.querySelector<HTMLElement>('[role="dialog"],[role="alertdialog"]');
    if (!root?.contains(document.activeElement)) target?.focus(); // a child that autofocused itself (the OTP box) wins
    const scrollLock = container === "viewport" ? document.body.style.overflow : null;
    if (container === "viewport") document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        onOpenChange(false);
      } else if (e.key === "Tab" && root) {
        const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (container === "viewport") document.body.style.overflow = scrollLock ?? "";
      previous?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dismissible, container]);

  if (!open) return null;

  const node = (
    <div
      ref={rootRef}
      className={cn(
        "z-[80] flex",
        container === "viewport" ? "fixed inset-0" : "absolute inset-0",
        placement === "center" && "items-center justify-center p-5",
        placement === "bottom" && "items-end",
        placement === "right" && "justify-end",
        className,
      )}
    >
      <div
        aria-hidden="true"
        onClick={() => dismissible && onOpenChange(false)}
        className={cn("absolute inset-0 animate-mdl-fade backdrop-blur-[2px]", dark ? "bg-overlay-dark backdrop-blur-[4px]" : "bg-overlay")}
      />
      {children}
    </div>
  );
  return container === "viewport" && typeof document !== "undefined" ? createPortal(node, document.body) : node;
}

/* ───────────────────────── modal shell ───────────────────────── */

interface ModalContextValue {
  centered: boolean;
}
const ModalContext = createContext<ModalContextValue>({ centered: false });

export interface ModalProps extends Omit<OverlayProps, "placement" | "className" | "dark"> {
  /** 400 / 560 / 760px. */
  size?: "sm" | "md" | "lg";
  /** The centered layout for confirmations and alerts: tile on top, centered text, no divider above the footer. */
  centered?: boolean;
  /** `alertdialog` for blocking notices. */
  role?: "dialog" | "alertdialog";
  /** Accessible name when there is no `<ModalTitle>` wired up. */
  "aria-label"?: string;
  className?: string;
}

const sizeClasses = { sm: "max-w-[400px]", md: "max-w-[560px]", lg: "max-w-[760px]" } as const;

/**
 * `.mdl` — the one dialog shell: surface, 1px border, 16px radius, deep shadow, 400 / 560 / 760px wide, a header,
 * a body that scrolls while header and footer stay fixed, and a footer with secondary then primary on the right.
 * Modals only confirm, alert, pick or preview — never show, create or edit a record.
 */
export function Modal({ open, onOpenChange, size = "md", centered = false, role = "dialog", dismissible, container, children, className, ...props }: ModalProps) {
  return (
    <Overlay open={open} onOpenChange={onOpenChange} dismissible={dismissible ?? role !== "alertdialog"} container={container}>
      <ModalContext.Provider value={{ centered }}>
        <div
          role={role}
          aria-modal="true"
          tabIndex={-1}
          aria-label={props["aria-label"]}
          className={cn(
            "relative z-[1] flex max-h-full w-full animate-mdl-in flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-modal motion-reduce:animate-none",
            sizeClasses[size],
            centered && "text-center",
            className,
          )}
        >
          {children}
        </div>
      </ModalContext.Provider>
    </Overlay>
  );
}

export interface ModalHeaderProps {
  title: ReactNode;
  /** `.mdl-sub` — 12.5px muted line under the title. */
  subtitle?: ReactNode;
  /** A logo or icon tile before the title (the payment dialog's method logo). */
  leading?: ReactNode;
  /** An icon tile alone, no title — the destructive dialog's header (`plain`). */
  onClose?: () => void;
  /** No divider and no bottom padding: the title-less red-tile header. */
  plain?: boolean;
  /** Something on the right instead of the close button. */
  trailing?: ReactNode;
  className?: string;
}

/** `.mdl-head` — 16/600 title, optional sub, the command palette's close button at top right. Not used by centered dialogs. */
export function ModalHeader({ title, subtitle, leading, onClose, plain = false, trailing, className }: ModalHeaderProps) {
  return (
    <div className={cn("flex items-start gap-3 px-5 pb-3.5 pt-[18px]", plain ? "border-b-0 pb-0" : "border-b border-border", className)}>
      {leading}
      <div className="min-w-0 flex-1">
        {title && <h4 className="m-0 min-w-0 text-[16px] font-semibold leading-[1.3] text-text">{title}</h4>}
        {subtitle && <p className="m-0 mt-0.5 text-[12.5px] font-normal text-text-faint">{subtitle}</p>}
      </div>
      {trailing ?? (onClose && <CloseButton aria-label="Close" onClick={onClose} className="-mr-1.5 -mt-0.5" />)}
    </div>
  );
}

/** `.mdl-body` — 13.5px / soft / 1.55, scrolls when long. */
export function ModalBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { centered } = useContext(ModalContext);
  return (
    <div
      className={cn(
        "overflow-y-auto text-[13.5px] leading-[1.55] text-text-soft [&_p]:mb-2.5 [&_p:last-child]:mb-0",
        centered ? "flex flex-col items-center gap-2 px-6 pb-2 pt-6" : "px-5 py-[18px]",
        className,
      )}
      {...props}
    />
  );
}

/** `.mdl-title` for centered dialogs (the title lives in the body there). */
export function ModalTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h4 className={cn("m-0 text-[16px] font-semibold leading-[1.55] text-text", className)} {...props} />;
}

export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** `.foot-left` — helper text on the left ("Step 2 of 3"). */
  left?: ReactNode;
}

/** `.mdl-foot` — right-aligned, secondary first and primary last. Centered dialogs center it and drop the divider. */
export function ModalFooter({ left, className, children, ...props }: ModalFooterProps) {
  const { centered } = useContext(ModalContext);
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 bg-surface",
        centered ? "justify-center px-6 pb-[22px] pt-3.5 [&_button]:min-w-[120px]" : "justify-end border-t border-border px-5 py-3.5",
        className,
      )}
      {...props}
    >
      {left && <div className="mr-auto flex items-center gap-2 text-[12.5px] text-text-faint">{left}</div>}
      {children}
    </div>
  );
}

/* ───────────────────────── stepper ───────────────────────── */

export interface ModalStepsProps {
  steps: string[];
  /** 1-based current step. Earlier steps show a check, later ones their number. */
  current: number;
  className?: string;
}

/** `.mdl-steps` — numbered circles joined by lines: accent while active, success once done. Sits under the header of a multi-step modal. */
export function ModalSteps({ steps, current, className }: ModalStepsProps) {
  return (
    <ol className={cn("m-0 flex list-none items-center px-5 pb-0 pt-3.5", className)}>
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n === current ? "active" : n < current ? "done" : "todo";
        return (
          <li key={label} className="contents">
            {i > 0 && <span aria-hidden="true" className={cn("mx-2.5 h-[1.5px] min-w-4 flex-1", n <= current ? "bg-success" : "bg-border")} />}
            <span aria-current={state === "active" ? "step" : undefined} className={cn("flex items-center gap-2 whitespace-nowrap text-[12px] font-semibold", state === "active" ? "text-text" : state === "done" ? "text-text-soft" : "text-text-faint")}>
              <span
                className={cn(
                  "flex size-6 flex-none items-center justify-center rounded-full border-[1.5px] bg-surface text-[11px] font-bold",
                  state === "active" && "border-accent-fill bg-accent-fill text-white",
                  state === "done" && "border-success bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-surface))] text-success-text",
                  state === "todo" && "border-border-strong",
                )}
              >
                {state === "done" ? <CheckThinIcon className="size-3" /> : n}
              </span>
              <span className="max-[480px]:sr-only">{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
