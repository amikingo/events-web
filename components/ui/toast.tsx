"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CloseButton } from "./close-button";
import { IconTile } from "./icon-tile";
import type { IconTileTone } from "./icon-tile";
import { CheckThinIcon, DownloadIcon, InfoIcon, UndoIcon, WarnIcon, XCircleIcon } from "./icons";
import { ProgressBar } from "./progress-bar";
import { ButtonSpinner } from "./spinner";
import { TextLink } from "./text-link";

export type ToastKind = "success" | "danger" | "warning" | "info" | "neutral";
export type ToastIcon = "check" | "x" | "warn" | "info" | "undo" | "download" | "loading";

export interface ToastAction {
  label: ReactNode;
  /** The secondary action beside a primary one ("Decline"). */
  soft?: boolean;
  onClick?: () => void;
}

export interface ToastViewProps {
  kind?: ToastKind;
  /** Built-in icon for the tile. Ignored when `leading` is given. */
  icon?: ToastIcon;
  /** Replaces the icon tile — an `<Avatar size={32}>` or `<PayLogo size={32}>`. */
  leading?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  /** `.toast-meta` — the 11px muted line under the body ("Telebirr · just now"). */
  meta?: ReactNode;
  /** `.toast-amt` — a bold amount on the right (transactions). */
  amount?: ReactNode;
  amountTone?: "default" | "in";
  /** `.prog-row` — a progress bar with a left and right caption. Used by background jobs. */
  progress?: { value: number; left?: ReactNode; right?: ReactNode };
  actions?: ToastAction[];
  /** One line, tighter padding — title-only confirmations. */
  compact?: boolean;
  /** The mobile snackbar: charcoal surface, one line, accent action. */
  snackbar?: boolean;
  /** Shows the 2px timer line for this many ms (the toast dismisses itself — the region does the actual timing). */
  timerMs?: number;
  timerPaused?: boolean;
  /** Change to restart the timer line (an updated toast gets a fresh window). */
  timerKey?: number;
  onDismiss?: () => void;
  className?: string;
}

const kindTone: Record<ToastKind, IconTileTone> = { success: "success", danger: "danger", warning: "warning", info: "accent", neutral: "accent" };
const kindIcon: Record<ToastKind, ToastIcon> = { success: "check", danger: "x", warning: "warn", info: "info", neutral: "info" };
const timerColor: Record<ToastKind, string> = { success: "bg-success", danger: "bg-danger", warning: "bg-warning", info: "bg-accent", neutral: "bg-accent" };
const icons = { check: CheckThinIcon, x: XCircleIcon, warn: WarnIcon, info: InfoIcon, undo: UndoIcon, download: DownloadIcon };

/**
 * `.toast` — one shell, ten patterns: a card at most 380px wide with a 32px icon tile (or an avatar / payment logo),
 * a 13.5px title, an optional 12.5px body, text-link actions and the quiet close button. A 2px line along the bottom
 * shows how long it stays. Pure view — `toast()` and `<Toaster>` (toaster.tsx) put it on screen and time it.
 */
export function Toast({ kind = "neutral", icon, leading, title, body, meta, amount, amountTone = "default", progress, actions, compact = false, snackbar = false, timerMs, timerPaused = false, timerKey, onDismiss, className }: ToastViewProps) {
  const iconKey = icon ?? (kind === "neutral" ? "info" : kindIcon[kind]);
  const Icon = iconKey === "loading" ? null : icons[iconKey];
  const tile =
    leading ??
    (snackbar ? null : (
      <IconTile size="sm" tone={kind === "neutral" && (icon === "undo") ? "charcoal" : kindTone[kind]} className="mt-px">
        {Icon ? <Icon /> : <ButtonSpinner className="text-accent" />}
      </IconTile>
    ));

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto relative flex w-full max-w-[380px] overflow-hidden rounded-md border",
        snackbar
          ? "items-center gap-2.5 border-transparent bg-charcoal px-3.5 py-3 text-bg shadow-snackbar"
          : cn("gap-3 border-border bg-surface shadow-raised", compact ? "items-center py-2.5 pl-3 pr-2.5" : "items-start py-3 pl-3.5 pr-3"),
        className,
      )}
    >
      {tile}
      <div className="min-w-0 flex-1 break-words">
        <div className={cn(snackbar ? "text-[13px] font-medium" : "text-[13.5px] font-semibold text-text", "leading-[1.3]")}>{title}</div>
        {body && <div className="mt-0.5 text-[12.5px] leading-[1.45] text-text-soft [&_b]:font-semibold [&_b]:tabular-nums [&_b]:text-text">{body}</div>}
        {progress && (
          <>
            <ProgressBar value={progress.value} tone="accent" className="mt-2" />
            <div className="mt-1.5 flex justify-between text-[11.5px] tabular-nums text-text-faint [&_b]:font-semibold [&_b]:text-text">
              <span>{progress.left}</span>
              <span>{progress.right}</span>
            </div>
          </>
        )}
        {meta && <div className="mt-1 text-[11px] text-text-faint">{meta}</div>}
        {actions && actions.length > 0 && !snackbar && !compact && (
          <div className="mt-2 flex items-center gap-3.5">
            {actions.map((a, i) => (
              <TextLink key={i} soft={a.soft} onClick={a.onClick}>
                {a.label}
              </TextLink>
            ))}
          </div>
        )}
      </div>
      {actions && actions.length > 0 && (snackbar || compact) && (
        <div className="flex items-center gap-3.5">
          {actions.map((a, i) => (
            <TextLink key={i} soft={a.soft} onClick={a.onClick} className={cn(snackbar && "text-accent-light")}>
              {a.label}
            </TextLink>
          ))}
        </div>
      )}
      {amount && <span className={cn("mt-px whitespace-nowrap text-[14px] font-bold tabular-nums", amountTone === "in" ? "text-success-text" : "text-text")}>{amount}</span>}
      <CloseButton
        onClick={onDismiss}
        className={cn(!compact && !snackbar && "-mr-[3px] -mt-[3px]", snackbar && "opacity-65 text-current hover:bg-wash hover:text-current hover:opacity-100")}
      />
      {timerMs ? (
        <span
          key={timerKey}
          aria-hidden="true"
          className={cn("absolute bottom-0 left-0 h-0.5 w-full origin-left", snackbar ? "bg-accent-light" : timerColor[kind])}
          style={{ animation: `toast-timer ${timerMs}ms linear forwards`, animationPlayState: timerPaused ? "paused" : "running" }}
        />
      ) : null}
    </div>
  );
}
