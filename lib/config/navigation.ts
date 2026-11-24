import {
  ALL_NAV_ITEMS,
  COMMAND_PALETTE_ITEMS,
  SECONDARY_NAV_ITEMS,
  TOP_LEVEL_NAV_ITEMS,
  activeDomain,
  getBreadcrumbTrail as baseGetBreadcrumbTrail,
  getDomainLabel,
  isModuleEnabled,
  type NavItemConfig,
  type SearchCommandItem,
} from "./brandos-config";

export type { NavItemConfig, SearchCommandItem };

export interface NavSection {
  name: "Core" | "Platform";
  items: NavItemConfig[];
}

/** Retrieve active top-level navigation items (MAX 6 ITEMS) */
export function getTopLevelNavItems(domainId = activeDomain.id): NavItemConfig[] {
  return TOP_LEVEL_NAV_ITEMS.filter((item) => isModuleEnabled(item.id, domainId)).map((item) => ({
    ...item,
    label: getDomainLabel(item.id, item.label, domainId),
  }));
}

/** Retrieve active secondary platform items */
/** The component showcase (`/admin/components`) is a development aid and leaves the menu in production builds. */
const isDevOnly = (id: string) => id === "components" && process.env.NODE_ENV === "production";

export function getSecondaryNavItems(domainId = activeDomain.id): NavItemConfig[] {
  return SECONDARY_NAV_ITEMS.filter((item) => isModuleEnabled(item.id, domainId) && !isDevOnly(item.id)).map((item) => ({
    ...item,
    label: getDomainLabel(item.id, item.label, domainId),
  }));
}

/** Retrieve all active navigation items */
export function getActiveNavItems(domainId = activeDomain.id): NavItemConfig[] {
  return ALL_NAV_ITEMS.filter((item) => isModuleEnabled(item.id, domainId)).map((item) => ({
    ...item,
    label: getDomainLabel(item.id, item.label, domainId),
  }));
}

/**
 * Grouped navigation sections containing only active domain modules.
 * Strictly formatted: Core section has MAX 6 items, Platform holds secondary tools.
 */
export function getNavSections(domainId = activeDomain.id): NavSection[] {
  const core = getTopLevelNavItems(domainId);
  const platform = getSecondaryNavItems(domainId);

  const sections: NavSection[] = [];
  if (core.length > 0) {
    sections.push({ name: "Core", items: core });
  }
  if (platform.length > 0) {
    sections.push({ name: "Platform", items: platform });
  }
  return sections;
}

export const NAV_CONFIG: NavItemConfig[] = getActiveNavItems();

export function getSearchCommands(): SearchCommandItem[] {
  return COMMAND_PALETTE_ITEMS.filter((c) => !isDevOnly(c.moduleId));
}

export const getBreadcrumbTrail = baseGetBreadcrumbTrail;
export { ALL_NAV_ITEMS };
