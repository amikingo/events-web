import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface TextLinkProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `soft` — the secondary action next to a primary one ("Decline" beside "Accept"): `text-soft` instead of accent. */
  soft?: boolean;
}

/** `.card-link` — the small accent text action ("Clear all", "+ Save current as view", "Clear"). 12px / 600, underline on hover. */
export const TextLink = forwardRef<HTMLButtonElement, TextLinkProps>(({ className, type = "button", soft = false, ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn("whitespace-nowrap text-[12px] font-semibold leading-[normal] hover:underline", soft ? "text-text-soft" : "text-accent", className)}
    {...props}
  />
));
TextLink.displayName = "TextLink";
