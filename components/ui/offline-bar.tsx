import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { WifiOffIcon } from "./icons";

/** `.emp-off` — the amber bar over cached data while offline ("You're offline · showing data from 10 minutes ago"). Preferred over an empty state whenever something is cached. */
export function OfflineBar({ children, className, ...props }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--color-warning)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_10%,var(--color-surface))] px-4 py-2 text-[12px] text-warning-text",
        className,
      )}
      {...props}
    >
      <WifiOffIcon className="size-3.5 flex-none" />
      <span>{children}</span>
    </div>
  );
}
