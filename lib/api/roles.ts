/**
 * An organization's roles and what each may do (module ROLES). Read only: the API has no create or edit yet.
 *
 *   GET /v1/organizations/:organizationId/roles
 *   GET /v1/organizations/:organizationId/roles/:roleId
 */
import { apiRequest } from "@/lib/api-client";

/** What a role may do on one module (the same seven actions `/me` reports). */
export interface RoleGrant {
  module_code: string;
  module_name: string;
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
  notify: boolean;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  grants: RoleGrant[];
}

const base = (organizationId: string) => `/v1/organizations/${organizationId}/roles`;

/** Every role of the organization (the API doesn't page this list). */
export function listRoles(organizationId: string, signal?: AbortSignal): Promise<Role[]> {
  return apiRequest<Role[]>(base(organizationId), { signal });
}

export function getRole(organizationId: string, roleId: string, signal?: AbortSignal): Promise<Role> {
  return apiRequest<Role>(`${base(organizationId)}/${roleId}`, { signal });
}
