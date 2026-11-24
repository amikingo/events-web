"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/app/auth/session";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { CardIcon, ChevIcon, LogoutIcon, UserIcon } from "../ui/icons";
import { Skeleton } from "../ui/skeleton";
import { toast } from "../ui/toaster";
import { cn } from "../../lib/utils";

export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "G";
}

/** Header account control: Sign in when signed out, the signed-in person's menu otherwise (staff get a Dashboard link, attendees their tickets). `onDark` for the transparent header over the hero. */
export function AccountMenu({ onDark = false }: { onDark?: boolean }) {
  const session = useSession();
  const router = useRouter();

  if (session === undefined) return <Skeleton shape="button" width={80} className="h-8 rounded-full" />;

  if (!session) {
    return (
      // Compact: 32px tall and pill-shaped like the bar, so it sits lightly beside the other header items.
      <Button asChild variant="secondary" className="h-8 rounded-full px-4">
        <Link href="/auth">Sign in</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Account menu for ${session.name}`} className={cn("flex items-center gap-2 rounded-btn py-1 pl-1 pr-2 transition-colors", onDark ? "hover:bg-white/10" : "hover:bg-surface-2")}>
        <Avatar initials={session.initials} size={32} />
        <span className={cn("hidden max-w-[120px] truncate type-body-sm font-semibold md:inline", onDark ? "text-white" : "text-text")}>{session.name.split(" ")[0]}</span>
        <ChevIcon className={cn("hidden size-3.5 md:block", onDark ? "text-white/70" : "text-text-faint")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2.5 pb-2 pt-1.5">
          <p className="m-0 truncate type-body-sm font-semibold text-text">{session.name}</p>
          <p className="m-0 truncate type-body-sm text-text-faint">{session.kind === "attendee" ? session.email || `+251 ${session.account.phone}` : session.email}</p>
        </div>
        <DropdownMenuSeparator />
        {session.kind === "staff" ? (
          <DropdownMenuItem onClick={() => router.push("/admin/dashboard")}>
            <UserIcon className="size-4" /> Dashboard
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => router.push("/my-tickets")}>
              <CardIcon className="size-4" /> My tickets
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/account")}>
              <UserIcon className="size-4" /> Account
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onClick={() => {
            signOut();
            toast.info("Signed out");
            router.push("/");
          }}
        >
          <LogoutIcon className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
