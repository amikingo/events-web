"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Overlay } from "./modal";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  container?: "viewport" | "parent";
  children: ReactNode;
  className?: string;
}

/** `.sheet` — the mobile pick list: slides up from the bottom, drag handle, title, options, one full-width action. */
export function BottomSheet({ open, onOpenChange, title, subtitle, container, children, className }: BottomSheetProps) {
  return (
    <Overlay open={open} onOpenChange={onOpenChange} placement="bottom" container={container}>
      <div
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={typeof title === "string" ? title : undefined}
        className={cn(
          "relative z-[1] max-h-[90%] w-full animate-mdl-up overflow-y-auto rounded-t-lg border-t border-border bg-surface px-4 pb-[18px] pt-2.5 shadow-sheet motion-reduce:animate-none",
          className,
        )}
      >
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-9 rounded-full bg-border-strong" />
        {title && <h4 className="m-0 mb-0.5 text-[14.5px] font-semibold text-text">{title}</h4>}
        {subtitle && <p className="m-0 mb-3 text-[12px] text-text-faint">{subtitle}</p>}
        {children}
      </div>
    </Overlay>
  );
}

/** The sheet's option list (`gap 8`). */
export function BottomSheetList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="radiogroup" className={cn("flex flex-col gap-2 [&_button]:px-3 [&_button]:py-2.5", className)} {...props} />;
}
