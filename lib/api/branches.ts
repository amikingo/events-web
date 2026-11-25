import { apiList, apiRequest } from "@/lib/api/client";

/** A branch as `GET /v1/organizations/{id}/branches` returns it (the API's own field names). */
export interface Branch {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchInput {
  code: string;
  name: string;
  description?: string | null;
}

const base = (organizationId: string) => `/v1/organizations/${organizationId}/branches`;

/** Every branch of an organization. The API pages at 100 at most, so this reads page after page until it has all. */
export async function listBranches(organizationId: string, signal?: AbortSignal): Promise<Branch[]> {
  const all: Branch[] = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await apiList<Branch>(`${base(organizationId)}?page=${page}&pageSize=100`, { signal });
    all.push(...data);
    if (data.length === 0 || all.length >= meta.count) return all;
  }
}

export function createBranch(organizationId: string, input: BranchInput): Promise<Branch> {
  return apiRequest<Branch>(base(organizationId), { method: "POST", body: input });
}

/** Send only what changed. `description: null` clears it. */
export function updateBranch(organizationId: string, branchId: string, changes: Partial<BranchInput>): Promise<Branch> {
  return apiRequest<Branch>(`${base(organizationId)}/${branchId}`, { method: "PATCH", body: changes });
}

/** The default branch cannot be deactivated (`409 invalid_branch_state`). */
export function setBranchActive(organizationId: string, branchId: string, isActive: boolean): Promise<Branch> {
  return apiRequest<Branch>(`${base(organizationId)}/${branchId}/status`, { method: "PATCH", body: { is_active: isActive } });
}
