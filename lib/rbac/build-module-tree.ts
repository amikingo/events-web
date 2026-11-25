import type { NavigationNode } from "@/lib/auth-token";
import { frontendPathFor } from "@/lib/constants/module-routes";
import { SIDEBAR_HIDDEN_MODULES, normalizeModuleCode } from "@/lib/constants/modules";

/** A menu entry the app can show: a page with a frontend path, or a group of them. */
export interface ModuleTreeNode {
  code: string;
  label: string;
  /** The frontend path; null for a group that only holds other entries. */
  href: string | null;
  /** The backend's Lucide icon name (`Calendar`), when it sent one. */
  icon: string | null;
  children: ModuleTreeNode[];
}

/**
 * The backend's navigation tree → the entries this app can show, in the backend's order. A page is kept when the role
 * may view it and a screen exists for its `route_name`; a group is kept when anything inside it is kept.
 */
export function buildModuleTree(navigation: NavigationNode[], canView: (code: string) => boolean): ModuleTreeNode[] {
  const prune = (node: NavigationNode): ModuleTreeNode | null => {
    const code = normalizeModuleCode(node.code);
    if (SIDEBAR_HIDDEN_MODULES.has(code)) return null;
    const children = node.children.map(prune).filter((n): n is ModuleTreeNode => n !== null);
    const href = frontendPathFor(node.routeName);
    // A page needs `view`. A group (no route) carries no permission of its own: it shows when a child does.
    const page = href && canView(code) ? href : null;
    if (!page && children.length === 0) return null;
    return { code, label: node.moduleName, href: page, icon: node.icon, children };
  };
  return navigation.map(prune).filter((n): n is ModuleTreeNode => n !== null);
}

/** Every page in the tree, flat (for the command palette and route checks). */
export function flattenModuleTree(tree: ModuleTreeNode[]): { code: string; label: string; href: string }[] {
  return tree.flatMap((n) => [...(n.href ? [{ code: n.code, label: n.label, href: n.href }] : []), ...flattenModuleTree(n.children)]);
}
