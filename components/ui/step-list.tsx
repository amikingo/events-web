import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { CheckThinIcon, XIcon } from "./icons";
import { Spinner } from "./spinner";

export type StepStatus = "pending" | "active" | "done" | "failed";
export interface StepItem {
  label: ReactNode;
  status: StepStatus;
}

/** `.prog-steps` — the vertical checklist of a multi-stage wait (sent → approved → confirmed). */
export function StepList({ steps, className }: { steps: StepItem[]; className?: string }) {
  return (
    <ol className={cn("m-0 flex list-none flex-col gap-2.5 p-0", className)}>
      {steps.map((s, i) => (
        <li key={i} aria-current={s.status === "active" ? "step" : undefined} className={cn("flex items-center gap-2.5 text-[13px]", s.status === "pending" ? "text-text-faint" : "text-text", s.status === "active" && "font-semibold", s.status === "failed" && "text-danger-text")}>
          {s.status === "active" ? (
            <Spinner className="size-[22px] flex-none" />
          ) : (
          <span
            className={cn(
              "flex size-[22px] flex-none items-center justify-center rounded-full border-[1.5px] border-border-strong text-white",
              s.status === "done" && "border-success-fill bg-success-fill",
              s.status === "failed" && "border-danger-fill bg-danger-fill",
            )}
          >
            {s.status === "done" && <CheckThinIcon className="size-3" />}
            {s.status === "failed" && <XIcon className="size-3" />}
          </span>
          )}
          {s.label}
        </li>
      ))}
    </ol>
  );
}
