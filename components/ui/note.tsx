import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface NoteProps extends HTMLAttributes<HTMLDivElement> {
  /** A 16px icon before the text. */
  icon?: ReactNode;
}

/** `.note` — a quiet aside: surface-2 box, 1px border, 12.5px soft text (the "Don't close this screen" line). */
export function Note({ icon, className, children, ...props }: NoteProps) {
  return (
    <div className={cn("mt-3.5 flex max-w-[64ch] items-start gap-2 rounded-sm border border-border bg-surface-2 px-3 py-2.5 text-[12.5px] text-text-soft [&_svg]:size-4 [&_svg]:flex-none", className)} {...props}>
      {icon}
      <span>{children}</span>
    </div>
  );
}
