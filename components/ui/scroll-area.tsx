import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  /** Which axis scrolls. Default `"y"` — give it a height (`max-h-*`) to have something to scroll. */
  direction?: "x" | "y" | "both";
}

const direction_classes = {
  x: "overflow-x-auto overflow-y-hidden",
  y: "overflow-y-auto overflow-x-hidden",
  both: "overflow-auto",
} as const;

/**
 * The guideline's scrollbar (#scrollbars) on any scrollable region: a 10px gutter, a 4px rounded
 * thumb in `border-strong` that grows to 6px and darkens on hover and turns accent while dragged,
 * a transparent track, no arrows or corner. Chrome / Edge / Safari get the full style; Firefox
 * gets `scrollbar-width: thin` with the same colors and no hover growth.
 *
 * `styles/tokens.css` applies the same style to every scrollbar on the page, so this is only
 * needed to keep it when you scope or reset global scrollbar styles — and it is what the
 * components (`<Table>`, `<MultiSelect>`) scroll with.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(({ className, direction = "y", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      direction_classes[direction],
      "[&::-webkit-scrollbar]:size-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-corner]:bg-transparent",
      "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-border-strong [&::-webkit-scrollbar-thumb]:bg-clip-padding",
      "[&::-webkit-scrollbar-thumb:hover]:border-2 [&::-webkit-scrollbar-thumb:hover]:bg-text-faint",
      "[&::-webkit-scrollbar-thumb:active]:border-2 [&::-webkit-scrollbar-thumb:active]:bg-accent",
      // Firefox only — in Chrome the standard properties would switch off the ::-webkit-scrollbar styling above.
      "supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-color:var(--color-border-strong)_transparent] supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-width:thin]",
      className,
    )}
    {...props}
  />
));
ScrollArea.displayName = "ScrollArea";
