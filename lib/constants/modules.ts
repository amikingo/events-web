/**
 * Mirror of the backend's module codes: `events-api/src/utils/module-codes.ts` (`MODULE_CODES`).
 * Every value must be identical to the backend's, which matches the `module.code` rows and the keys of the
 * `/v1/auth/staff/me` permission map. Add a code here in the same change that adds it to the backend.
 */
export const MODULE_CODES = {
  // Platform foundation
  ORGANIZATIONS: "ORGANIZATIONS", // backend MODULE_CODES.ORGANIZATIONS
  BRANCHES: "BRANCHES", // backend MODULE_CODES.BRANCHES
  MODULES: "MODULES", // backend MODULE_CODES.MODULES
  ROLE_TEMPLATES: "ROLE_TEMPLATES", // backend MODULE_CODES.ROLE_TEMPLATES
  ROLES: "ROLES", // backend MODULE_CODES.ROLES
  USER_ROLES: "USER_ROLES", // backend MODULE_CODES.USER_ROLES
  USER_MODULE_ACCESSES: "USER_MODULE_ACCESSES", // backend MODULE_CODES.USER_MODULE_ACCESSES
  // Business modules
  EVENTS: "EVENTS", // backend MODULE_CODES.EVENTS (events, ticket types, venues)
  CUSTOMERS: "CUSTOMERS", // backend MODULE_CODES.CUSTOMERS (customer accounts, shown as "Clients")
  REGISTRATIONS: "REGISTRATIONS", // backend MODULE_CODES.REGISTRATIONS (guest profiles and registrations, shown as "Guests")
  PAYMENTS: "PAYMENTS", // backend MODULE_CODES.PAYMENTS (payment cases: refunds due, double charges, wrong amounts)
} as const;

export type ModuleCode = (typeof MODULE_CODES)[keyof typeof MODULE_CODES];

const ALL_CODES = new Set<string>(Object.values(MODULE_CODES));

/** Codes come from the backend in UPPER_SNAKE_CASE; this tolerates stray spaces or casing, never different words. */
export function normalizeModuleCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isModuleCode(code: string): code is ModuleCode {
  return ALL_CODES.has(normalizeModuleCode(code));
}

/**
 * Which module guards which screen. A path under one of these prefixes needs `view` on the module; the longest
 * prefix wins. Venues have no menu item of their own but are guarded by EVENTS, as on the backend.
 */
export const ROUTE_MODULE_MAP: Record<string, ModuleCode> = {
  "/admin/events": MODULE_CODES.EVENTS,
  "/admin/venues": MODULE_CODES.EVENTS,
  "/admin/clients": MODULE_CODES.CUSTOMERS,
  "/admin/guests": MODULE_CODES.REGISTRATIONS,
  // Orders live under each event on the API; the Orders page shows them per event, for whoever can see guests.
  "/admin/orders": MODULE_CODES.REGISTRATIONS,
  // The door (check-in) for any published event; letting a guest in needs Guests › update, checked on the page.
  "/admin/door": MODULE_CODES.REGISTRATIONS,
  "/admin/payments": MODULE_CODES.PAYMENTS,
  "/admin/organizations": MODULE_CODES.ORGANIZATIONS,
  "/admin/branches": MODULE_CODES.BRANCHES,
  "/admin/access/roles": MODULE_CODES.ROLES,
  "/admin/access/assignments": MODULE_CODES.USER_ROLES,
  "/admin/access/role-templates": MODULE_CODES.ROLE_TEMPLATES,
  "/admin/access/modules": MODULE_CODES.MODULES,
};

/** The module that guards `pathname`, or null when no backend module owns it. */
export function moduleForPath(pathname: string): ModuleCode | null {
  const match = Object.keys(ROUTE_MODULE_MAP)
    .filter((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ROUTE_MODULE_MAP[match]! : null;
}

/** Modules the sidebar hides because their screens live elsewhere (overrides live on Staff Assignments). */
export const SIDEBAR_HIDDEN_MODULES: ReadonlySet<string> = new Set<string>([MODULE_CODES.USER_MODULE_ACCESSES]);
