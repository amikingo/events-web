/**
 * Organizations (module ORGANIZATIONS).
 *
 *   GET   /v1/organizations                    (platform roles)
 *   POST  /v1/organizations                    (platform roles; optional owner_mobile)
 *   GET   /v1/organizations/:organizationId
 *   PATCH /v1/organizations/:organizationId    (name, description, country, timezone, default_currency)
 *   PATCH /v1/organizations/:organizationId/status  (platform Super Admin only)
 */
import { apiListAll, apiPage, apiRequest, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";
import type { Branch } from "@/lib/api/branches";

/** An organization as the API returns it (its own field names). */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** false (most organizers): branch screens stay hidden; the API keeps one hidden MAIN branch. */
  has_branches: boolean;
  /** Defaults for new events: `ET`, `Africa/Addis_Ababa`, `ETB`. Changing them never touches existing events. */
  country: string;
  timezone: string;
  default_currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUpdateInput {
  name?: string;
  description?: string | null;
  country?: string;
  timezone?: string;
  default_currency?: string;
}

/** `PATCH /v1/organizations/{id}`: name, description and defaults for new events. Slug never changes. */
export function updateOrganization(organizationId: string, changes: OrganizationUpdateInput): Promise<Organization> {
  return apiRequest<Organization>(`/v1/organizations/${organizationId}`, { method: "PATCH", body: changes });
}

/** Platform Super Admin only: switches an organization off or back on. */
export function setOrganizationActive(organizationId: string, isActive: boolean): Promise<Organization> {
  return apiRequest<Organization>(`/v1/organizations/${organizationId}/status`, { method: "PATCH", body: { is_active: isActive } });
}

export interface OrganizationInput {
  name: string;
  /** Optional, except for a name with no Latin letters (e.g. Amharic), which needs one. Lower-case, digits, hyphens. */
  slug?: string;
  description?: string | null;
  /** Off by default: most organizers have no branches, and branch screens stay hidden for them. */
  hasBranches?: boolean;
  /** The first branch. Leave out to get a branch called MAIN. Both fields are needed together. */
  defaultBranch?: { code: string; name: string };
  /** Optional first Owner's mobile (`09…` or `+251…`). Looked up in Cheche accounts before creating. */
  ownerMobile?: string;
}

export interface OrganizationListParams {
  page: number;
  pageSize: number;
  isActive?: boolean;
}

/** One page of organizations. Platform roles only: tenant roles get `403 permission_denied`. */
export function listOrganizations(params: OrganizationListParams, signal?: AbortSignal): Promise<Paginated<Organization>> {
  return apiPage<Organization>("/v1/organizations", {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: { is_active: params.isActive === undefined ? undefined : String(params.isActive) },
    signal,
  });
}

/** Every organization, for the platform role's organization picker. Platform roles only. */
export function listAllOrganizations(signal?: AbortSignal): Promise<Organization[]> {
  return apiListAll<Organization>("/v1/organizations", { signal });
}

/** One organization: a tenant role may read its own. */
export function getOrganization(organizationId: string, signal?: AbortSignal): Promise<Organization> {
  return apiRequest<Organization>(`/v1/organizations/${organizationId}`, { signal });
}

/** Platform roles only. Also creates the first branch and, when `ownerMobile` is given, the first Owner. */
export function createOrganization(input: OrganizationInput): Promise<{ organization: Organization; branches: Branch[]; owner: { user_id: string; assignment_id: string } | null }> {
  return apiRequest("/v1/organizations", {
    method: "POST",
    body: {
      organization: { name: input.name, slug: input.slug, description: input.description, has_branches: input.hasBranches },
      ...(input.defaultBranch ? { default_branch: input.defaultBranch } : {}),
      ...(input.ownerMobile ? { owner_mobile: input.ownerMobile } : {}),
    },
  });
}
