import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type PayLogoMethod = "telebirr" | "cbe" | "wallet";
export type PayLogoSize = 18 | 24 | 32 | 40;

const methodClasses: Record<PayLogoMethod, string> = {
  telebirr: "bg-telebirr",
  cbe: "bg-cbe",
  wallet: "bg-gradient-to-br from-accent to-accent-deep",
};
const labels: Record<PayLogoMethod, string> = { telebirr: "TB", cbe: "CBE", wallet: "W" };
const sizeClasses: Record<PayLogoSize, string> = {
  18: "size-[18px] rounded-check text-[7px]",
  24: "size-6 rounded-btn text-[8px]",
  32: "size-8 rounded-sm text-[9.5px]",
  40: "size-10 rounded-tile text-[11px]",
};

export interface PayLogoProps extends HTMLAttributes<HTMLSpanElement> {
  method: PayLogoMethod;
  /** px — 40 default, 32 in toasts, 24 in option rows, 18 in chips and segmented items. */
  size?: PayLogoSize;
}

/** `.pay-logo` — the payment-method monogram tile (Telebirr green, CBE purple, Wallet accent gradient). */
export function PayLogo({ method, size = 40, className, ...props }: PayLogoProps) {
  return (
    <span
      className={cn("inline-flex flex-none items-center justify-center font-extrabold tracking-[0.3px] text-white", methodClasses[method], sizeClasses[size], className)}
      {...props}
    >
      {labels[method]}
    </span>
  );
}
