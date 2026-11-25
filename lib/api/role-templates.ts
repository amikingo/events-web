/**
 * Role templates (Phase 2d):
 *
 *   GET   /v1/role-templates                            all templates (Super Admin)
 *   GET   /v1/role-templates/:templateId                one template (Super Admin)
 *   POST  /v1/role-templates                            create template (Super Admin)
 *   PATCH /v1/role-templates/:templateId                update template (Super Admin)
 *   PATCH /v1/role-templates/:templateId/status         switch off or on (Super Admin)
 *   GET   /v1/organizations/:organizationId/role-templates  active templates (Roles > create)
 */
import { apiRequest } from "@/lib/api-client";
import type { RoleGrantInput } from "@/lib/api/roles";

export interface RoleTemplateGrant {
  module_code: string;
  module_name: string;
  view: boolean;
  create: boolean;
  update: boolean;
  export: boolean;
}

export interface RoleTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  for_new_organizations: boolean;
  locked: boolean;
  grants: RoleTemplateGrant[];
}

export interface RoleTemplateCreateInput {
  code: string;
  name: string;
  description?: string | null;
  for_new_organizations?: boolean;
  grants: RoleGrantInput[];
}

export interface RoleTemplateUpdateInput {
  name?: string;
  description?: string | null;
  for_new_organizations?: boolean;
  grants?: RoleGrantInput[];
}

const BASE = "/v1/role-templates";

export function listRoleTemplates(signal?: AbortSignal): Promise<RoleTemplate[]> {
  return apiRequest<RoleTemplate[]>(BASE, { signal });
}

export function getRoleTemplate(templateId: string, signal?: AbortSignal): Promise<RoleTemplate> {
  return apiRequest<RoleTemplate>(`${BASE}/${templateId}`, { signal });
}

export function createRoleTemplate(input: RoleTemplateCreateInput): Promise<RoleTemplate> {
  return apiRequest<RoleTemplate>(BASE, { method: "POST", body: input });
}

export function updateRoleTemplate(templateId: string, changes: RoleTemplateUpdateInput): Promise<RoleTemplate> {
  return apiRequest<RoleTemplate>(`${BASE}/${templateId}`, { method: "PATCH", body: changes });
}

export function changeRoleTemplateStatus(templateId: string, isActive: boolean): Promise<RoleTemplate> {
  return apiRequest<RoleTemplate>(`${BASE}/${templateId}/status`, { method: "PATCH", body: { is_active: isActive } });
}

export function listOrganizationRoleTemplates(organizationId: string, signal?: AbortSignal): Promise<RoleTemplate[]> {
  return apiRequest<RoleTemplate[]>(`/v1/organizations/${organizationId}/role-templates`, { signal });
}
