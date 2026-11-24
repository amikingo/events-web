import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { AlertCircleIcon, CheckThinIcon } from "./icons";

/** `.field-label` on its own — for layouts that place the control themselves (a switch row, a checkbox list). Prefer `<Field label>`. */
export function Label({ className, required, children, ...props }: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("flex items-center gap-1 text-[12.5px] font-semibold text-text", className)} {...props}>
      {children}
      {required && <span className="text-accent">*</span>}
    </label>
  );
}

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  /** `htmlFor` of the label — pass the control's `id`. */
  htmlFor?: string;
  required?: boolean;
  /** `.field-hint` — neutral help text under the control. */
  hint?: ReactNode;
  /** `.field-error` — replaces the hint; pair it with the control's `error` state. */
  error?: ReactNode;
  /** `.field-ok` — confirmation under the control ("Looks good"); replaces the hint. */
  success?: ReactNode;
}

/** `.field` — label, control, then error / success / hint beneath it (only one is shown, in that order). */
export function Field({ label, htmlFor, required, hint, error, success, className, children, ...props }: FieldProps) {
  return (
    <div className={cn("relative flex w-full flex-col gap-1.5", className)} {...props}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p role="alert" className="flex items-center gap-[5px] text-[11.5px] text-danger-text">
          <AlertCircleIcon className="size-3 flex-none" />
          {error}
        </p>
      ) : success ? (
        <p className="flex items-center gap-[5px] text-[11.5px] text-success-text">
          <CheckThinIcon className="size-3 flex-none" />
          {success}
        </p>
      ) : hint ? (
        <p className="text-[11.5px] text-text-faint">{hint}</p>
      ) : null}
    </div>
  );
}
