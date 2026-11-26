/**
 * An organization's roles and what each may do (module ROLES).
 *
 *   GET   /v1/organizations/:organizationId/roles
 *   POST  /v1/organizations/:organizationId/roles
 *   GET   /v1/organizations/:organizationId/roles/:roleId
 *   PATCH /v1/organizations/:organizationId/roles/:roleId
 *   PATCH /v1/organizations/:organizationId/roles/:roleId/status
 */
import { apiRequest } from "@/lib/api-client";

export type GrantAction = "view" | "create" | "update" | "delete" | "import" | "export" | "notify";

export interface GrantableModule {
  module_code: string;
  module_name: string;
  sno: number;
  actions: GrantAction[];
}

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
  grant_count: number;
  member_count: number;
  role_template: { id: string; code: string; name: string } | null;
  grants: RoleGrant[];
}

export interface RoleGrantInput {
  module_code: string;
  view: boolean;
  create: boolean;
  update: boolean;
  delete?: boolean;
  import?: boolean;
  export?: boolean;
  notify?: boolean;
}

export interface RoleCreateInput {
  code: string;
  name: string;
  description?: string | null;
  role_template_id?: string;
  grants: RoleGrantInput[];
}

export interface RoleUpdateInput {
  name?: string;
  description?: string | null;
  grants?: RoleGrantInput[];
}

const base = (organizationId: string) => `/v1/organizations/${organizationId}/roles`;

/** Every role of the organization (the API doesn't page this list). */
export function listRoles(organizationId: string, signal?: AbortSignal, params?: { roleTemplateId?: string }): Promise<Role[]> {
  const qs = params?.roleTemplateId ? `?role_template_id=${encodeURIComponent(params.roleTemplateId)}` : "";
  return apiRequest<Role[]>(`${base(organizationId)}${qs}`, { signal });
}

export function getRole(organizationId: string, roleId: string, signal?: AbortSignal): Promise<Role> {
  return apiRequest<Role>(`${base(organizationId)}/${roleId}`, { signal });
}

export function createRole(organizationId: string, input: RoleCreateInput): Promise<Role> {
  return apiRequest<Role>(base(organizationId), { method: "POST", body: input });
}

/** `grants` replaces the whole set: send every module to keep. `description: null` clears it. */
export function updateRole(organizationId: string, roleId: string, changes: RoleUpdateInput): Promise<Role> {
  return apiRequest<Role>(`${base(organizationId)}/${roleId}`, { method: "PATCH", body: changes });
}

export function changeRoleStatus(organizationId: string, roleId: string, isActive: boolean): Promise<Role> {
  return apiRequest<Role>(`${base(organizationId)}/${roleId}/status`, { method: "PATCH", body: { is_active: isActive } });
}

export function listGrantableModules(organizationId: string, signal?: AbortSignal): Promise<GrantableModule[]> {
  return apiRequest<GrantableModule[]>(`/v1/organizations/${organizationId}/grantable-modules`, { signal });
}
