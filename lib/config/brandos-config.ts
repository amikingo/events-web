import type { BusinessDomain, DomainProfile, User } from "../../types";

export interface BrandConfig {
  name: string;
  shortName: string;
  tagline: string;
  version: string;
  badge: string;
  accentColor: string;
  currency: string;
  timezone: string;
}

export interface OrgOption {
  value: string;
  label: string;
  shortLabel: string;
  tier: "Enterprise" | "Scale" | "Starter";
}

/** A page inside a group, such as Payouts under Payments. Needs two or more per group. */
export interface NavChildConfig {
  id: string;
  href: string;
  label: string;
  /** Icon for the sub-page. Falls back to no icon. */
  iconName?: NavItemConfig["iconName"];
}

export interface NavItemConfig {
  id: string;
  href: string;
  label: string;
  iconName:
    | "dashboard"
    | "users"
    | "organizations"
    | "teams"
    | "operations"
    | "analytics"
    | "payments"
    | "bookings"
    | "notifications"
    | "settings"
    | "playground"
    | "showcase"
    | "inbox"
    | "catalog"
    | "orders"
    | "payouts";
  badgeCount?: number;
  section: "Primary" | "Platform";
  /** Sub-pages. With two or more, the item becomes a group whose sub-pages fly out beside it. */
  children?: NavChildConfig[];
}

export interface SearchCommandItem {
  id: string;
  moduleId: string;
  title: string;
  group: "Navigation" | "Actions" | "Domains" | "Quick Filters";
}

/** Master Brand & System Configuration */
export const BRAND_CONFIG: BrandConfig = {
  name: "Your Brand",
  shortName: "Brand",
  tagline: "Replace this with your product's one-line description",
  version: "0.1.0",
  badge: "B",
  accentColor: "var(--color-accent)", // Red-Purple #E30074 from styles/tokens.css
  currency: "ETB",
  timezone: "Africa/Addis_Ababa",
};

/** Organizations in multi-tenant switcher */
export const ORGANIZATIONS: OrgOption[] = [
  { value: "ORG-101", label: "Example Company HQ", shortLabel: "Example HQ", tier: "Enterprise" },
  { value: "ORG-102", label: "Example Branch Office", shortLabel: "Example Branch", tier: "Starter" },
];

/** Business Domain Profiles */
export const DOMAIN_PROFILES: Record<BusinessDomain, DomainProfile> = {
  enterprise: {
    id: "enterprise",
    name: "Your Brand",
    shortName: "Brand",
    badge: "B",
    description: "Replace with a one-line description of your product.",
    currency: "ETB",
    timezone: "Africa/Addis_Ababa",
    enabledModules: [
      "dashboard",
      "payments",
      "users",
      "analytics",
      "inbox",
      "catalog",
      "orders",
      "payouts",
      "notifications",
      "settings",
      "components",
    ],
    labels: {
      bookings: "Bookings",
      operations: "Operations",
      customers: "Users",
      finance: "Payments",
      analytics: "Analytics",
    },
  },
  automotive: {
    id: "automotive",
    name: "Fleet & Service Hub",
    shortName: "Example Fleet",
    badge: "C",
    description: "Commercial fleet dispatch, technician tracking, and vehicle maintenance queue.",
    currency: "ETB",
    timezone: "Africa/Addis_Ababa",
    enabledModules: [
      "dashboard",
      "bookings",
      "operations",
      "payments",
      "users",
      "analytics",
      "settings",
    ],
    labels: {
      bookings: "Service Bookings",
      operations: "Fleet & Diagnostics",
      customers: "Drivers & Fleet Owners",
      finance: "Billing & Settlement",
      analytics: "Fleet Telemetry",
    },
  },
  healthcare: {
    id: "healthcare",
    name: "Clinical Console",
    shortName: "Example Clinic",
    badge: "S",
    description: "Clinical patient appointments, practitioner rosters, and medical service billing.",
    currency: "ETB",
    timezone: "Africa/Addis_Ababa",
    enabledModules: [
      "dashboard",
      "bookings",
      "users",
      "payments",
      "analytics",
      "notifications",
      "settings",
    ],
    labels: {
      bookings: "Appointments",
      operations: "Triage & Lab Queue",
      customers: "Patients & Members",
      finance: "Insurance & Fees",
      analytics: "Clinical Outcomes",
    },
  },
  hospitality: {
    id: "hospitality",
    name: "Hospitality Suite",
    shortName: "Example Hotel",
    badge: "A",
    description: "Hotel room reservations, restaurant scheduling, and merchant payment reconciliation.",
    currency: "ETB",
    timezone: "Africa/Addis_Ababa",
    enabledModules: [
      "dashboard",
      "bookings",
      "payments",
      "users",
      "operations",
      "analytics",
      "settings",
    ],
    labels: {
      bookings: "Reservations",
      operations: "Front Desk & Service",
      customers: "Guests & VIPs",
      finance: "Folios & Invoices",
      analytics: "Occupancy Reports",
    },
  },
  fintech: {
    id: "fintech",
    name: "Payment Gateway Console",
    shortName: "Example Pay",
    badge: "F",
    description: "National payment settlement gateway for Telebirr, CBE Birr, and Awash Bank transactions.",
    currency: "ETB",
    timezone: "Africa/Addis_Ababa",
    enabledModules: [
      "dashboard",
      "payments",
      "operations",
      "users",
      "analytics",
      "settings",
    ],
    labels: {
      bookings: "Payout Batches",
      operations: "Dispute Queue",
      customers: "Merchants",
      finance: "Settlement Ledger",
      analytics: "Transaction Volume",
    },
  },
};

/** Active default domain profile */
export const activeDomain: DomainProfile = DOMAIN_PROFILES.enterprise;

/**
 * Top-level Navigation — STRICT RULE: Max 6 top-level items!
 * Additional items are cleanly categorized in the secondary group or command palette.
 */
export const TOP_LEVEL_NAV_ITEMS: NavItemConfig[] = [
  { id: "dashboard", href: "/admin/dashboard", label: "Today", iconName: "dashboard", section: "Primary" },
  // The real Payments page (payment cases) comes from `/me` as the PAYMENTS module; only the Payouts demo is left here.
  { id: "payments", href: "/admin/payouts", label: "Payouts", iconName: "payouts", section: "Primary" },
  { id: "users", href: "/admin/users", label: "Users", iconName: "users", section: "Primary" },
  { id: "analytics", href: "/admin/analytics", label: "Analytics", iconName: "analytics", section: "Primary" },
  { id: "inbox", href: "/admin/inbox", label: "Inbox", iconName: "inbox", section: "Primary", badgeCount: 4 },
  { id: "catalog", href: "/admin/catalog", label: "Catalog", iconName: "catalog", section: "Primary" },
  // Add your own pages here (max 6 top-level items). One folder in app/(dashboard)/ + one line here.
];

/** Secondary Platform Navigation (grouped below primary items) */
export const SECONDARY_NAV_ITEMS: NavItemConfig[] = [
  { id: "notifications", href: "/admin/notifications", label: "Notifications", iconName: "notifications", section: "Platform", badgeCount: 2 },
  { id: "settings", href: "/admin/settings", label: "Settings", iconName: "settings", section: "Platform" },
  { id: "components", href: "/admin/components", label: "Components", iconName: "playground", section: "Platform" },
];

export const ALL_NAV_ITEMS: NavItemConfig[] = [...TOP_LEVEL_NAV_ITEMS, ...SECONDARY_NAV_ITEMS];

export function isModuleEnabled(moduleId: string, domainId: BusinessDomain = "enterprise"): boolean {
  const profile = DOMAIN_PROFILES[domainId] ?? DOMAIN_PROFILES.enterprise;
  return profile.enabledModules.includes(moduleId);
}

/** Get localized label for current domain */
export function getDomainLabel(moduleId: string, defaultLabel: string, domainId: BusinessDomain = "enterprise"): string {
  const profile = DOMAIN_PROFILES[domainId] ?? DOMAIN_PROFILES.enterprise;
  if (moduleId === "bookings" && profile.labels.bookings) return profile.labels.bookings;
  if (moduleId === "operations" && profile.labels.operations) return profile.labels.operations;
  if (moduleId === "payments" && profile.labels.finance) return profile.labels.finance;
  if (moduleId === "users" && profile.labels.customers) return profile.labels.customers;
  if (moduleId === "analytics" && profile.labels.analytics) return profile.labels.analytics;
  return defaultLabel;
}

/** Command Palette search registry */
export const COMMAND_PALETTE_ITEMS: SearchCommandItem[] = [
  // Primary
  { id: "/admin/dashboard", moduleId: "dashboard", title: "Today — Overview & Needs Attention", group: "Navigation" },
  { id: "/admin/payments", moduleId: "payments", title: "Payments: refunds and payment problems", group: "Navigation" },
  // Platform & Settings
  { id: "/admin/users", moduleId: "users", title: "Users", group: "Navigation" },
  { id: "/admin/users/new", moduleId: "users", title: "Add a user", group: "Actions" },
  { id: "/admin/analytics", moduleId: "analytics", title: "Analytics", group: "Navigation" },
  { id: "/admin/inbox", moduleId: "inbox", title: "Inbox", group: "Navigation" },
  { id: "/admin/catalog", moduleId: "catalog", title: "Catalog", group: "Navigation" },
  { id: "/admin/payouts", moduleId: "payouts", title: "Payouts", group: "Navigation" },
  { id: "/admin/notifications", moduleId: "notifications", title: "Notification Center & Alerts", group: "Navigation" },
  { id: "/admin/settings", moduleId: "settings", title: "Platform Settings & Security", group: "Navigation" },
  { id: "/admin/components", moduleId: "components", title: "Component Library", group: "Navigation" },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What a record id is, by the section it sits in: `/events/{id}` is an Event, `/orders/{id}` an Order. */
const RECORD_NOUNS: Record<string, string> = {
  events: "Event",
  orders: "Order",
  payments: "Case",
  clients: "Client",
  venues: "Venue",
  guests: "Guest",
  branches: "Branch",
  organizations: "Organization",
  roles: "Role",
  assignments: "Staff member",
  staff: "Staff member",
  modules: "Module",
  "role-templates": "Template",
};

/** Breadcrumb resolver. Dashboard pages live under /admin, so the first segment is the section, not a crumb. */
export function getBreadcrumbTrail(pathname: string): { label: string; href?: string }[] {
  // The signed-in start page: it opens the first page the role may see.
  const HOME = "/admin";
  const parts = pathname.split("/").filter(Boolean).slice(1);
  if (parts.length === 0 || pathname === HOME) {
    return [{ label: "Home", href: HOME }, { label: "Today" }];
  }

  const trail: { label: string; href?: string }[] = [{ label: "Home", href: HOME }];
  let accumulatedPath = "/admin";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    accumulatedPath += `/${part}`;
    const isLast = i === parts.length - 1;

    let label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ");
    const matchingNav = ALL_NAV_ITEMS.flatMap((item) => [item, ...(item.children ?? [])]).find((item) => item.href === accumulatedPath);
    if (matchingNav) {
      label = matchingNav.label;
    } else if (part === "new") {
      label = "New";
    } else if (part === "edit") {
      label = "Edit";
    } else if (part === "issue") {
      label = "Issue tickets";
    } else if (part === "door") {
      label = "Door";
    } else if (UUID.test(part)) {
      // A record id from the API: the page itself names the record, so the crumb says what kind of record it is.
      // On the Orders page the path is /orders/{eventId}/{orderId}: the first id is the event, the second the order.
      const previous = parts[i - 1] ?? "";
      const ordersPage = parts[0] === "orders" && i === 1;
      label = ordersPage ? "Event" : (RECORD_NOUNS[previous] ?? (UUID.test(previous) && parts[0] === "orders" ? "Order" : "Details"));
    } else if (part.startsWith("USR-") || part.startsWith("ORG-") || part.startsWith("TX-") || part.startsWith("TSK-")) {
      label = part;
    }

    trail.push({
      label,
      href: isLast ? undefined : accumulatedPath,
    });
  }

  return trail;
}

