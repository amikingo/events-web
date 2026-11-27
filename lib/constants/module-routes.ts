/**
 * The backend's `route_name` (from `/me` → `navigation`) → the frontend path that shows it.
 *
 * The backend decides which modules exist and who may see them; this file only says where each one lives here, so a
 * new backend module never makes the frontend guess a URL. A `route_name` missing from this map has no screen yet,
 * and the sidebar leaves it out (today: the Access Control pages, whose endpoints don't exist yet).
 */
export const MODULE_ROUTES: Record<string, string> = {
  // Menu-only module (create it on Access › Modules: code DASHBOARD, address /dashboard, first in the menu); guarded by EVENTS.
  "/dashboard": "/admin/dashboard",
  "/events": "/admin/events",
  // Menu-only module (create it on Access › Modules: code VENUES, address /venues); guarded by EVENTS.
  "/venues": "/admin/venues",
  // Menu-only module (create it on Access › Modules: code ORDERS, address /orders); guarded by REGISTRATIONS.
  "/orders": "/admin/orders",
  // Menu-only module (create it on Access › Modules: code DOOR, address /door); guarded by REGISTRATIONS.
  "/door": "/admin/door",
  // Payment cases (Phase 8): refunds due, double charges, wrong amounts. Seeded by the API with route /payments.
  "/payments": "/admin/payments",
  "/clients": "/admin/clients",
  "/guests": "/admin/guests",
  "/organizations": "/admin/organizations",
  "/branches": "/admin/branches",
  "/access/roles": "/admin/access/roles",
  "/access/assignments": "/admin/access/assignments",
  "/access/role-templates": "/admin/access/role-templates",
  "/access/modules": "/admin/access/modules",
};

/** The frontend path for a backend `route_name`, or null when no screen is built for it. */
export function frontendPathFor(routeName: string | null): string | null {
  return routeName ? (MODULE_ROUTES[routeName] ?? null) : null;
}
