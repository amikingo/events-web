"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { BellIcon, BuildingIcon, CheckIcon, ChevUpDownIcon, MenuIcon, SearchIcon } from "./icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { IconButton } from "./icon-button";
import { Kbd } from "./kbd";
import { useOptionalAppShell } from "./app-shell";
import { CommandPalette } from "./command-palette";
import { ThemeSwitch } from "./theme-switch";
import type { CommandItem } from "./command-palette";

export interface TopbarProps {
  className?: string;
  "aria-busy"?: boolean | "true" | "false";
  /** The tenant switcher, after the menu toggle. Omit for single-organization apps. */
  organization?: OrgSelectProps;
  /**
   * The search box with the ⌘K hint — **on by default** — opens the built-in command palette. Give it `items` (your sections and actions, e.g. the
   * sidebar's links) and `onSelect` (navigate). `false` leaves search out.
   */
  search?: { items?: CommandItem[]; onSelect?: (item: CommandItem) => void; placeholder?: string } | false;
  /** Opens your own search instead of the built-in palette (the box is still drawn for you). */
  onSearch?: () => void;
  /** The bell. Shown by default; `{ unread: true }` adds the red dot, `false` removes it. */
  notifications?: { unread?: boolean; onClick?: () => void } | false;
  /** The avatar and its menu (Profile, Settings, a rule, Log out) — **on by default**. Without `items` the avatar is shown on its own; `initials` defaults to "U". */
  user?: { initials?: string; items?: UserMenuItem[]; label?: string };
  /** Light / Dark / System switch at the top of the avatar menu — **on by default**. `false` removes it. */
  themeSwitch?: boolean;
  /** Replaces the user menu — a skeleton avatar while loading, or a "Sign in" button. */
  trailing?: ReactNode;
  /** Anything extra after the organization switcher (a breadcrumb, a title). */
  children?: ReactNode;
}

/**
 * `.app-topbar` — the 64px bar over the page. It is complete on its own: the menu toggle (phones), the organization switcher,
 * the search box (with its built-in ⌘K palette), the notification bell and the avatar are all on by default; you only pass their data
 * (`search.items`, `notifications`, `user`, `organization`).
 */
export function Topbar({ className, organization, search = {}, onSearch, notifications = {}, user = {}, themeSwitch = true, trailing, children, ...props }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <div {...props} className={cn("relative flex h-16 items-center gap-2.5 border-b border-border bg-surface px-5 max-[760px]:gap-2 max-[760px]:px-3", className)}>
      <MenuToggle />
      {organization && <OrgSelect {...organization} />}
      {children}
      <TopbarSpacer />
      {search !== false && <SearchTrigger onClick={onSearch ?? (() => setSearchOpen(true))} placeholder={search.placeholder} />}
      {search !== false && !onSearch && <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} items={search.items ?? []} onSelect={(it) => { setSearchOpen(false); search.onSelect?.(it); }} placeholder={search.placeholder} />}
      {notifications && <NotificationButton unread={notifications.unread} onClick={notifications.onClick} />}
      {trailing ?? (themeSwitch || (user.items && user.items.length > 0) ? <UserMenu initials={user.initials ?? "U"} items={user.items ?? []} label={user.label} themeSwitch={themeSwitch} /> : <Avatar initials={user.initials ?? "U"} />)}
    </div>
  );
}

/** `.tb-spacer` — pushes everything after it to the right. */
export function TopbarSpacer() {
  return <div className="flex-1" />;
}

/** The hamburger that opens the sidebar drawer. Only visible below 760px; nothing at all when the top bar sits outside an `<AppShell>` (there is no drawer to open). */
export function MenuToggle() {
  const shell = useOptionalAppShell();
  if (!shell) return null;
  const { mobileOpen, setMobileOpen } = shell;
  return (
    <Button variant="secondary" iconOnly aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)} className="hidden max-[760px]:flex">
      <MenuIcon className="size-4" />
    </Button>
  );
}

export interface OrgSelectProps {
  organizations: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  icon?: ReactNode;
}

/** `.org-select` — the tenant switcher: icon, 14/600 name, an up-down chevron. The panel is the select panel (min 220px) with a check on the active one. */
export function OrgSelect({ organizations, value, onValueChange, icon }: OrgSelectProps) {
  const [open, setOpen] = useState(false);
  const current = organizations.find((o) => o.value === value);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} className="relative flex-none">
      <DropdownMenuTrigger
        aria-label="Switch organization"
        className={cn(
          "h-9 justify-start gap-2.5 rounded-btn border bg-surface px-3 transition-[border-color,box-shadow] hover:border-text-faint",
          open ? "border-accent shadow-focus" : "border-input-border",
        )}
      >
        <span className="flex size-4 flex-none items-center justify-center text-text-faint [&_svg]:size-4">{icon ?? <BuildingIcon />}</span>
        <span className="text-[14px] font-semibold text-text max-[760px]:max-w-[84px] max-[760px]:overflow-hidden max-[760px]:text-ellipsis max-[760px]:whitespace-nowrap">{current?.label ?? "Select"}</span>
        <ChevUpDownIcon className={cn("ml-2 size-4 flex-none text-text-faint transition-transform", open && "rotate-180")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[220px]">
        {organizations.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => onValueChange(o.value)}
            className={cn("justify-between", o.value === value && "bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))] font-semibold text-accent-text")}
          >
            {o.label}
            {o.value === value && <CheckIcon className="!size-3.5 !text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface SearchTriggerProps {
  onClick: () => void;
  placeholder?: string;
  /** The keyboard hint. Default ⌘K. */
  shortcut?: string;
}

/** `.search-trigger` — the 260px "Search sections, actions…" button that opens the command palette. Hidden below 480px. */
export function SearchTrigger({ onClick, placeholder = "Search sections, actions…", shortcut = "⌘K" }: SearchTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden min-h-9 w-[260px] items-center justify-between gap-2.5 rounded-sm border border-border bg-surface-2 py-0 pl-3 pr-2.5 text-text-faint transition-colors hover:bg-border focus-visible:border-accent focus-visible:shadow-focus focus-visible:outline-none min-[480px]:flex"
    >
      <span className="flex min-w-0 items-center gap-2">
        <SearchIcon className="size-[15px] flex-none" />
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px]">{placeholder}</span>
      </span>
      <Kbd>{shortcut}</Kbd>
    </button>
  );
}

/** The bell with the red unread dot. */
export function NotificationButton({ unread = false, onClick }: { unread?: boolean; onClick?: () => void }) {
  return <IconButton aria-label="Notifications" icon={<BellIcon />} statusDot={unread} onClick={onClick} />;
}

export interface UserMenuItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  /** Log out and the like: red text and icon. */
  danger?: boolean;
  /** A rule above this item. */
  separatorBefore?: boolean;
}

/** `.app-user` — the avatar that opens a 180px menu (Profile, Settings, a rule, Log out). */
export function UserMenu({ initials, items, label = "Account menu", themeSwitch = true }: { initials: string; items: UserMenuItem[]; label?: string; themeSwitch?: boolean }) {
  return (
    <DropdownMenu className="relative flex-none">
      <DropdownMenuTrigger aria-label={label} className="rounded-full">
        <Avatar initials={initials} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={themeSwitch ? "w-[220px]" : undefined}>
        {themeSwitch && (
          <>
            <div className="p-2">
              <ThemeSwitch />
            </div>
            {items.length > 0 && <DropdownMenuSeparator />}
          </>
        )}
        {items.map((it, i) => (
          <span key={i}>
            {it.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem destructive={it.danger} onClick={it.onClick}>
              {it.icon}
              {it.label}
            </DropdownMenuItem>
          </span>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
