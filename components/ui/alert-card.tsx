"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card } from "./card";
import type { CardProps } from "./card";
import { AlertCircleIcon, CheckThinIcon, InfoIcon, WarnIcon, XIcon } from "./icons";
import { IconTile } from "./icon-tile";

export type AlertCardTone = "info" | "success" | "warning" | "danger";

const toneConfig = {
  info: { stripe: "border-l-accent", tile: "accent", Icon: InfoIcon },
  success: { stripe: "border-l-success", tile: "success", Icon: CheckThinIcon },
  warning: { stripe: "border-l-warning", tile: "warning", Icon: WarnIcon },
  danger: { stripe: "border-l-danger", tile: "danger", Icon: AlertCircleIcon },
} as const;

export interface AlertCardProps extends Omit<CardProps, "title"> {
  tone?: AlertCardTone;
  title: ReactNode;
  /** Timestamp at the title's right ("Just now"). */
  time?: ReactNode;
  body?: ReactNode;
  /** One or two `CardLink`s under the body. */
  actions?: ReactNode;
  /** Shows the × and slides the card away when pressed. */
  onDismiss?: () => void;
}

/** Inline alert: a 3px left stripe carries the meaning, the icon tile matches it. Dismiss slides it 12px right while it fades. */
export function AlertCard({ tone = "info", title, time, body, actions, onDismiss, className, ...props }: AlertCardProps) {
  const [leaving, setLeaving] = useState(false);
  const { stripe, tile, Icon } = toneConfig[tone];
  return (
    <Card
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("flex items-start gap-3 border-l-[3px] py-3.5 pl-[18px] pr-3.5", stripe, leaving && "translate-x-3 opacity-0", className)}
      {...props}
    >
      <IconTile size="sm" tone={tile}>
        <Icon />
      </IconTile>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-text">
          {title}
          {time && <span className="ml-auto text-[11px] font-normal text-text-faint">{time}</span>}
        </div>
        {body && <div className="mt-0.5 text-[12.5px] leading-[1.5] text-text-soft">{body}</div>}
        {actions && <div className="mt-2 flex gap-3">{actions}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            setLeaving(true);
            setTimeout(onDismiss, 150);
          }}
          className="-mr-1 -mt-1 flex size-7 flex-none items-center justify-center rounded-btn text-text-faint hover:bg-surface-2 hover:text-text"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </Card>
  );
}
