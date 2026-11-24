import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Logo } from "./logo";

export interface SplashScreenProps extends HTMLAttributes<HTMLDivElement> {
  /** A single line at the bottom ("Getting your bookings ready…"). */
  footer?: ReactNode;
  /** Folder the brand files are served from (see `Logo`). */
  assetBase?: string;
}

/**
 * The consumer-app launch screen: the icon mark on the brand gradient with a soft pulse and one line at the bottom.
 * Admin products never splash — the shell appears immediately with the main area skeletoned.
 */
export function SplashScreen({ footer, assetBase, className, ...props }: SplashScreenProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("relative flex min-h-[300px] w-full flex-col items-center justify-center gap-[18px] overflow-hidden rounded-tile-lg bg-gradient-splash text-white", className)}
      {...props}
    >
      <span className="relative flex size-[72px] animate-splash-pulse items-center justify-center rounded-mark bg-white shadow-splash-mark motion-reduce:animate-none">
        <Logo variant="icon-outline" width={40} assetBase={assetBase} className="size-10 object-contain" alt="" />
        <span aria-hidden="true" className="absolute size-[72px] animate-splash-ring rounded-mark border-2 border-white/50 motion-reduce:animate-none" />
      </span>
      <Logo variant="wordmark" width={100} assetBase={assetBase} className="h-[18px] w-auto brightness-0 invert" alt="Cheche" />
      {footer && <div className="absolute bottom-4 flex items-center gap-1.5 text-[11px] opacity-80">{footer}</div>}
    </div>
  );
}
