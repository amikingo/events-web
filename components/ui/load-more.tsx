import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Spinner } from "./spinner";

export interface LoadMoreProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /** Draw the top rule (default). Turn off inside a card that already has one. */
  bordered?: boolean;
}

/** `.ld-more` — the "Loading more…" row under a list or table: a small spinner and one line, never a full-screen spinner over content that is already there. */
export const LoadMore = forwardRef<HTMLDivElement, LoadMoreProps>(({ children = "Loading more…", bordered = true, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-center gap-2 p-3 text-[12.5px] text-text-faint", bordered && "border-t border-border", className)} {...props}>
      <Spinner className="size-3.5" />
      {children}
    </div>
  ));
LoadMore.displayName = "LoadMore";
