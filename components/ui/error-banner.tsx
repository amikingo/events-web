import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import { AlertCircleIcon } from "./icons";

/** `.mdl-err` — the failure notice that sits inside a modal body (wrong OTP code, a rejected payment). */
export function ErrorBanner({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn(
        "mb-3.5 flex gap-2.5 rounded-sm border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2.5 text-left text-[12.5px] text-danger-text",
        className,
      )}
      {...props}
    >
      <AlertCircleIcon className="mt-px size-[15px] flex-none" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
