import { apiList, apiRequest } from "@/lib/api/client";
import type { Branch } from "@/lib/api/branches";

/** An organization as the API returns it (its own field names). */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInput {
  name: string;
  /** Optional, except for a name with no Latin letters (e.g. Amharic), which needs one. Lower-case, digits, hyphens. */
  slug?: string;
  description?: string | null;
  /** The first branch. Leave out to get a branch called MAIN. Both fields are needed together. */
  defaultBranch?: { code: string; name: string };
}

/** Every organization. Platform roles only: tenant roles get `403 permission_denied`. */
export async function listOrganizations(signal?: AbortSignal): Promise<Organization[]> {
  const all: Organization[] = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await apiList<Organization>(`/v1/organizations?page=${page}&pageSize=100`, { signal });
    all.push(...data);
    if (data.length === 0 || all.length >= meta.count) return all;
  }
}

/** One organization: a tenant role may read its own. */
export function getOrganization(organizationId: string, signal?: AbortSignal): Promise<Organization> {
  return apiRequest<Organization>(`/v1/organizations/${organizationId}`, { signal });
}

/** Platform roles only. Also creates the first branch. */
export function createOrganization(input: OrganizationInput): Promise<{ organization: Organization; branches: Branch[] }> {
  return apiRequest("/v1/organizations", {
    method: "POST",
    body: {
      organization: { name: input.name, slug: input.slug, description: input.description },
      ...(input.defaultBranch ? { default_branch: input.defaultBranch } : {}),
    },
  });
}
