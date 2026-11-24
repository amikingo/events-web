"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AppShell, useAppShell } from "../../components/ui/app-shell";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import {
  BellIcon,
  BuildingIcon,
  CardIcon,
  CartIcon,
  DashboardIcon,
  DocIcon,
  DownloadIcon,
  ImageIcon,
  LogoutIcon,
  ScheduleIcon,
  SettingsIcon,
  ShieldIcon,
  StarIcon,
  UploadIcon,
  UserIcon,
} from "../../components/ui/icons";
import { Sidebar, SidebarGroup, SidebarItem } from "../../components/ui/sidebar";
import { Topbar } from "../../components/ui/topbar";
import { toast } from "../../components/ui/toaster";
import { DOMAIN_PROFILES, ORGANIZATIONS, getBreadcrumbTrail } from "../../lib/config/brandos-config";
import { getNavSections, getSearchCommands } from "../../lib/config/navigation";
import { authService } from "@/app/auth/staff/auth-service";
import { notificationsService } from "../../lib/services/notifications-service";
import type { BusinessDomain, User } from "../../types";

const iconMap: Record<string, ReactNode> = {
  dashboard: <DashboardIcon />,
  payments: <CardIcon />,
  bookings: <ScheduleIcon />,
  users: <UserIcon />,
  operations: <DocIcon />,
  analytics: <DocIcon />,
  inbox: <DownloadIcon />,
  catalog: <ImageIcon />,
  orders: <CartIcon />,
  payouts: <UploadIcon />,
  organizations: <BuildingIcon />,
  teams: <ShieldIcon />,
  notifications: <BellIcon />,
  settings: <SettingsIcon />,
  showcase: <StarIcon />,
};

/**
 * The menu, from `lib/config/brandos-config.ts`. An item with two or more sub-pages is a `SidebarGroup`: its sub-pages
 * fly out beside it on hover or focus (the guideline's pattern); a single sub-page stays a plain item.
 */
function SidebarNav({ activeDomainId }: { activeDomainId: BusinessDomain }) {
  const { collapsed } = useAppShell();
  const pathname = usePathname();
  const router = useRouter();
  const sections = getNavSections(activeDomainId);
  const isCurrent = (href: string) => pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));

  return (
    <>
      {sections.map((section, idx) => (
        <div key={section.name} className="flex flex-col gap-[3px]">
          {!collapsed ? (
            <div className="px-3 pb-1 pt-2 type-label text-text-faint select-none">{section.name === "Core" ? "Workspaces" : "Platform"}</div>
          ) : (
            idx > 0 && <div className="mx-auto my-1.5 w-6 border-t border-border" />
          )}
          {section.items.map((item) =>
            item.children && item.children.length >= 2 ? (
              <SidebarGroup key={item.id} icon={iconMap[item.iconName]} label={item.label} active={item.children.some((c) => isCurrent(c.href))}>
                {item.children.map((c) => (
                  <SidebarItem key={c.id} icon={c.iconName ? iconMap[c.iconName] : undefined} active={isCurrent(c.href)} onClick={() => router.push(c.href)}>
                    {c.label}
                  </SidebarItem>
                ))}
              </SidebarGroup>
            ) : (
              <SidebarItem key={item.href} icon={iconMap[item.iconName]} active={isCurrent(item.href)} count={item.badgeCount} onClick={() => router.push(item.href)}>
                {item.label}
              </SidebarItem>
            ),
          )}
        </div>
      ))}
    </>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [activeOrg, setActiveOrg] = useState("ORG-101");
  const [activeDomainId, setActiveDomainId] = useState<BusinessDomain>("enterprise");
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const u = authService.getCurrentUser();
    if (!u) {
      router.replace("/auth");
      return;
    }
    setUser(u);
    setUnreadNotifications(notificationsService.getUnreadCount());
    try {
      const savedDomain = localStorage.getItem("brandos_active_domain") as BusinessDomain | null;
      if (savedDomain && DOMAIN_PROFILES[savedDomain]) setActiveDomainId(savedDomain);
    } catch {
      // storage unavailable: keep the default profile
    }
  }, [router]);

  const breadcrumbItems = getBreadcrumbTrail(pathname);

  return (
    // `h-dvh`: the shell fills the window; the sidebar and the page scroll inside it.
    <AppShell
      className="h-dvh"
      sidebar={
        <Sidebar>
          <SidebarNav activeDomainId={activeDomainId} />
        </Sidebar>
      }
      topbar={
        <Topbar
          organization={{
            organizations: ORGANIZATIONS.map((o) => ({ value: o.value, label: o.shortLabel })),
            value: activeOrg,
            onValueChange: (val) => {
              setActiveOrg(val);
              toast.info(`Switched to ${ORGANIZATIONS.find((o) => o.value === val)?.label ?? "the organization"}`);
            },
          }}
          search={{
            items: getSearchCommands().map((c) => ({ id: c.id, title: c.title, group: c.group })),
            onSelect: (item) => router.push(item.id),
            placeholder: "Search pages, actions, payments…",
          }}
          notifications={{ unread: unreadNotifications > 0, onClick: () => router.push("/admin/notifications") }}
          user={{
            initials: user?.initials ?? "U",
            label: user?.name,
            items: [
              { label: "Settings", icon: <SettingsIcon />, onClick: () => router.push("/admin/settings") },
              { label: "Component library", icon: <StarIcon />, onClick: () => router.push("/admin/components") },
              {
                label: "Sign out",
                icon: <LogoutIcon />,
                danger: true,
                separatorBefore: true,
                onClick: async () => {
                  await authService.logout();
                  toast.info("Signed out");
                  router.replace("/auth");
                },
              },
            ],
          }}
        />
      }
    >
      <div className="min-w-0 max-w-full">
        <Breadcrumb className="mb-3.5" items={breadcrumbItems} />
        {children}
      </div>
    </AppShell>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
