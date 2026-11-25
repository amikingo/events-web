import type { NavigationNode } from "@/lib/api/auth";
import type { NavChildConfig, NavItemConfig } from "./brandos-config";

/**
 * The API decides which pages a role may see (`/me` → `navigation`); this turns that menu into sidebar items.
 *
 * Only pages that exist in this app are shown: the API lists more modules than the web has screens for (the
 * Access Control pages, for one), and a link to a page that isn't there is worse than no link. When you build the
 * page for a module, add its `route_name` here and it appears for every role that may view it.
 */
const BUILT_PAGES: Record<string, string> = {
  "/organizations": "/admin/organizations",
  "/branches": "/admin/branches",
};

/** The API names icons the Lucide way; the app has its own set, so each is mapped. Unknown names get a plain page icon. */
const ICONS: Record<string, NavItemConfig["iconName"]> = {
  Building: "organizations",
  Building2: "organizations",
  GitBranch: "organizations",
  ShieldCheck: "teams",
  Users: "users",
};
const iconFor = (icon: string | null): NavItemConfig["iconName"] => (icon && ICONS[icon]) || "operations";

interface Page {
  id: string;
  href: string;
  label: string;
  iconName: NavItemConfig["iconName"];
}

/** Every page below `node` (itself included) that this app has built, in the API's order. */
function pagesOf(node: NavigationNode): Page[] {
  const own = node.route_name && BUILT_PAGES[node.route_name];
  const mine: Page[] = own ? [{ id: node.code, href: own, label: node.module_name, iconName: iconFor(node.icon) }] : [];
  return [...mine, ...node.children.flatMap(pagesOf)];
}

/**
 * Sidebar items for the API's menu. A container (Administration) becomes a group when two or more of its pages are
 * built, a plain link when only one is, and disappears when none is.
 */
export function apiNavItems(navigation: NavigationNode[]): NavItemConfig[] {
  const items: NavItemConfig[] = [];
  for (const node of navigation) {
    const pages = pagesOf(node);
    const first = pages[0];
    if (!first) continue;
    if (pages.length === 1) {
      items.push({ id: first.id, href: first.href, label: first.label, iconName: first.iconName, section: "Platform" });
      continue;
    }
    const children: NavChildConfig[] = pages.map(({ id, href, label, iconName }) => ({ id, href, label, iconName }));
    items.push({ id: node.code, href: first.href, label: node.module_name, iconName: iconFor(node.icon), section: "Platform", children });
  }
  return items;
}

/** Every built page in the API's menu, flat, for the command palette. */
export function apiNavPages(navigation: NavigationNode[]): Page[] {
  return navigation.flatMap(pagesOf);
}
