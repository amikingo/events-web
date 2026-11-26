import type { BranchListParams } from "@/lib/api/branches";
import type { ClientListParams } from "@/lib/api/clients";
import type { EventListParams } from "@/lib/api/events";
import type { OrganizationListParams } from "@/lib/api/organizations";
import type { StaffListParams } from "@/lib/api/staff";
import type { PersonListParams } from "@/lib/api/persons";
import type { RegistrationListParams } from "@/lib/api/registrations";
import type { VenueListParams } from "@/lib/api/venues";

/**
 * Query key factories. Every key starts with the feature name, then the scope (organization), then the
 * parameters, so `invalidateQueries({ queryKey: venueQk.all(orgId) })` refreshes every venue query of that
 * organization at once.
 */

export const userQk = {
  /** `/me` for one role: permissions and navigation differ per assignment. */
  effectiveAccess: (assignmentId: string | null | undefined) => ["user", "effective-access", assignmentId ?? "none"] as const,
};

export const organizationQk = {
  all: () => ["organizations"] as const,
  list: (params: OrganizationListParams) => ["organizations", "list", params] as const,
  /** Every organization, for the platform role's picker. */
  options: () => ["organizations", "options"] as const,
  detail: (organizationId: string) => ["organizations", "detail", organizationId] as const,
};

export const branchQk = {
  all: (organizationId: string) => ["branches", organizationId] as const,
  list: (organizationId: string, params: BranchListParams) => ["branches", organizationId, "list", params] as const,
  /** Every branch, switched-off ones included. */
  everyone: (organizationId: string) => ["branches", organizationId, "everyone"] as const,
  detail: (organizationId: string, branchId: string) => ["branches", organizationId, "detail", branchId] as const,
};

export const venueQk = {
  all: (organizationId: string) => ["venues", organizationId] as const,
  list: (organizationId: string, params: VenueListParams) => ["venues", organizationId, "list", params] as const,
  /** Every venue, switched-off ones included: an event names the venue it was made for. Also fills the event form's picker. */
  everyone: (organizationId: string) => ["venues", organizationId, "everyone"] as const,
  detail: (organizationId: string, venueId: string) => ["venues", organizationId, "detail", venueId] as const,
};

export const clientQk = {
  all: (organizationId: string) => ["clients", organizationId] as const,
  list: (organizationId: string, params: ClientListParams) => ["clients", organizationId, "list", params] as const,
  /** Every client, switched-off ones included. Also fills the event form's picker. */
  everyone: (organizationId: string) => ["clients", organizationId, "everyone"] as const,
  detail: (organizationId: string, clientId: string) => ["clients", organizationId, "detail", clientId] as const,
};

export const eventQk = {
  all: (organizationId: string) => ["events", organizationId] as const,
  list: (organizationId: string, params: EventListParams) => ["events", organizationId, "list", params] as const,
  detail: (organizationId: string, eventId: string) => ["events", organizationId, "detail", eventId] as const,
  tickets: (organizationId: string, eventId: string) => ["events", organizationId, "tickets", eventId] as const,
};

export const personQk = {
  all: (organizationId: string) => ["persons", organizationId] as const,
  list: (organizationId: string, params: PersonListParams) => ["persons", organizationId, "list", params] as const,
  detail: (organizationId: string, personId: string) => ["persons", organizationId, "detail", personId] as const,
};

/** An event's guest list and its places-left summary. */
export const registrationQk = {
  all: (organizationId: string, eventId: string) => ["registrations", organizationId, eventId] as const,
  list: (organizationId: string, eventId: string, params: RegistrationListParams) => ["registrations", organizationId, eventId, "list", params] as const,
  summary: (organizationId: string, eventId: string) => ["registrations", organizationId, eventId, "summary"] as const,
};

export const roleQk = {
  all: (organizationId: string) => ["roles", organizationId] as const,
  list: (organizationId: string) => ["roles", organizationId, "list"] as const,
  detail: (organizationId: string, roleId: string) => ["roles", organizationId, "detail", roleId] as const,
  grantableModules: (organizationId: string) => ["roles", organizationId, "grantable-modules"] as const,
};

export const staffQk = {
  all: (organizationId: string) => ["staff", organizationId] as const,
  list: (organizationId: string, params: StaffListParams) => ["staff", organizationId, "list", params] as const,
  detail: (organizationId: string, assignmentId: string) => ["staff", organizationId, "detail", assignmentId] as const,
  overrides: (organizationId: string, assignmentId: string) => ["staff", organizationId, "overrides", assignmentId] as const,
};

export const roleTemplateQk = {
  all: () => ["role-templates"] as const,
  list: () => ["role-templates", "list"] as const,
  detail: (templateId: string) => ["role-templates", "detail", templateId] as const,
  organizationOptions: (organizationId: string) => ["role-templates", "organization", organizationId] as const,
};

export const moduleQk = {
  all: () => ["modules"] as const,
  tree: () => ["modules", "tree"] as const,
};
