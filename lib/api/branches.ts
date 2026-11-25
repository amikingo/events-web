/**
 * Branches of an organization (module BRANCHES).
 *
 *   GET   /v1/organizations/:organizationId/branches
 *   POST  /v1/organizations/:organizationId/branches
 *   GET   /v1/organizations/:organizationId/branches/:branchId
 *   PATCH /v1/organizations/:organizationId/branches/:branchId
 *   PATCH /v1/organizations/:organizationId/branches/:branchId/status
 */
import { apiListAll, apiPage, apiRequest, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";

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

export interface BranchListParams {
  page: number;
  pageSize: number;
  /** Only active (true) or only switched-off (false) branches; all when left out. */
  isActive?: boolean;
}

/** One page of branches. The page size is clamped to the API's limit (100). */
export function listBranches(organizationId: string, params: BranchListParams, signal?: AbortSignal): Promise<Paginated<Branch>> {
  return apiPage<Branch>(base(organizationId), {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: { is_active: params.isActive === undefined ? undefined : String(params.isActive) },
    signal,
  });
}

/** Every branch of an organization (all pages). */
export function listAllBranches(organizationId: string, signal?: AbortSignal): Promise<Branch[]> {
  return apiListAll<Branch>(base(organizationId), { signal });
}

export function getBranch(organizationId: string, branchId: string, signal?: AbortSignal): Promise<Branch> {
  return apiRequest<Branch>(`${base(organizationId)}/${branchId}`, { signal });
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
