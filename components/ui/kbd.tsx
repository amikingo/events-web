import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

/** `.kbd` — a keyboard hint ("⌘K", "/", "Esc"): mono 11px on a surface chip. */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <kbd className={cn("flex-none rounded-check border border-border bg-surface px-[5px] py-0.5 font-mono text-[11px] leading-[normal] text-text-faint", className)} {...props} />;
}
