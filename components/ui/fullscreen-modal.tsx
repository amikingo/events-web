"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { XIcon } from "./icons";
import { Overlay } from "./modal";

export interface FullscreenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** The one full-width action pinned at the bottom. */
  action?: ReactNode;
  onAction?: () => void;
  /** Esc closes it by default; pass false for a flow that must be finished. */
  dismissible?: boolean;
  container?: "viewport" | "parent";
  children: ReactNode;
  className?: string;
}

/** `.fs-modal` — the phone version of a longer modal task: 52px top bar with close, scrolling body, full-width action pinned below. Slides up. */
export function FullscreenModal({ open, onOpenChange, title, action, onAction, dismissible, container, children, className }: FullscreenModalProps) {
  return (
    <Overlay open={open} onOpenChange={onOpenChange} dismissible={dismissible} container={container} className="p-0">
      <div role="dialog" aria-modal="true" tabIndex={-1} aria-label={typeof title === "string" ? title : undefined} className={cn("absolute inset-0 z-[6] flex animate-mdl-up flex-col bg-bg motion-reduce:animate-none", className)}>
        <div className="flex h-[52px] items-center gap-2.5 border-b border-border bg-surface pl-1.5 pr-2.5">
          <Button variant="secondary" iconOnly aria-label="Close" className="size-9 border-none bg-transparent text-text hover:bg-surface-2" onClick={() => onOpenChange(false)}>
            <XIcon className="size-[18px]" />
          </Button>
          <h4 className="m-0 flex-1 text-[14px] font-semibold text-text">{title}</h4>
        </div>
        <div className="flex flex-1 flex-col gap-3.5 overflow-auto p-3.5">{children}</div>
        {action && (
          <div className="border-t border-border bg-surface px-3.5 pb-5 pt-3">
            <Button data-autofocus className="w-full" onClick={onAction}>
              {action}
            </Button>
          </div>
        )}
      </div>
    </Overlay>
  );
}
