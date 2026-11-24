import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import { XIcon } from "./icons";

/** `.cmdk-close` — the 26px quiet "×" used in toasts, the command palette and modal headers. */
export const CloseButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(({ className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    aria-label="Dismiss"
    className={cn("flex size-[26px] flex-none items-center justify-center rounded-btn text-text-faint hover:bg-surface-2 hover:text-text", className)}
    {...props}
  >
    <XIcon className="size-3.5" />
  </button>
));
CloseButton.displayName = "CloseButton";
