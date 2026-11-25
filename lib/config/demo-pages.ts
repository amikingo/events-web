/**
 * The template's demo screens (Payments, Orders, Users, Analytics…) have no backend module. They show in a "Demo"
 * sidebar group during development only. In a production build they leave the menu and the route guard blocks them,
 * so production shows only what `/me` allows.
 */
export const DEMO_PAGES_ENABLED = process.env.NODE_ENV !== "production";

/** Pages every signed-in person may open, whatever their role. */
export const ALWAYS_ALLOWED_PATHS = ["/admin", "/admin/forbidden"];
