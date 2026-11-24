"use client";

import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { ErrorBanner } from "./error-banner";
import { IconTile } from "./icon-tile";
import type { IconTileTone } from "./icon-tile";
import { Input } from "./input";
import { AlertCircleIcon, InfoIcon, WarnIcon } from "./icons";
import { Modal, ModalBody, ModalFooter, ModalTitle } from "./modal";

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Replaces the default tone icon. */
  icon?: ReactNode;
  /** Locks both buttons; the primary shows its spinner and `loadingLabel`. */
  loading?: boolean;
  /** Present-tense label while loading ("Approving"). */
  loadingLabel?: ReactNode;
  /** A failure from the last attempt, shown as the red banner inside the body. */
  error?: ReactNode;
  container?: "viewport" | "parent";
}

export interface ConfirmDialogProps extends BaseProps {
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  tone?: Exclude<IconTileTone, "danger">;
  onConfirm: () => void;
  /** Extra body content under the description (a key/value summary). */
  children?: ReactNode;
}

const toneIcon = { accent: InfoIcon, charcoal: InfoIcon, success: InfoIcon, warning: WarnIcon } as const;

/** Centered confirmation: tile, title, one or two lines, Cancel + primary. Focus lands on the primary action. */
export function ConfirmDialog({ open, onOpenChange, title, description, icon, tone = "accent", confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, loading, loadingLabel, error, container, children }: ConfirmDialogProps) {
  const Icon = toneIcon[tone];
  return (
    <Modal open={open} onOpenChange={(o) => !loading && onOpenChange(o)} size="sm" centered container={container} aria-label={typeof title === "string" ? title : undefined}>
      <ModalBody>
        <IconTile tone={tone} size="lg" className="mb-1.5 [&_svg]:size-6">
          {icon ?? <Icon />}
        </IconTile>
        <ModalTitle>{title}</ModalTitle>
        {description && <p>{description}</p>}
        {children}
        {error && <ErrorBanner className="mb-0 mt-2 w-full">{error}</ErrorBanner>}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" disabled={loading} onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button data-autofocus loading={loading} loadingLabel={loadingLabel} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export interface DestructiveDialogProps extends BaseProps {
  /** The exact name the user must type (a record's name or reference) before the red button enables. Omit for a plain red confirmation. */
  confirmName?: string;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  onConfirm: () => void;
}

/** A delete that cannot be undone: danger tile, the name to type, red button disabled until it matches. */
export function DestructiveDialog({ open, onOpenChange, title, description, icon, confirmName, confirmLabel = "Delete", cancelLabel = "Cancel", onConfirm, loading, loadingLabel, error, container }: DestructiveDialogProps) {
  const [typed, setTyped] = useState("");
  const inputId = useId();
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);
  const matches = confirmName === undefined || typed === confirmName;
  return (
    <Modal open={open} onOpenChange={(o) => !loading && onOpenChange(o)} size="sm" centered container={container} aria-label={typeof title === "string" ? title : undefined}>
      <ModalBody>
        <IconTile tone="danger" size="lg" className="mb-1.5 [&_svg]:size-6">
          {icon ?? <AlertCircleIcon />}
        </IconTile>
        <ModalTitle>{title}</ModalTitle>
        {description && <p>{description}</p>}
        {confirmName !== undefined && (
        <div className="mt-2 flex w-full flex-col gap-1.5 text-left">
          <label htmlFor={inputId} className="text-[12.5px] text-text-soft">
            Type <code className="rounded-check border border-border bg-surface-2 px-1.5 py-px font-mono text-[12.5px] text-text">{confirmName}</code> to confirm
          </label>
          <Input id={inputId} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" disabled={loading} data-autofocus />
        </div>
        )}
        {error && <ErrorBanner className="mb-0 mt-2 w-full">{error}</ErrorBanner>}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" disabled={loading} onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button variant="danger" data-autofocus={confirmName === undefined || undefined} disabled={!matches} loading={loading} loadingLabel={loadingLabel} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export interface AlertDialogProps extends Omit<BaseProps, "loading" | "loadingLabel" | "error"> {
  actionLabel?: ReactNode;
  tone?: IconTileTone;
  /** Runs when the user acknowledges; the dialog then closes. */
  onAction?: () => void;
}

/** A blocking notice: no close button, no Escape, no backdrop dismissal — the user must acknowledge. */
export function AlertDialog({ open, onOpenChange, title, description, icon, tone = "warning", actionLabel = "Got it", onAction, container }: AlertDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} size="sm" centered role="alertdialog" dismissible={false} container={container} aria-label={typeof title === "string" ? title : undefined}>
      <ModalBody>
        <IconTile tone={tone} size="lg" className="mb-1.5 [&_svg]:size-6">
          {icon ?? <WarnIcon />}
        </IconTile>
        <ModalTitle>{title}</ModalTitle>
        {description && <p>{description}</p>}
      </ModalBody>
      <ModalFooter>
        <Button
          data-autofocus
          onClick={() => {
            onAction?.();
            onOpenChange(false);
          }}
        >
          {actionLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
