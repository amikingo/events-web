import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

/** `.textarea-input` — 88px min height, 10px/12px padding, 1.5 line-height, vertical resize; same border, focus and error states as `<Input>`. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error = false, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={error || undefined}
    className={cn(
      "min-h-[88px] w-full resize-y rounded-btn border bg-surface px-3 py-2.5 type-body leading-normal text-text placeholder:text-text-faint",
      "focus:outline-none",
      "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-faint",
      error ? "border-danger focus:shadow-focus-danger" : "border-input-border focus:border-accent focus:shadow-focus",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
