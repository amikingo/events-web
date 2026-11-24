import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { AlertIcon, CheckThinIcon, ClockIcon, XCircleIcon } from "../../ui/icons";
import { IconTile } from "../../ui/icon-tile";

export type PaymentStatusKind = "success" | "pending" | "failed" | "expired";

const CONFIG: Record<PaymentStatusKind, { tone: "success" | "warning" | "danger" | "charcoal"; icon: ReactNode }> = {
  success: { tone: "success", icon: <CheckThinIcon /> },
  pending: { tone: "warning", icon: <ClockIcon /> },
  failed: { tone: "danger", icon: <XCircleIcon /> },
  expired: { tone: "charcoal", icon: <AlertIcon /> },
};

/** The outcome of a payment or reservation, with the next step right under it. */
export function PaymentStatus({ kind, title, description, actions, className }: { kind: PaymentStatusKind; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  const c = CONFIG[kind];
  return (
    <div className={cn("flex items-start gap-4 rounded-md border border-border bg-surface p-4 sm:p-5", className)} role={kind === "failed" || kind === "expired" ? "alert" : "status"}>
      <IconTile tone={c.tone}>{c.icon}</IconTile>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className="m-0 type-h3 text-text">{title}</p>
        {description && <p className="m-0 type-body-sm text-text-soft">{description}</p>}
        {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
