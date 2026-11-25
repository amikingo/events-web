import {
  Boxes,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CalendarDays,
  Copy,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ModuleTreeNode } from "@/lib/rbac/build-module-tree";

/**
 * Sidebar icons are Lucide icons, as in bookings_web. The backend names an icon for every module and group (`icon` in
 * `/me` → `navigation`), so that name is used first. Only the names the backend uses are imported, which keeps the
 * rest of Lucide out of the page: when a backend migration adds a module with a new icon name, add it here.
 */
const BACKEND_ICONS: Record<string, LucideIcon> = {
  Boxes,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CalendarDays,
  Copy,
  GitBranch,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  Users,
};

/** When the backend sent no icon, or one not imported above: by module or group code (same codes as the backend). */
const ICON_BY_CODE: Record<string, LucideIcon> = {
  EVENT_MANAGEMENT: CalendarDays,
  ADMINISTRATION: Building2,
  ACCESS_CONTROL: ShieldCheck,
  EVENTS: Calendar,
  CUSTOMERS: Briefcase,
  REGISTRATIONS: Users,
  ORGANIZATIONS: Building,
  BRANCHES: GitBranch,
};

export function iconForModule(code: string, backendIcon: string | null): LucideIcon {
  return (backendIcon ? BACKEND_ICONS[backendIcon.trim()] : undefined) ?? ICON_BY_CODE[code] ?? LayoutDashboard;
}

export interface ModuleSidebarPage {
  code: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

/** One top-level entry of the backend's menu, with every page below it (its own page first, when it has one). */
export interface ModuleSidebarEntry {
  code: string;
  label: string;
  icon: LucideIcon;
  pages: ModuleSidebarPage[];
}

/**
 * The module tree → one entry per top-level item, in the backend's order (`sno`), as bookings_web builds it. The
 * layout shows an entry with one page as a plain link (named after the entry) and an entry with more as an
 * accordion whose pages expand in place.
 */
export function moduleSidebarEntries(tree: ModuleTreeNode[]): ModuleSidebarEntry[] {
  const pagesOf = (n: ModuleTreeNode): ModuleSidebarPage[] => [
    ...(n.href ? [{ code: n.code, label: n.label, href: n.href, icon: iconForModule(n.code, n.icon) }] : []),
    ...n.children.flatMap(pagesOf),
  ];
  return tree
    .map((node) => ({ code: node.code, label: node.label, icon: iconForModule(node.code, node.icon), pages: pagesOf(node) }))
    .filter((entry) => entry.pages.length > 0);
}
