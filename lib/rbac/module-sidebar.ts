import { Briefcase, Building, Building2, Calendar, CalendarDays, GitBranch, LayoutDashboard, ShieldCheck, Users, icons } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ModuleTreeNode } from "@/lib/rbac/build-module-tree";

/**
 * Sidebar icons are Lucide icons, as in bookings_web: any of Lucide's icons, found by the name the backend sends for a
 * module (`icon` in `/me` → `navigation`, or typed on the module form). Looked up in Lucide's own `icons` list, so only
 * real icons match, never the package's other exports.
 */
const LUCIDE: Record<string, LucideIcon> = icons;
const LUCIDE_NAMES = Object.keys(LUCIDE);

/**
 * The Lucide icon a name means, written any way people write it: "CalendarDays" (the code name), "calendar-days" (the
 * lucide.dev name), "calendar_days" or "calendar days". Returns the code name, or null when Lucide has no such icon.
 */
export function normalizeLucideIconName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  if (trimmed in LUCIDE) return trimmed;
  const pascal = trimmed.replace(/[-_\s]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : "")).replace(/^./, (c) => c.toUpperCase());
  if (pascal in LUCIDE) return pascal;
  const loose = trimmed.replace(/[-_\s]/g, "").toLowerCase();
  return LUCIDE_NAMES.find((key) => key.toLowerCase() === loose) ?? null;
}

/** When the backend sent no icon, or a name Lucide doesn't have: by module or group code (same codes as the backend). */
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
  const name = normalizeLucideIconName(backendIcon);
  return (name ? LUCIDE[name] : undefined) ?? ICON_BY_CODE[code] ?? LayoutDashboard;
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
