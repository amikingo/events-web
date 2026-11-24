"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { InputGroup } from "./input";
import type { InputGroupProps } from "./input";
import { EyeIcon, EyeOffIcon } from "./icons";
import { ProgressBar } from "./progress-bar";
import type { ProgressTone } from "./progress-bar";
import { Pill } from "./pill";

const REQUIREMENTS = [
  { key: "len", label: "8+ characters", test: (v: string) => v.length >= 8 },
  { key: "mix", label: "Upper & lower", test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { key: "num", label: "A number", test: (v: string) => /\d/.test(v) },
  { key: "sym", label: "A symbol", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

const STRENGTH: { label: string; tone: ProgressTone }[] = [
  { label: "", tone: "neutral" },
  { label: "Weak", tone: "danger" },
  { label: "Fair", tone: "warning" },
  { label: "Good", tone: "success" },
  { label: "Strong", tone: "success" },
];

export interface PasswordInputProps extends Omit<InputGroupProps, "type" | "leading" | "suffix" | "trailing" | "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Sign-up: show the strength meter (on the `.stock-bar` track) and the requirement pills that turn green as they're met. */
  strengthMeter?: boolean;
  /** Extra trailing node shown before the eye (e.g. a status icon for a mismatched confirm field). */
  trailingExtra?: ReactNode;
}

/** `.input-group` with a show/hide eye in the trailing slot; optionally the sign-up strength meter + requirement pills. */
export function PasswordInput({ value, onValueChange, strengthMeter = false, trailingExtra, ...props }: PasswordInputProps) {
  const [shown, setShown] = useState(false);
  const met = REQUIREMENTS.filter((r) => r.test(value));
  const score = met.length;
  const strength = STRENGTH[score] ?? STRENGTH[0]!;

  return (
    <div className="flex flex-col gap-1.5">
      <InputGroup
        {...props}
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        trailing={
          <>
            {trailingExtra}
            <button
              type="button"
              aria-label={shown ? "Hide password" : "Show password"}
              aria-pressed={shown}
              onClick={() => setShown(!shown)}
              className="flex w-[34px] flex-none items-center justify-center text-text-faint hover:text-text"
            >
              {shown ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </>
        }
      />
      {strengthMeter && (
        <div className="flex flex-col gap-1.5">
          <ProgressBar height={4} value={value ? Math.max(8, score * 25) : 0} tone={strength.tone} aria-label="Password strength" />
          <div className="flex justify-between text-[11.5px] text-text-faint">
            <span>Strength</span>
            <b className={cn("font-semibold", strength.tone === "danger" && "text-danger-text", strength.tone === "warning" && "text-warning-text", strength.tone === "success" && "text-success-text")}>
              {value ? strength.label : ""}
            </b>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REQUIREMENTS.map((r) => (
              <Pill key={r.key} size="sm" tone={r.test(value) ? "success" : "neutral"}>
                {r.label}
              </Pill>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
