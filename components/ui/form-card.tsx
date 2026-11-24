import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface FormCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
}

/** `.form-demo-card` — the form surface: 16px radius, 22px padding, 16px between fields, 360px wide by default (override with `className`). */
export function FormCard({ title, className, children, ...props }: FormCardProps) {
  return (
    <div className={cn("flex max-w-[360px] flex-col gap-4 rounded-lg border border-border bg-surface p-[22px] shadow", className)} {...props}>
      {title && <h4 className="m-0 text-[15px] font-bold">{title}</h4>}
      {children}
    </div>
  );
}
