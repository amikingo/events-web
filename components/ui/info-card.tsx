import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card, CardHeader } from "./card";
import type { CardProps } from "./card";
import { SummaryCard } from "./summary-card";
import type { SummaryRow } from "./summary-card";

export interface InfoCardProps extends Omit<CardProps, "title"> {
  title: ReactNode;
  /** The reference under the title ("#BK-20931"). */
  subtitle?: ReactNode;
  /** A status pill at the header's right. */
  status?: ReactNode;
  rows: SummaryRow[];
  total?: SummaryRow;
  /** Secondary then primary button, side by side at equal width. */
  actions?: ReactNode;
}

/** Info / summary card: header with status, key–value rows, dashed divider, one accent total, then two equal buttons. */
export function InfoCard({ title, subtitle, status, rows, total, actions, className, ...props }: InfoCardProps) {
  return (
    <Card className={className} {...props}>
      <CardHeader title={title} subtitle={subtitle} action={status} />
      <SummaryCard rows={rows} total={total} />
      {actions && <div className={cn("mt-4 flex gap-2.5 [&>button]:flex-1")}>{actions}</div>}
    </Card>
  );
}
