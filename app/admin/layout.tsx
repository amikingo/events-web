"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { AbilityProvider, useAccess, useModuleAccess } from "@/components/ability-provider";
import { DashboardRouteGuard } from "@/components/dashboard-route-guard";
import { QueryProvider } from "@/components/query-provider";
import {
  BarChart3,
  Bell,
  Blocks,
  Building2,
  CalendarClock,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Upload,
  UserRound,
  UserRoundCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell, useAppShell } from "@/components/ui/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Sidebar, SidebarItem } from "@/components/ui/sidebar";
import { SidebarAccordion } from "@/components/ui/sidebar-accordion";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { Topbar } from "@/components/ui/topbar";
import { toast } from "@/components/ui/toaster";
import { describeApiError } from "@/lib/api/errors";
import { AuthProvider, describeAssignment, useAuth } from "@/lib/auth-context";
import { DOMAIN_PROFILES, getBreadcrumbTrail } from "@/lib/config/brandos-config";
import { DEMO_PAGES_ENABLED } from "@/lib/config/demo-pages";
import { getNavSections, getSearchCommands } from "@/lib/config/navigation";
import { MODULE_CODES } from "@/lib/constants/modules";
import { OrganizationProvider, useOrganization } from "@/lib/organization-context";
import { flattenModuleTree } from "@/lib/rbac/build-module-tree";
import { moduleSidebarEntries } from "@/lib/rbac/module-sidebar";
import { notificationsService } from "@/lib/services/notifications-service";
import type { BusinessDomain } from "@/types";


/** Lucide icons for the template's demo pages (by `iconName` in `brandos-config.ts`), matching the module icons. */
const demoIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  payments: CreditCard,
  bookings: CalendarClock,
  users: Users,
  operations: FileText,
  analytics: BarChart3,
  inbox: Inbox,
  catalog: ImageIcon,
  orders: ShoppingCart,
  payouts: Upload,
  organizations: Building2,
  teams: ShieldCheck,
  notifications: Bell,
  settings: Settings,
  showcase: Star,
  playground: Blocks,
};

/** Ctrl/⌘+B collapses the sidebar; the phone drawer closes when the page changes. (As in bookings_web.) */
function SidebarBehaviour({ pathname }: { pathname: string }) {
  const { collapsed, setCollapsed, setMobileOpen } = useAppShell();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed(!collapsed);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed, setCollapsed]);

  return null;
}

/**
 * The menu, built like bookings_web's: the backend's navigation for the role in use (`/me`), in its order, limited to
 * screens this app has. An entry with one page is a plain link; an entry with more is an accordion whose pages
 * expand in place. In development the template's demo pages follow as one more accordion; production leaves it out.
 */
function SidebarNav({ activeDomainId }: { activeDomainId: BusinessDomain }) {
  const pathname = usePathname();
  const router = useRouter();
  const { assignment } = useAuth();
  const { sidebarTree, ready } = useAccess();
  const { can } = useModuleAccess();
  const isPlatform = assignment !== null && assignment.organizationId === null;
  const canPlatformRoles = isPlatform && can("read", MODULE_CODES.ROLES);
  const canPlatformStaff = isPlatform && can("read", MODULE_CODES.USER_ROLES);
  const entries = moduleSidebarEntries(sidebarTree);
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // The demo pages, flat: a demo group's sub-pages (Payments → Orders, Payouts) become their own entries.
  const demo: { href: string; label: string; iconName?: string }[] = DEMO_PAGES_ENABLED
    ? getNavSections(activeDomainId).flatMap((section) =>
        section.items.flatMap((item) =>
          item.children && item.children.length >= 2
            ? item.children.map((c) => ({ href: c.href, label: c.label, iconName: c.iconName ?? item.iconName }))
            : [{ href: item.href, label: item.label, iconName: item.iconName }],
        ),
      )
    : [];

  return (
    <Sidebar variant="brand" aria-label="Dashboard navigation">
      <SidebarBehaviour pathname={pathname} />
      {!ready ? (
        <SkeletonStack className="px-1 py-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} shape="button" width="100%" />
          ))}
        </SkeletonStack>
      ) : (
        entries.map((entry) => {
          // A single page stays a plain link, named after the menu entry.
          const Icon = entry.icon;
          if (entry.pages.length === 1) {
            const page = entry.pages[0]!;
            return (
              <SidebarItem key={entry.code} icon={<Icon />} href={page.href} active={isCurrent(page.href)} onClick={() => router.push(page.href)}>
                {entry.label}
              </SidebarItem>
            );
          }
          return (
            <SidebarAccordion
              key={entry.code}
              icon={<Icon />}
              label={entry.label}
              items={entry.pages.map((page) => ({
                id: page.code,
                label: page.label,
                icon: <page.icon />,
                active: isCurrent(page.href),
                onSelect: () => router.push(page.href),
              }))}
            />
          );
        })
      )}
      {ready && (canPlatformRoles || canPlatformStaff) && (
        <SidebarAccordion
          key="PLATFORM"
          icon={<ShieldCheck />}
          label="Platform"
          items={[
            ...(canPlatformRoles
              ? [{ id: "PLATFORM_ROLES", label: "Platform roles", icon: <KeyRound />, active: isCurrent("/admin/platform/roles"), onSelect: () => router.push("/admin/platform/roles") }]
              : []),
            ...(canPlatformStaff
              ? [{ id: "PLATFORM_STAFF", label: "Platform staff", icon: <Users />, active: isCurrent("/admin/platform/staff"), onSelect: () => router.push("/admin/platform/staff") }]
              : []),
          ]}
        />
      )}
      {demo.length > 0 && (
        <SidebarAccordion
          icon={<Sparkles />}
          label="Demo pages"
          items={demo.map((d) => {
            const DemoIcon = (d.iconName && demoIcons[d.iconName]) || LayoutDashboard;
            return {
              id: d.href,
              label: d.label,
              icon: <DemoIcon />,
              active: isCurrent(d.href),
              onSelect: () => router.push(d.href),
            };
          })}
        />
      )}
    </Sidebar>
  );
}

/** The demo screens' domain profile (labels only), saved by the demo settings page. */
function readSavedDomain(): BusinessDomain {
  if (!DEMO_PAGES_ENABLED) return "enterprise";
  try {
    const saved = localStorage.getItem("brandos_active_domain") as BusinessDomain | null;
    return saved && DOMAIN_PROFILES[saved] ? saved : "enterprise";
  } catch {
    return "enterprise";
  }
}
const subscribeNothing = () => () => {};

/** The picker's value for "no organization". */
const NO_ORGANIZATION = "__none__";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, assignment, assignments, switchRole, logout } = useAuth();
  const organization = useOrganization();
  const { sidebarTree } = useAccess();
  const { can } = useModuleAccess();
  const activeDomainId = useSyncExternalStore(subscribeNothing, readSavedDomain, () => "enterprise" as BusinessDomain);
  const [unreadNotifications] = useState(() => (DEMO_PAGES_ENABLED ? notificationsService.getUnreadCount() : 0));

  const name = [user?.firstname, user?.lastname].filter(Boolean).join(" ") || user?.mobile || "Team member";

  async function changeRole(assignmentId: string) {
    if (assignmentId === assignment?.id) return;
    try {
      await switchRole(assignmentId);
      const next = assignments.find((a) => a.id === assignmentId);
      toast.success(`Now working as ${next ? describeAssignment(next) : "the new role"}`);
      // Everything on screen belonged to the old role: start from the new role's first page.
      router.push("/admin");
    } catch (e) {
      toast.error("Couldn't switch role", { body: describeApiError(e) });
    }
  }

  return (
    // `h-dvh`: the shell fills the window; the sidebar and the page scroll inside it.
    <AppShell
      className="h-dvh"
      sidebar={<SidebarNav activeDomainId={activeDomainId} />}
      topbar={
        <Topbar
          // One switcher at the top. A platform role picks the organization it works in (the API lets platform
          // Super Admin act in any organization). Otherwise it switches between the person's roles, when they hold
          // more than one; permissions follow the role in use.
          organization={
            organization.isPlatform && organization.choices.length > 0
              ? {
                  // "No organization" clears the choice: organization pages then ask for one.
                  organizations: [{ value: NO_ORGANIZATION, label: "No organization" }, ...organization.choices.map((o) => ({ value: o.id, label: o.name }))],
                  value: organization.organizationId ?? NO_ORGANIZATION,
                  onValueChange: (id) => {
                    if (id === NO_ORGANIZATION) {
                      organization.clearOrganization();
                      toast.info("No organization selected");
                      return;
                    }
                    organization.selectOrganization(id);
                    toast.success(`Working in ${organization.choices.find((o) => o.id === id)?.name ?? "the organization"}`);
                  },
                }
              : !organization.isPlatform && assignments.length > 1 && assignment
                ? {
                    organizations: assignments.map((a) => ({ value: a.id, label: describeAssignment(a) })),
                    value: assignment.id,
                    onValueChange: (id) => void changeRole(id),
                  }
                : undefined
          }
          search={{
            items: [
              // Pages the role in use may open (the backend's menu) and the actions it may take.
              ...flattenModuleTree(sidebarTree).map((p) => ({ id: p.href, title: p.label, group: "Navigation" as const })),
              ...(organization.isPlatform && can("read", MODULE_CODES.ROLES)
                ? [{ id: "/admin/platform/roles", title: "Platform roles", group: "Navigation" as const }]
                : []),
              ...(organization.isPlatform && can("read", MODULE_CODES.USER_ROLES)
                ? [{ id: "/admin/platform/staff", title: "Platform staff", group: "Navigation" as const }]
                : []),
              ...(can("create", MODULE_CODES.ORGANIZATIONS) ? [{ id: "/admin/organizations/new", title: "Add an organization", group: "Actions" as const }] : []),
              ...(can("create", MODULE_CODES.BRANCHES) ? [{ id: "/admin/branches/new", title: "Add a branch", group: "Actions" as const }] : []),
              ...(can("create", MODULE_CODES.EVENTS)
                ? [
                    { id: "/admin/events/new", title: "Create an event", group: "Actions" as const },
                    { id: "/admin/venues/new", title: "Add a venue", group: "Actions" as const },
                  ]
                : []),
              ...(can("create", MODULE_CODES.CUSTOMERS) ? [{ id: "/admin/clients/new", title: "Add a client", group: "Actions" as const }] : []),
              ...(DEMO_PAGES_ENABLED ? getSearchCommands().map((c) => ({ id: c.id, title: `${c.title} (demo)`, group: c.group })) : []),
            ],
            onSelect: (item) => router.push(item.id),
            placeholder: "Search pages and actions…",
          }}
          notifications={DEMO_PAGES_ENABLED ? { unread: unreadNotifications > 0, onClick: () => router.push("/admin/notifications") } : false}
          user={{
            initials: initialsOf(name),
            label: name,
            items: [
              // A platform role's switcher picks organizations, so its other roles are offered here.
              ...(organization.isPlatform
                ? assignments
                    .filter((a) => a.id !== assignment?.id)
                    .map((a) => ({ label: `Work as ${describeAssignment(a)}`, icon: <UserRoundCog />, onClick: () => void changeRole(a.id) }))
                : []),
              // Your own profile and password (Phase 10), for everyone signed in.
              { label: "My profile", icon: <UserRound />, onClick: () => router.push("/admin/settings") },
              ...(DEMO_PAGES_ENABLED ? [{ label: "Component library", icon: <Blocks />, onClick: () => router.push("/admin/components") }] : []),
              {
                label: "Sign out",
                icon: <LogOut />,
                danger: true,
                separatorBefore: true,
                // The session ends in the API client, which sends everyone listening back to sign-in.
                onClick: async () => {
                  await logout();
                  toast.info("Signed out");
                },
              },
            ],
          }}
        />
      }
    >
      <div className="min-w-0 max-w-full">
        <Breadcrumb className="mb-3.5" items={getBreadcrumbTrail(pathname)} />
        <DashboardRouteGuard>{children}</DashboardRouteGuard>
      </div>
    </AppShell>
  );
}

/** Provider order: server state → session → organization → access → shell (with the route guard inside). */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <QueryProvider>
        <AuthProvider>
          <OrganizationProvider>
            <AbilityProvider>
              <DashboardShell>{children}</DashboardShell>
            </AbilityProvider>
          </OrganizationProvider>
        </AuthProvider>
      </QueryProvider>
    </Suspense>
  );
}
