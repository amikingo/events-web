import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Avatar } from "./avatar";
import { Card, CardFooter } from "./card";
import type { CardProps } from "./card";
import { Skeleton } from "./skeleton";

export interface ProfileCardRow {
  /** A 14px line icon. */
  icon: ReactNode;
  text: ReactNode;
}

export interface ProfileCardProps extends Omit<CardProps, "title" | "role"> {
  /** Initials for a person; or pass `avatar` for a custom tile (an organization's icon). */
  initials?: string;
  avatar?: ReactNode;
  name: ReactNode;
  /** The role or kind, followed by an optional pill. */
  role?: ReactNode;
  pill?: ReactNode;
  rows?: ProfileCardRow[];
  /** Two buttons, equal width. */
  actions?: ReactNode;
  loading?: boolean;
}

/** Users, drivers, merchants, organizations: 48px avatar, name and role pill, contact rows, two equal footer buttons. */
export function ProfileCard({ initials, avatar, name, role, pill, rows, actions, loading, className, ...props }: ProfileCardProps) {
  if (loading) {
    return (
      <Card aria-busy="true" className={className}>
        <div className="flex items-center gap-3">
          <Skeleton shape="avatar-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton width="55%" />
            <Skeleton width="35%" />
          </div>
        </div>
        <div className="mt-3.5 space-y-2">
          <Skeleton width="70%" />
          <Skeleton width="50%" />
        </div>
      </Card>
    );
  }
  return (
    <Card className={className} {...props}>
      <div className="flex items-center gap-3">
        {avatar ?? <Avatar initials={initials ?? ""} size={48} className="text-[16px]" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold text-text">{name}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-text-faint">
            {role}
            {pill}
          </div>
        </div>
      </div>
      {rows && (
        <div className="mt-3.5 flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-[9px] text-[12.5px] text-text-soft [&_b]:font-medium [&_b]:text-text [&_svg]:size-3.5 [&_svg]:flex-none [&_svg]:text-text-faint">
              {r.icon}
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      )}
      {actions && <CardFooter className={cn("gap-2 [&>button]:flex-1")}>{actions}</CardFooter>}
    </Card>
  );
}
