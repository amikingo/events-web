"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "@/app/auth/session";
import { Button } from "../ui/button";
import { Drawer } from "../ui/drawer";
import { MenuIcon } from "../ui/icons";
import { toast } from "../ui/toaster";
import { HeaderSearch } from "./search-bar";

export interface NavLink {
  href: string;
  label: string;
}

/** Phone navigation: a menu button that opens a drawer with search, the main links and the account links. */
export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const router = useRouter();
  const close = () => setOpen(false);

  const linkCls = "flex h-11 items-center rounded-btn px-2 type-body font-medium text-text hover:bg-surface-2";

  return (
    <>
      <Button variant="secondary" iconOnly aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <MenuIcon className="size-4" />
      </Button>
      <Drawer open={open} onOpenChange={setOpen} title="Menu">
        <HeaderSearch onNavigate={close} className="mb-4" />
        <nav aria-label="Main">
          <ul className="m-0 flex list-none flex-col p-0">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className={linkCls}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="my-3 border-t border-border" />
        <ul className="m-0 flex list-none flex-col p-0">
          <li>
            <Link href="/my-tickets" onClick={close} className={linkCls}>
              My tickets
            </Link>
          </li>
          {session ? (
            <>
              <li>
                <Link href={session.kind === "staff" ? "/admin/dashboard" : "/account"} onClick={close} className={linkCls}>
                  {session.kind === "staff" ? "Dashboard" : "Account"}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  className={`${linkCls} w-full text-left text-danger-text`}
                  onClick={() => {
                    signOut();
                    close();
                    toast.info("Signed out");
                    router.push("/");
                  }}
                >
                  Sign out
                </button>
              </li>
            </>
          ) : (
            <li className="mt-2">
              <Button asChild className="w-full">
                <Link href="/auth" onClick={close}>
                  Sign in
                </Link>
              </Button>
            </li>
          )}
        </ul>
      </Drawer>
    </>
  );
}
