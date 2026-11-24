"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CloseButton } from "./close-button";
import { Overlay } from "./modal";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Pinned bottom bar for the actions. */
  footer?: ReactNode;
  container?: "viewport" | "parent";
  children: ReactNode;
  className?: string;
}

/** Right-hand panel for secondary tasks (filters, quick actions): min(380px, 92%) wide, header and footer fixed, body scrolls. */
export function Drawer({ open, onOpenChange, title, subtitle, footer, container, children, className }: DrawerProps) {
  return (
    <Overlay open={open} onOpenChange={onOpenChange} placement="right" container={container}>
      <aside
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={typeof title === "string" ? title : undefined}
        className={cn("relative z-[1] flex h-full w-[min(380px,92%)] animate-mdl-right flex-col border-l border-border bg-surface shadow-drawer motion-reduce:animate-none", className)}
      >
        <div className="flex items-start gap-3 border-b border-border px-[18px] pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <h4 className="m-0 text-[15px] font-semibold leading-[1.3] text-text">{title}</h4>
            {subtitle && <p className="m-0 mt-0.5 text-[12px] text-text-faint">{subtitle}</p>}
          </div>
          <CloseButton aria-label="Close" onClick={() => onOpenChange(false)} />
        </div>
        <DrawerBody>{children}</DrawerBody>
        {footer && <div className="flex justify-end gap-2.5 border-t border-border px-[18px] py-3">{footer}</div>}
      </aside>
    </Overlay>
  );
}

function DrawerBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto px-[18px] py-4 text-[13.5px] leading-[1.55] text-text-soft", className)} {...props} />;
}
